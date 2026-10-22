import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BarsChart, DonutChart } from "@/components/dash/charts";
import { Hero, Kpi, SectionTitle } from "@/components/dash/ui";
import { VolunteerRegistry } from "@/components/dash/volunteer-registry";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import { ParticipationDashboard } from "@/components/dash/participation-dashboard";

export const Route = createFileRoute("/volunteers")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "المتطوعين — صناع الحياة سوهاج" },
      { name: "description", content: "مسار المتطوعين من الجذب إلى التفعيل وتوزيعهم حسب المراكز والفئات." },
      { property: "og:title", content: "إدارة المتطوعين — صناع الحياة سوهاج" },
      { property: "og:description", content: "جذب، استقبال، تسكين، تفعيل — أرقام حيّة." },
    ],
  }),
  component: VolunteersPage,
});

function VolunteersPage() {
  const v = useDataset().volunteers;
  const first = v.stages[0]?.count || 0;
  return (
    <div>
      <Hero label="المتطوعين" title="مسار المتطوعين" subtitle="من التسجيل (جذب) إلى الاستقبال ثم التسكين على الملفات ثم التفعيل." back={{ to: "/", text: "الرئيسية" }} />

      <SectionTitle>مسار التحويل</SectionTitle>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {v.stages.map((s, i) => (
          <div key={s.stage} className="flex flex-1 items-center gap-3">
            <div className="card-surface flex-1 p-4 text-center">
              <div className="text-sm font-bold text-primary">{s.stage}</div>
              <div className="text-3xl font-extrabold tabular-nums">{fmt(s.count)}</div>
              <div className="text-xs text-muted-foreground">
                {s.count === 0 ? "لا توجد بيانات بعد" : i === 0 ? `${fmt(s.unique)} غير مكرر` : `${first ? fmt(Math.round((s.count / first) * 100)) : "—"}٪ من الجذب`}
              </div>
            </div>
            {i < v.stages.length - 1 && <ArrowLeft className="hidden size-5 shrink-0 text-accent md:block" />}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Kpi label="تسجيلات مكررة (رقم قومي/كود)" value={fmt(v.duplicates)} tone="accent" />
        <Kpi label="تسجيلات بدون رقم قومي أو كود" value={fmt(v.missingId)} tone="navy" />
      </div>

      <SectionTitle>تحليل المسجلين</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarsChart title="حسب المركز" data={v.byCenter} horizontal />
        <DonutChart title="حسب النوع" data={v.byGender} />
        <BarsChart title="حسب الفئة العمرية" data={v.byAge} />
        <DonutChart title="كيف عرفوا صناع الحياة" data={v.bySource} />
        <BarsChart title="الملفات المفضلة عند التسكين" data={v.preferredFiles} horizontal />
      </div>
      <VolunteerRegistry />
      <ParticipationDashboard />
    </div>
  );
}
