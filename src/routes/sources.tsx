import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, RefreshCw, Rows3, Search, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizeArabic } from "@/lib/sheets/normalize";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Hero, Kpi, SectionTitle } from "@/components/dash/ui";
import { useDataset, useRefresh } from "@/hooks/use-dataset";
import { supabase } from "@/integrations/supabase/client";
import type { TabKind } from "@/lib/sheets/types";
import { useAccess } from "@/hooks/use-access";
import { SourceWizard } from "@/components/sources/source-wizard";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "مصادر البيانات — صناع الحياة سوهاج" },
      { name: "description", content: "إدارة ملفات Google Sheets المتصلة بنظام المتابعة." },
      { property: "og:title", content: "مصادر البيانات — صناع الحياة سوهاج" },
      { property: "og:description", content: "أضف ملفات الأنشطة والمتطوعين والماستر بلان لكل سنة." },
    ],
  }),
  component: SourcesPage,
});

const CATS = { activities: "أنشطة ومتطوعين", volunteers: "متطوعين", master_plan: "ماستر بلان / مستهدفات", other: "أخرى" } as const;
const KIND: Record<TabKind, string> = {
  activities: "تقارير أنشطة",
  volunteer_stage: "مرحلة متطوعين",
  images: "صور",
  master_plan: "ماستر بلان",
  expenses: "مصروفات",
  center_plan: "خطة المراكز",
  partnerships: "شراكات",
  unused: "غير مستخدم",
};

export function SourcesPage() {
  const ds = useDataset();
  const qc = useQueryClient();
  const { refresh } = useRefresh();
  const me = useAccess();
  const list = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_sources").select("id,label,url,spreadsheet_id,category,year,enabled,source_type,config,updated_at").order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const admin = me.data?.isAdmin;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [year, setYear] = useState("");
  const years = [...new Set((list.data ?? []).map((s) => String(s.year)))];
  const shown = (list.data ?? []).filter((s) => {
    const st = ds.sources.find((x) => x.id === s.id);
    if (q && !normalizeArabic(s.label).includes(normalizeArabic(q))) return false;
    if (year && String(s.year) !== year) return false;
    if (filter === "ok") return s.enabled && !!st?.ok;
    if (filter === "error") return s.enabled && !!st && !st.ok;
    if (filter === "off") return !s.enabled;
    return true;
  });

  const after = async () => {
    await qc.invalidateQueries({ queryKey: ["sources"] });
    await refresh();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("data_sources").update({ enabled }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    after();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف هذا المصدر من النظام؟ (لن يتم تعديل ملف Google Sheets نفسه)")) return;
    const { error } = await supabase.from("data_sources").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    after();
  };

  return (
    <div>
      <Hero label="الإعدادات" title="مصادر البيانات" subtitle="كل ملف Google Sheets متصل بالنظام. أضف ملف خطة لكل سنة جديدة دون أي تعديل برمجي." back={{ to: "/", text: "الرئيسية" }} />
      {admin && <div className="mt-6"><SourceWizard onSaved={after} /></div>}

      {!me.data ? (
        <div className="card-surface mt-6 flex items-center justify-between p-4 text-sm">
          <span>لإضافة أو تعديل المصادر يجب تسجيل الدخول كمسؤول.</span>
          <Button asChild size="sm"><Link to="/auth">تسجيل الدخول</Link></Button>
        </div>
      ) : !admin ? (
        <div className="card-surface mt-6 flex items-center justify-between p-4 text-sm">
          <span>حسابك ({me.data.email}) لا يملك صلاحية المسؤول.</span>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المصادر المسجلة" value={list.data?.length ?? 0} icon={<Database className="size-5" />} />
        <Kpi label="تعمل بنجاح" value={ds.sources.filter((x) => x.ok).length} tone="success" icon={<CheckCircle2 className="size-5" />} />
        <Kpi label="بها أخطاء" value={ds.sources.filter((x) => !x.ok).length} tone="accent" icon={<XCircle className="size-5" />} />
        <Kpi label="إجمالي الصفوف المقروءة" value={ds.sources.reduce((a, x) => a + x.tabs.reduce((b, t) => b + t.rows, 0), 0)} tone="navy" icon={<Rows3 className="size-5" />} />
      </div>
      <SectionTitle action={<Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="size-4" /> فحص كل المصادر الآن</Button>}>المصادر</SectionTitle>
      <div className="card-surface mb-3 flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المصدر…" className="pr-9" /></div>
        {[["all", "الكل"], ["ok", "يعمل"], ["error", "به خطأ"], ["off", "معطّل"]].map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "ghost"} onClick={() => setFilter(k!)}>{l}</Button>
        ))}
        {years.length > 1 && <select className="h-9 rounded-md border bg-card px-2 text-sm" value={year} onChange={(e) => setYear(e.target.value)}><option value="">كل السنوات</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>}
      </div>
      <div className="space-y-3">
        {shown.length === 0 && list.data && <p className="card-surface p-6 text-center text-sm text-muted-foreground">لا توجد مصادر مطابقة.</p>}
        {shown.map((s) => {
          const st = ds.sources.find((x) => x.id === s.id);
          return (
            <div key={s.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    {st ? (st.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />) : null}
                    {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.source_type === "google_sheets" ? "Google Sheets — مباشر" : "ملف مستورد — نسخة ثابتة"} · {s.year} · {CATS[s.category as keyof typeof CATS] ?? s.category} · آخر تعديل للإعداد {new Date(s.updated_at).toLocaleDateString("ar-EG")} · {st && `${st.tabs.filter((t) => t.kind !== "unused").length}/${st.tabs.length} تبويب مستخدم`} · {s.source_type === "google_sheets" && <a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline">فتح الملف</a>}</div>
                </div>
                {admin && (
                  <div className="flex items-center gap-3">
                    <SourceWizard sourceId={s.id} onSaved={after} />
                    <label className="flex items-center gap-2 text-xs">مفعّل <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.id, v)} /></label>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="حذف"><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
              {st?.error && <p className="mt-2 text-xs text-destructive">خطأ: {st.error}</p>}
              {st && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {st.tabs.map((t) => (
                    <span key={t.title} className={t.kind === "unused" ? "rounded-full border px-2 py-0.5 text-xs text-muted-foreground" : "rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"}>
                      {t.title} · {KIND[t.kind]} · {t.rows} صف
                    </span>
                  ))}
                </div>
              )}
              {!s.enabled && <p className="mt-2 text-xs text-muted-foreground">معطّل — لا يدخل في الحسابات.</p>}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">النظام يقرأ الملفات فقط ولا يعدّل أي بيانات في Google Sheets.</p>
    </div>
  );
}
