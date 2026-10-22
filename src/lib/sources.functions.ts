import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spreadsheetIdFromUrl } from "./sheets/normalize";
import { sourceConfigSchema } from "./sheets/source-config";

const input = z.object({ url: z.string().max(2000) });
export const previewSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("المعاينة للمسؤول الرئيسي فقط");
    const id = spreadsheetIdFromUrl(data.url);
    if (!id) throw new Error("رابط Google Sheets أو المعرّف غير صالح");
    const { fetchSpreadsheet } = await import("./sheets/source-fetch.server");
    return { spreadsheetId: id, tabs: await fetchSpreadsheet(id) };
  });

const gridSchema = z.array(z.array(z.string().max(10000)).max(500)).max(50000);
const configSchema = sourceConfigSchema;
const saveSchema = z.object({ id: z.string().uuid().optional(), label: z.string().min(1).max(200), url: z.string().max(2000), year: z.number().int().min(2020).max(2100), category: z.enum(["activities","volunteers","master_plan","other"]), sourceType: z.enum(["google_sheets","csv","excel"]), config: configSchema, tabs: z.array(z.object({ title: z.string().max(200), grid: gridSchema })).max(30).optional() });
export const saveSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("الحفظ للمسؤول الرئيسي فقط");
    const spreadsheetId = data.sourceType === "google_sheets" ? spreadsheetIdFromUrl(data.url) : `import-${data.id ?? crypto.randomUUID()}`;
    if (!spreadsheetId) throw new Error("المعرّف غير صالح");
    if (data.sourceType !== "google_sheets" && !data.tabs?.length) throw new Error("الملف المستورد فارغ");
    if (JSON.stringify(data.tabs ?? []).length > 8_000_000) throw new Error("الملف أكبر من الحد المسموح للاستيراد (8 ميجابايت)");
    const { data: existing } = await context.supabase.from("data_sources").select("id").eq("spreadsheet_id", spreadsheetId);
    if (existing?.some((s) => s.id !== data.id)) throw new Error("هذا الملف مرتبط بالفعل");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = data.id ? await supabaseAdmin.from("data_sources").select("config,label,enabled").eq("id", data.id).single() : null;
    const payload = { label: data.label, url: data.url, spreadsheet_id: spreadsheetId, year: data.year, category: data.category, source_type: data.sourceType, config: data.config as import("@/integrations/supabase/types").Json, import_tabs: data.sourceType === "google_sheets" ? null : data.tabs as import("@/integrations/supabase/types").Json, updated_at: new Date().toISOString() };
    const result = data.id ? await supabaseAdmin.from("data_sources").update(payload).eq("id", data.id).select("id").single() : await supabaseAdmin.from("data_sources").insert(payload).select("id").single();
    if (result.error) throw result.error;
    const audit = await supabaseAdmin.from("audit_events").insert({ actor_id: context.userId, action: data.id ? "source_mapping_update" : "source_link", entity_id: result.data.id, source_id: result.data.id, previous: before?.data ?? null, next: { label: data.label, config: payload.config } });
    if (audit.error) throw new Error("تم حفظ المصدر لكن تعذر تسجيل المراجعة؛ يرجى إبلاغ المسؤول");
    return result.data;
  });

export const getSourceForEdit = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
 .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
 .handler(async ({ data, context }) => {
   const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
   if (!admin) throw new Error("للمسؤول الرئيسي فقط");
   const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
   const result = await supabaseAdmin.from("data_sources").select("*").eq("id", data.id).single();
   if (result.error) throw result.error;
   return result.data;
 });