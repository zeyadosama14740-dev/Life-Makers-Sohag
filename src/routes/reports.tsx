import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/dash/activity-dashboard";
import { BarsChart } from "@/components/dash/charts";
import { DataTable } from "@/components/dash/data-table";
import { Empty, Hero, Kpi, ProgressBar, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import type { ActivityRecord } from "@/lib/sheets/types";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "التقارير والأثر — صناع الحياة سوهاج" },
      { name: "description", content: "تقارير جاهزة وتحليل الأثر: الاتجاه الشهري، ترتيب الإدارات والمراكز، وأبرز الأنشطة من بيانات صناع الحياة سوهاج." },
      { property: "og:title", content: "التقارير والأثر — صناع الحياة سوهاج" },
      { property: "og:description", content: "ملخصات وجداول قابلة للتصدير لأداء الإدارات والمراكز والأنشطة." },
    ],
  }),
  component: ReportsPage,
});

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function ReportsPage() {
  const ds = useDataset();
  const years = [...new Set(ds.activities.map((a) => (a.date ? Number(a.date.slice(0, 4)) : null)).filter((y): y is number => !!y))].sort();
  const [year, setYear] = useState(0);
  const [center, setCenter] = useState("");
  const centers = [...new Set(ds.activities.map((a) => a.center).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));

  const acts = useMemo(
    () =>
      ds.activities.filter((a) => {
        if (center && a.center !== center) return false;
        if (year && (!a.date || Number(a.date.slice(0, 4)) !== year)) return false;
        return true;
      }),
    [ds, center, year],
  );

  const totalBen = acts.reduce((s, a) => s + a.beneficiaries, 0);
  const totalVol = acts.reduce((s, a) => s + a.volunteers, 0);

  const plan = ds.plans.find((p) => !year || p.year === year) ?? ds.plans.at(-1);
  const planWithTargets = plan?.items.filter((i) => i.targetToDate) ?? [];
  const planPct = planWithTargets.length
    ? Math.round(planWithTargets.reduce((s, i) => s + Math.min(100, i.pct ?? 0), 0) / planWithTargets.length)
    : null;

  const monthly = useMemo(() => {
    const m = new Map<string, { order: number; n: number; ben: number }>();
    acts.forEach((a) => {
      if (!a.date) return;
      const idx = Number(a.date.slice(5, 7)) - 1;
      const y = a.date.slice(0, 4);
      const key = `${MONTHS_AR[idx] ?? "—"} ${y}`;
      const order = Number(y) * 12 + idx;
      const row = m.get(key) ?? { order, n: 0, ben: 0 };
      row.n++;
      row.ben += a.beneficiaries;
      m.set(key, row);
    });
    return [...m.entries()].sort((a, b) => a[1].order - b[1].order).map(([name, v]) => ({ name, ...v }));
  }, [acts]);

  const depts = useMemo(() => {
    const m = new Map<string, { n: number; ben: number; vol: number; files: Set<string> }>();
    acts.forEach((a) => {
      const row = m.get(a.department) ?? { n: 0, ben: 0, vol: 0, files: new Set<string>() };
      row.n++;
      row.ben += a.beneficiaries;
      row.vol += a.volunteers;
      row.files.add(a.file);
      m.set(a.department, row);
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name, n: v.n, ben: v.ben, vol: v.vol, files: v.files.size, share: totalBen ? Math.round((v.ben / totalBen) * 100) : 0 }))
      .sort((a, b) => b.ben - a.ben);
  }, [acts, totalBen]);

  const centerPlanPct = useMemo(() => {
    const m = new Map<string, number[]>();
    ds.centerPlans
      .filter((cp) => !year || cp.year === year)
      .forEach((cp) => {
        const list = m.get(cp.center) ?? [];
        cp.items.forEach((i) => {
          if (i.pct !== null) list.push(Math.min(100, i.pct));
        });
        m.set(cp.center, list);
      });
    const out = new Map<string, number | null>();
    for (const [name, list] of m) out.set(name, list.length ? Math.round(list.reduce((s, x) => s + x, 0) / list.length) : null);
    return out;
  }, [ds.centerPlans, year]);

  const centersRanked = useMemo(() => {
    const m = new Map<string, { n: number; ben: number; vol: number }>();
    acts.forEach((a) => {
      if (!a.center) return;
      const row = m.get(a.center) ?? { n: 0, ben: 0, vol: 0 };
      row.n++;
      row.ben += a.beneficiaries;
      row.vol += a.volunteers;
      m.set(a.center, row);
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name, ...v, pct: centerPlanPct.get(name) ?? null }))
      .sort((a, b) => b.ben - a.ben);
  }, [acts, centerPlanPct]);

  const topActivities = useMemo(() => [...acts].sort((a, b) => b.beneficiaries - a.beneficiaries).slice(0, 10), [acts]);

  const summaryText = useMemo(() => {
    const lines = [
      `تقرير صناع الحياة سوهاج${year ? ` — ${year}` : ""}${center ? ` — ${center}` : ""}`,
      `عدد الأنشطة: ${fmt(acts.length)}`,
      `إجمالي المستفيدين: ${fmt(totalBen)}`,
      `الفرص التطوعية: ${fmt(totalVol)}`,
      planPct !== null ? `نسبة تحقيق الخطة: ${fmt(planPct)}٪` : "",
      "",
      "أبرز الإدارات:",
      ...depts.slice(0, 5).map((d, i) => `${i + 1}. ${d.name} — ${fmt(d.ben)} مستفيد (${fmt(d.n)} نشاط)`),
      "",
      "أبرز المراكز:",
      ...centersRanked.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} — ${fmt(c.ben)} مستفيد (${fmt(c.n)} نشاط)`),
    ].filter(Boolean);
    return lines.join("\n");
  }, [acts.length, totalBen, totalVol, planPct, depts, centersRanked, year, center]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("تم نسخ الملخص إلى الحافظة");
    } catch {
      toast.error("تعذر نسخ الملخص");
    }
  }

  if (!ds.activities.length) return <Empty>لا توجد بيانات أنشطة متاحة بعد.</Empty>;

  return (
    <div>
      <Hero label="التقارير" title="التقارير والأثر" subtitle="تقارير جاهزة وتحليلات أثر مبنية مباشرة على بيانات الأنشطة والخطط العامة." back={{ to: "/", text: "الرئيسية" }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={!year ? "secondary" : "outline"} onClick={() => setYear(0)}>
              كل السنوات
            </Button>
            {years.map((y) => (
              <Button key={y} variant={y === year ? "secondary" : "outline"} onClick={() => setYear(y)}>
                {y}
              </Button>
            ))}
          </div>
          <div className="max-w-xs rounded-xl bg-card p-3 text-foreground">
            <Select label="تصفية حسب المركز" value={center} onChange={setCenter} options={centers} />
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            طباعة التقرير
          </Button>
        </div>
      </Hero>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="إجمالي الأنشطة" value={fmt(acts.length)} />
        <Kpi label="إجمالي المستفيدين" value={fmt(totalBen)} tone="accent" />
        <Kpi label="فرص تطوعية" value={fmt(totalVol)} tone="success" />
        <Kpi label="متوسط المستفيدين لكل نشاط" value={acts.length ? fmt(Math.round(totalBen / acts.length)) : "—"} tone="navy" />
        <Kpi label="نسبة تحقيق الخطة" value={planPct === null ? "—" : `${fmt(planPct)}٪`} hint={plan?.title} tone="accent" />
      </div>

      <SectionTitle>الأثر الشهري</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarsChart title="الأنشطة شهريًا" data={monthly.map((m) => ({ name: m.name, value: m.n }))} />
        <BarsChart title="المستفيدون شهريًا" data={monthly.map((m) => ({ name: m.name, value: m.ben }))} />
      </div>
      <DataTable
        rows={monthly}
        exportName="الأثر-الشهري"
        columns={[
          { key: "name", label: "الشهر", value: (r) => r.name },
          { key: "n", label: "عدد الأنشطة", value: (r) => r.n, render: (r) => fmt(r.n) },
          { key: "ben", label: "المستفيدون", value: (r) => r.ben, render: (r) => fmt(r.ben) },
        ]}
      />

      <SectionTitle>ترتيب الإدارات</SectionTitle>
      <DataTable
        rows={depts}
        exportName="ترتيب-الإدارات"
        columns={[
          { key: "name", label: "الإدارة", value: (d) => d.name },
          { key: "n", label: "الأنشطة", value: (d) => d.n, render: (d) => fmt(d.n) },
          { key: "ben", label: "المستفيدون", value: (d) => d.ben, render: (d) => fmt(d.ben) },
          { key: "vol", label: "فرص تطوعية", value: (d) => d.vol, render: (d) => fmt(d.vol) },
          { key: "files", label: "عدد الملفات", value: (d) => d.files, render: (d) => fmt(d.files) },
          {
            key: "share",
            label: "نسبة من إجمالي المستفيدين",
            value: (d) => d.share,
            render: (d) => (
              <div className="flex w-32 items-center gap-2">
                <ProgressBar value={d.share} />
                <span className="text-xs">{fmt(d.share)}٪</span>
              </div>
            ),
          },
        ]}
      />

      <SectionTitle>ترتيب المراكز</SectionTitle>
      <DataTable
        rows={centersRanked}
        exportName="ترتيب-المراكز"
        columns={[
          { key: "name", label: "المركز", value: (c) => c.name },
          { key: "n", label: "الأنشطة", value: (c) => c.n, render: (c) => fmt(c.n) },
          { key: "ben", label: "المستفيدون", value: (c) => c.ben, render: (c) => fmt(c.ben) },
          { key: "vol", label: "فرص تطوعية", value: (c) => c.vol, render: (c) => fmt(c.vol) },
          { key: "pct", label: "نسبة تحقيق الخطة", value: (c) => c.pct, render: (c) => (c.pct === null ? "—" : `${fmt(c.pct)}٪`) },
        ]}
      />

      <SectionTitle>أبرز الأنشطة</SectionTitle>
      <DataTable<ActivityRecord>
        rows={topActivities}
        exportName="أبرز-الأنشطة"
        columns={[
          { key: "date", label: "التاريخ", value: (a) => a.date, render: (a) => a.date?.slice(0, 10) ?? "—" },
          { key: "name", label: "النشاط", value: (a) => a.name || a.file },
          { key: "center", label: "المركز", value: (a) => a.center },
          { key: "department", label: "الإدارة", value: (a) => a.department },
          { key: "ben", label: "المستفيدون", value: (a) => a.beneficiaries, render: (a) => fmt(a.beneficiaries) },
          { key: "vol", label: "فرص تطوعية", value: (a) => a.volunteers, render: (a) => fmt(a.volunteers) },
        ]}
      />

      <SectionTitle>ملخص جاهز للنسخ</SectionTitle>
      <div className="card-surface space-y-3 p-5">
        <Button onClick={copySummary}>نسخ الملخص</Button>
        <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-7 text-navy">{summaryText}</pre>
      </div>
    </div>
  );
}
