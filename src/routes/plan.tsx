import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { TargetVsAchieved, TimelineChart } from "@/components/dash/charts";
import { DataTable } from "@/components/dash/data-table";
import { Empty, Gauge, Hero, Kpi, ProgressBar, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import type { PlanItem } from "@/lib/sheets/types";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الماستر بلان والمستهدفات — صناع الحياة سوهاج" },
      { name: "description", content: "المستهدف مقابل المحقق لكل هدف وبند في الخطة السنوية." },
      { property: "og:title", content: "الماستر بلان — صناع الحياة سوهاج" },
      { property: "og:description", content: "متابعة تحقيق المستهدفات السنوية والشهرية." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const ds = useDataset();
  const years = [...new Set(ds.plans.map((p) => p.year))].sort();
  const [year, setYear] = useState(years.at(-1) ?? 0);
  const plans = ds.plans.filter((p) => !year || p.year === year);
  const items = plans.flatMap((p) => p.items.map(i => ({...i,year:p.year})));
  const goals = [...new Set(items.map((i) => i.goal))];
  const [goal, setGoal] = useState("");
  const shown = goal ? items.filter((i) => i.goal === goal) : items;
  const withT = shown.filter((i) => i.targetToDate);
  const avg = withT.length ? Math.round(withT.reduce((s, i) => s + Math.min(100, i.pct ?? 0), 0) / withT.length) : null;

  const timeline = useMemo(() => {
    const it = shown.find((i) => i.months.some((m) => m.achieved));
    return { item: it, data: (it?.months ?? []).map((m) => ({ label: m.label, target: m.target, achieved: m.achieved })) };
  }, [shown]);

  if (!ds.plans.length) return <Empty>لا يوجد ماستر بلان متصل. أضف ملف الخطة من صفحة مصادر البيانات.</Empty>;

  return (
    <div>
      <Hero label="الماستر بلان" title={plans[0]?.title ?? "الخطة السنوية"} subtitle="المستهدف حتى تاريخه مقابل المحقق، مأخوذ مباشرة من ملف الخطة." back={{ to: "/", text: "الرئيسية" }}>
        <div className="flex flex-wrap gap-2">
          <Button variant={!year?"secondary":"outline"} onClick={()=>setYear(0)}>كل السنوات</Button>
          {years.map((y) => (
            <Button key={y} variant={y===year?"secondary":"outline"} onClick={() => setYear(y)}>
              {y}
            </Button>
          ))}
        </div>
      </Hero>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant={!goal?"default":"outline"} onClick={() => setGoal("")}>كل الأهداف</Button>
        {goals.map((g) => (
          <Button key={g} variant={goal===g?"default":"outline"} onClick={() => setGoal(g)} className="h-auto whitespace-normal text-right">{g}</Button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Gauge value={avg} label="متوسط نسبة التحقيق" />
        <Kpi label="بنود بمستهدف" value={fmt(withT.length)} />
        <Kpi label="بنود تجاوزت 100٪" value={fmt(withT.filter((i) => (i.pct ?? 0) >= 100).length)} tone="success" />
        <Kpi label="بنود أقل من 25٪" value={fmt(withT.filter((i) => (i.pct ?? 0) < 25).length)} tone="accent" />
      </div>

      <SectionTitle>المستهدف مقابل المحقق</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <TargetVsAchieved title="حتى تاريخه" data={withT.slice(0, 10).map((i) => ({ name: i.item.slice(0, 22), target: i.targetToDate ?? 0, achieved: i.achieved ?? 0 }))} />
        <TimelineChart title={`الأداء الشهري: ${timeline.item?.item ?? ""}`} data={timeline.data} series={[{ key: "target", name: "المستهدف" }, { key: "achieved", name: "المحقق" }]} />
      </div>

      <SectionTitle>البنود</SectionTitle>
      <DataTable<PlanItem & {year:number}>
        rows={shown}
        exportName={`الماستر-بلان-${year}`}
        columns={[
          { key: "year", label: "السنة", value: i => i.year },
          { key: "goal", label: "الهدف", value: (i) => i.goal },
          { key: "item", label: "البند", value: (i) => i.item },
          { key: "total", label: "المستهدف الكلي", value: (i) => i.totalTarget, render: (i) => fmt(i.totalTarget) },
          { key: "t", label: "المستهدف حتى تاريخه", value: (i) => i.targetToDate, render: (i) => fmt(i.targetToDate) },
          { key: "a", label: "المحقق", value: (i) => i.achieved, render: (i) => fmt(i.achieved) },
          {
            key: "p",
            label: "النسبة",
            value: (i) => i.pct,
            render: (i) => (
              <div className="flex w-32 items-center gap-2">
                <ProgressBar value={i.pct} />
                <span className="text-xs">{i.pct === null ? "—" : `${fmt(i.pct)}٪`}</span>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
