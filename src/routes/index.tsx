import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, Building2, HandHeart, Target, UserPlus, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { BarsChart, DonutChart } from "@/components/dash/charts";
import { Select } from "@/components/dash/activity-dashboard";
import { CountUp, Hero, Kpi, ProgressBar, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { FieldPhotos } from "@/components/dash/field-photos";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الرئيسية — صناع الحياة سوهاج | نظام المتابعة" },
      { name: "description", content: "نظرة شاملة على أنشطة وإدارات ومتطوعي ومستهدفات صناع الحياة في محافظة سوهاج." },
      { property: "og:title", content: "صناع الحياة سوهاج — نظام المتابعة" },
      { property: "og:description", content: "رؤية واحدة، كيان واحد — لوحة متابعة الأنشطة والمتطوعين والمستهدفات." },
    ],
  }),
  component: Home,
});

function Home() {
  const ds = useDataset();
  const [center, setCenter] = useState("");
  const acts = useMemo(() => ds.activities.filter((a) => !center || a.center === center), [ds, center]);
  const centers = [...new Set(ds.activities.map((a) => a.center))].sort();
  const depts = useMemo(() => {
    const m = new Map<string, { n: number; ben: number; vol: number; files: Set<string> }>();
    acts.forEach((a) => {
      const c = m.get(a.department) ?? { n: 0, ben: 0, vol: 0, files: new Set() };
      c.n++;
      c.ben += a.beneficiaries;
      c.vol += a.volunteers;
      c.files.add(a.file);
      m.set(a.department, c);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [acts]);

  const plan = ds.plans.at(-1);
  const planWithTargets = plan?.items.filter((i) => i.targetToDate) ?? [];
  const planPct = planWithTargets.length
    ? Math.round(planWithTargets.reduce((s, i) => s + Math.min(100, i.pct ?? 0), 0) / planWithTargets.length)
    : null;
  const stage = (s: string) => ds.volunteers.stages.find((x) => x.stage === s)?.count ?? 0;
  const exp = ds.expenses[0];

  return (
    <div>
      <Hero label="الرئيسية" title="صناع الحياة سوهاج — نظام المتابعة" subtitle="رؤية واحدة، كيان واحد. بيانات حيّة من Google Sheets لكل الإدارات والملفات والمراكز.">
        <div className="max-w-xs rounded-xl bg-card p-3 text-foreground">
          <Select label="تصفية حسب المركز" value={center} onChange={setCenter} options={centers} />
        </div>
      </Hero>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          <Kpi key="a" label="تقارير الأنشطة" value={<CountUp n={acts.length} />} icon={<Activity className="size-5" />} />,
          <Kpi key="b" label="المستفيدين" value={<CountUp n={acts.reduce((s, a) => s + a.beneficiaries, 0)} />} icon={<HandHeart className="size-5" />} tone="accent" />,
          <Kpi key="c" label="فرص تطوعية (تقارير)" value={<CountUp n={acts.reduce((s, a) => s + a.volunteers, 0)} />} icon={<Users className="size-5" />} tone="success" />,
          <Kpi key="d" label="الإدارات النشطة" value={<CountUp n={depts.length} />} icon={<Building2 className="size-5" />} tone="navy" />,
          <Kpi key="e" label="متطوعين مسجلين (جذب)" value={<CountUp n={stage("جذب")} />} hint={`استقبال ${fmt(stage("استقبال"))} · تسكين ${fmt(stage("تسكين"))}`} icon={<UserPlus className="size-5" />} />,
          <Kpi key="f" label="متوسط تحقيق الخطة" value={planPct === null ? "—" : `${fmt(planPct)}٪`} hint={plan?.title} icon={<Target className="size-5" />} tone="accent" />,
          <Kpi key="g" label="العهد المستلمة" value={<CountUp n={exp?.received ?? 0} />} hint={`مصروف ${fmt(exp?.spent)} · متبقي ${fmt(exp?.remaining)}`} icon={<Wallet className="size-5" />} tone="success" />,
          <Kpi key="h" label="ملاحظات جودة البيانات" value={<CountUp n={ds.quality.reduce((s, q) => s + q.count, 0)} />} icon={<AlertTriangle className="size-5" />} tone="navy" />,
        ].map((el, i) => (
          <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>{el}</div>
        ))}
      </div>

      <FieldPhotos />

      <SectionTitle>الإدارات</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {depts.map(([name, d], i) => (
          <Link key={name} to="/departments/$dept" params={{ dept: name }} className="card-interactive group block animate-fade-up p-5" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-navy">{name}</h3>
              <Building2 className="size-5 text-accent" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-2xl font-extrabold">{fmt(d.n)}</div><div className="text-xs text-muted-foreground">نشاط</div></div>
              <div><div className="text-2xl font-extrabold">{fmt(d.ben)}</div><div className="text-xs text-muted-foreground">مستفيد</div></div>
              <div><div className="text-2xl font-extrabold">{fmt(d.vol)}</div><div className="text-xs text-muted-foreground">متطوع</div></div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{d.files.size} ملف · اضغط للتفاصيل</div>
          </Link>
        ))}
      </div>

      <SectionTitle>نظرة عامة</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart title="الأنشطة حسب الإدارة" data={depts.map(([name, d]) => ({ name, value: d.n }))} />
        <BarsChart title="مسار المتطوعين" data={ds.volunteers.stages.map((s) => ({ name: s.stage, value: s.count }))} />
      </div>

      {plan && (
        <>
          <SectionTitle action={<Link to="/plan" className="text-sm font-bold text-primary">عرض الخطة كاملة ←</Link>}>أبرز مستهدفات {plan.title}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {planWithTargets.slice(0, 6).map((i, idx) => (
              <div key={i.goal + i.item} className="card-interactive animate-fade-up space-y-2 p-4" style={{ animationDelay: `${idx * 70}ms` }}>
                <div className="text-xs text-muted-foreground">{i.goal}</div>
                <div className="text-sm font-bold">{i.item}</div>
                <ProgressBar value={i.pct} />
                <div className="text-xs text-muted-foreground">{fmt(i.achieved)} من {fmt(i.targetToDate)} ({fmt(i.pct)}٪)</div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>جودة البيانات</SectionTitle>
      <div className="card-surface divide-y">
        {ds.quality.map((q) => (
          <div key={q.label} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{q.label}</span>
            <span className={q.count ? "font-bold text-destructive" : "font-bold text-success"}>{fmt(q.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
