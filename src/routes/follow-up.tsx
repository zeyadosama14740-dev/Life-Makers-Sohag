import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpLeft, CheckCircle2, Database, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useDataset } from "@/hooks/use-dataset";
import { CountUp, Kpi, SectionTitle } from "@/components/dash/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { normalizeArabic } from "@/lib/sheets/normalize";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/follow-up")({
  head: () => ({ meta: [
    { title: "مركز المتابعة — صناع الحياة سوهاج" },
    { name: "description", content: "حالة مصادر البيانات وملاحظات الجودة والبحث في أنشطة صناع الحياة سوهاج." },
    { property: "og:title", content: "مركز المتابعة — صناع الحياة سوهاج" },
    { property: "og:description", content: "متابعة المصادر والأنشطة وملاحظات جودة البيانات في مكان واحد." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FollowUp,
});

function FollowUp() {
  const ds = useDataset();
  const [search, setSearch] = useState("");
  const [center, setCenter] = useState("");
  const issues = ds.quality.filter(q => q.count > 0);
  const failed = ds.sources.filter(s => !s.ok);
  const centers = [...new Set(ds.activities.map(a => a.center).filter(Boolean))].sort((a,b) => a.localeCompare(b,"ar"));
  const activities = useMemo(() => ds.activities.filter(a =>
    (!center || a.center === center) && normalizeArabic([a.name, a.department, a.file, a.center, a.place].join(" ")).includes(normalizeArabic(search))
  ).sort((a,b) => (b.date ?? "").localeCompare(a.date ?? "")), [ds.activities, search, center]);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <div><p className="mb-2 text-sm font-bold text-primary">صناع الحياة سوهاج</p><h1 className="text-3xl font-extrabold">مركز المتابعة</h1></div>
      <Button asChild variant="outline"><Link to="/sources"><Database />مصادر البيانات<ArrowUpLeft /></Link></Button>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="مصادر تعمل" value={<CountUp n={ds.sources.filter(s => s.ok).length} />} icon={<Database className="size-5" />} />
      <Kpi label="مصادر تحتاج مراجعة" value={failed.length} icon={<ShieldCheck className="size-5" />} tone="accent" />
      <Kpi label="أنشطة مطابقة" value={activities.length} icon={<Activity className="size-5" />} />
      <Kpi label="ملاحظات جودة" value={issues.reduce((sum,q) => sum + q.count,0)} icon={<ShieldCheck className="size-5" />} tone="accent" />
    </div>
    <section>
      <SectionTitle>الوصول السريع</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ to: "/volunteers", label: "ملفات المتطوعين", icon: Users }, { to: "/quality", label: "مراجعة جودة البيانات", icon: ShieldCheck }, { to: "/gallery", label: "صور الأنشطة", icon: Activity }].map(item =>
          <Button key={item.to} variant="outline" asChild className="h-14 justify-between"><Link to={item.to}><span className="flex items-center gap-2"><item.icon />{item.label}</span><ArrowUpLeft /></Link></Button>
        )}
      </div>
    </section>
    <section>
      <SectionTitle action={<Button asChild variant="link" size="sm"><Link to="/quality">التفاصيل<ArrowUpLeft /></Link></Button>}>يحتاج المتابعة</SectionTitle>
      <div className="divide-y border-y">
        {failed.map(s => <Link key={s.id} to="/sources" className="flex items-center justify-between gap-3 py-4 text-sm hover:bg-muted"><span className="min-w-0 break-words"><span className="font-bold">{s.label}</span><span className="mt-1 block text-muted-foreground">تعذر قراءة المصدر</span></span><ArrowUpLeft className="size-4 shrink-0 text-destructive" /></Link>)}
        {issues.map(q => <Link key={q.label} to="/quality" className="flex items-center justify-between gap-3 py-4 text-sm hover:bg-muted"><span>{q.label}</span><span className="shrink-0 font-bold text-destructive">{fmt(q.count)}</span></Link>)}
        {!failed.length && !issues.length && <p className="flex items-center gap-2 py-5 text-sm"><CheckCircle2 className="size-5 text-success" />لا توجد ملاحظات في البيانات الحالية</p>}
      </div>
    </section>
    <section>
      <SectionTitle>سجل الأنشطة</SectionTitle>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-64"><Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="البحث في الأنشطة" placeholder="ابحث عن نشاط أو إدارة أو مكان…" value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div>
        <select aria-label="المركز" value={center} onChange={e => setCenter(e.target.value)} className="h-9 max-w-full rounded-md border bg-card px-3 text-sm"><option value="">كل المراكز</option>{centers.map(c => <option key={c}>{c}</option>)}</select>
        {(search || center) && <Button variant="ghost" onClick={() => { setSearch(""); setCenter(""); }}>مسح التصفية</Button>}
      </div>
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">{fmt(activities.length)} نشاط</p>
      <div className="grid gap-3 md:grid-cols-2">
        {activities.map(a => <Link key={a.id} to="/files/$dept/$file" params={{ dept: a.department, file: a.file }} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{a.department}</span><span dir="ltr">{a.date?.slice(0,10) || "بدون تاريخ"}</span></div>
          <h3 className="break-words font-bold group-hover:text-primary">{a.name || a.file}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{a.center || "المركز غير محدد"} · {a.file}</p>
          <div className="mt-4 flex items-center justify-between text-xs"><span>{fmt(a.beneficiaries)} مستفيد · {fmt(a.volunteers)} فرصة تطوعية</span><ArrowUpLeft className="size-4 text-primary" /></div>
        </Link>)}
      </div>
      {!activities.length && <p className="py-8 text-center text-muted-foreground">لا توجد أنشطة مطابقة</p>}
    </section>
  </div>;
}