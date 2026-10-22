import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, Hero } from "@/components/dash/ui";
import { useAccess } from "@/hooks/use-access";
import { useDataset } from "@/hooks/use-dataset";
import { listUsers, setUserAccess, type ManagedUser } from "@/lib/access.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "المستخدمين والصلاحيات — صناع الحياة سوهاج" },
      { name: "description", content: "إدارة صلاحيات المسؤولين ومديري المراكز." },
      { property: "og:title", content: "المستخدمين والصلاحيات" },
      { property: "og:description", content: "تحديد من يرى بيانات أي مركز." },
    ],
  }),
  component: UsersPage,
});

const ROLE_LABEL = { admin: "مسؤول رئيسي", center_manager: "مدير مركز", viewer: "مشاهد" } as const;

function UserRow({ u, centers, selfId }: { u: ManagedUser; centers: string[]; selfId: string }) {
  const qc = useQueryClient();
  const [role, setRole] = useState(u.role);
  const [picked, setPicked] = useState<string[]>(u.centers);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await setUserAccess({ data: { userId: u.id, role, centers: picked } });
      toast.success("تم حفظ الصلاحيات");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card-surface space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold">{u.email}{u.id === selfId && " (أنت)"}</div>
          <div className="text-xs text-muted-foreground">آخر دخول: {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString("ar-EG") : "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value as ManagedUser["role"])} className="h-9 rounded-md border bg-card px-2 text-sm" disabled={u.id === selfId}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button size="sm" onClick={save} disabled={busy}>حفظ</Button>
        </div>
      </div>
      {role === "center_manager" && (
        <div className="flex flex-wrap gap-2">
          {centers.map((c) => {
            const on = picked.includes(c);
            return (
              <button key={c} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== c) : [...picked, c])}
                className={on ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground" : "rounded-full border px-3 py-1 text-xs"}>
                {c}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UsersPage() {
  const me = useAccess();
  const ds = useDataset();
  const users = useQuery({ queryKey: ["users"], queryFn: () => listUsers(), enabled: !!me.data?.isAdmin });
  const centers = [...new Set([...ds.volunteers.byCenter.map((c) => c.name), ...ds.centerPlans.map((c) => c.center), ...ds.activities.map((a) => a.center)])]
    .filter((c) => c && c !== "غير محدد")
    .sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <div>
      <Hero label="الإعدادات" title="المستخدمين والصلاحيات" subtitle="المسؤول الرئيسي يرى كل شيء. مدير المركز يرى فقط ملفات المتطوعين وبيانات المراكز المخصصة له." back={{ to: "/", text: "الرئيسية" }} />
      <div className="mt-6 space-y-3">
        {me.isLoading ? null : !me.data ? (
          <Empty>يجب <Link to="/auth" className="text-primary underline">تسجيل الدخول</Link> أولاً.</Empty>
        ) : !me.data.isAdmin ? (
          <Empty>هذه الصفحة للمسؤول الرئيسي فقط.</Empty>
        ) : users.isLoading ? (
          <Empty>جاري التحميل…</Empty>
        ) : users.error ? (
          <Empty>{(users.error as Error).message}</Empty>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">لإضافة مستخدم جديد: اطلب منه إنشاء حساب من صفحة تسجيل الدخول، ثم حدد صلاحيته هنا.</p>
            {users.data?.map((u) => <UserRow key={u.id} u={u} centers={centers} selfId={me.data!.userId} />)}
          </>
        )}
      </div>
    </div>
  );
}
