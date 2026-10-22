import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VolunteerProfile, VolunteerSummary } from "./sheets/volunteers";

export interface MyAccess {
  userId: string;
  email: string;
  isAdmin: boolean;
  isCenterManager: boolean;
  centers: string[];
}

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string; claims: { email?: string } };

async function readAccess(ctx: Ctx): Promise<MyAccess> {
  const [{ data: roles }, { data: centers }] = await Promise.all([
    ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId),
    ctx.supabase.from("user_center_access").select("center").eq("user_id", ctx.userId),
  ]);
  const r = (roles ?? []).map((x: { role: string }) => x.role);
  return {
    userId: ctx.userId,
    email: ctx.claims.email ?? "",
    isAdmin: r.includes("admin"),
    isCenterManager: r.includes("center_manager"),
    centers: (centers ?? []).map((x: { center: string }) => x.center),
  };
}

async function loadProfiles() {
  const { getRawSources } = await import("./sheets/fetch.server");
  const { buildDataset } = await import("./sheets/build");
  const { buildVolunteerProfiles, STAGES } = await import("./sheets/volunteers");
  const { normalizeArabic } = await import("./sheets/normalize");
  const { mappedGrid } = await import("./sheets/source-config");
  const raw = await getRawSources();
  const grids = raw.flatMap((s) =>
    s.tabs
      .map((t) => {
        const config = s.config?.tabs?.[t.title];
        if (config && !["auto", "volunteers", "placement"].includes(config.kind)) return { stage: undefined, grid: [], sourceId: s.id };
        const title = config?.stage ?? (config?.kind === "volunteers" ? "جذب" : config?.kind === "placement" ? "تسكين" : t.title);
        return { stage: STAGES.find((x) => normalizeArabic(x) === normalizeArabic(title)), grid: mappedGrid(t.grid, config), sourceId: s.id };
      })
      .filter((x): x is { stage: (typeof STAGES)[number]; grid: string[][]; sourceId: string } => !!x.stage),
  );
  return { profiles: buildVolunteerProfiles(grids), activities: buildDataset(raw).activities };
}

export const getMyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readAccess(context as unknown as Ctx));

export const listVolunteers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ access: MyAccess; rows: VolunteerSummary[] }> => {
    const access = await readAccess(context as unknown as Ctx);
    if (!access.isAdmin && !access.isCenterManager) throw new Error("ليس لديك صلاحية عرض بيانات المتطوعين");
    const { canSeeCenter, toSummary } = await import("./sheets/volunteers");
    const { profiles } = await loadProfiles();
    const scoped = profiles.filter((p) => canSeeCenter(access, p.center));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Stable UUIDs persist independently of changes to name and telephone.
    for (let i = 0; i < scoped.length; i += 300) {
      const batch = scoped.slice(i, i + 300);
      const result = await supabaseAdmin.from("volunteer_identities").upsert(batch.map((p) => ({ identity_key: p.key, center: p.center })), { onConflict: "identity_key", ignoreDuplicates: true });
      if (result.error) throw result.error;
      const existing = await context.supabase.from("volunteer_identities").select("id,identity_key").in("identity_key", batch.map(p => p.key));
      if (existing.error) throw existing.error;
      const ids = new Map(existing.data.map((p) => [p.identity_key, p.id]));
      batch.forEach((p) => { p.volunteerId = ids.get(p.key); });
    }
    return { access, rows: scoped.map(toSummary) };
  });

export const getVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => {
    if (!input?.key || input.key.length > 200) throw new Error("طلب غير صالح");
    return input;
  })
  .handler(async ({ context, data }): Promise<VolunteerProfile> => {
    const access = await readAccess(context as unknown as Ctx);
    if (!access.isAdmin && !access.isCenterManager) throw new Error("ليس لديك صلاحية");
    const { canSeeCenter } = await import("./sheets/volunteers");
    const { profiles } = await loadProfiles();
    const p = profiles.find((x) => x.key === data.key);
    if (!p || !canSeeCenter(access, p.center)) throw new Error("المتطوع غير موجود أو خارج صلاحياتك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identity = await supabaseAdmin.from("volunteer_identities").select("id").eq("identity_key", p.key).maybeSingle();
    return { ...p, volunteerId: identity.data?.id, activities: [] };
  });

// ---------- Main Admin: manage users ----------

async function requireAdmin(ctx: Ctx) {
  const a = await readAccess(ctx);
  if (!a.isAdmin) throw new Error("هذه الصفحة للمسؤول الرئيسي فقط");
  return a;
}

export interface ManagedUser {
  id: string;
  email: string;
  role: "admin" | "center_manager" | "viewer";
  centers: string[];
  lastSignIn: string | null;
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await requireAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users, error }, { data: roles }, { data: centers }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("user_center_access").select("user_id,center"),
    ]);
    if (error) throw error;
    return users.users.map((u) => {
      const r = (roles ?? []).filter((x) => x.user_id === u.id).map((x) => x.role);
      return {
        id: u.id,
        email: u.email ?? "",
        role: r.includes("admin") ? "admin" : r.includes("center_manager") ? "center_manager" : "viewer",
        centers: (centers ?? []).filter((x) => x.user_id === u.id).map((x) => x.center),
        lastSignIn: u.last_sign_in_at ?? null,
      };
    });
  });

export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: ManagedUser["role"]; centers: string[] }) => {
    if (!/^[0-9a-f-]{36}$/.test(input.userId)) throw new Error("مستخدم غير صالح");
    if (!["admin", "center_manager", "viewer"].includes(input.role)) throw new Error("صلاحية غير صالحة");
    const centers = [...new Set((input.centers ?? []).map((c) => String(c).trim()).filter(Boolean))].slice(0, 50);
    return { ...input, centers };
  })
  .handler(async ({ context, data }) => {
    const me = await requireAdmin(context as unknown as Ctx);
    if (data.userId === me.userId && data.role !== "admin") throw new Error("لا يمكنك إزالة صلاحية المسؤول عن نفسك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: e1 } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (e1) throw e1;
    await supabaseAdmin.from("user_center_access").delete().eq("user_id", data.userId);
    if (data.role === "center_manager" && data.centers.length) {
      const { error: e2 } = await supabaseAdmin
        .from("user_center_access")
        .insert(data.centers.map((center) => ({ user_id: data.userId, center })));
      if (e2) throw e2;
    }
    return { ok: true };
  });
