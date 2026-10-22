import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ActivityDashboard } from "@/components/dash/activity-dashboard";
import { Hero, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { looseMatch, normalizeArabic } from "@/lib/sheets/normalize";

export const Route = createFileRoute("/files/$dept/$file")({
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `${params.file} — ${params.dept} | صناع الحياة سوهاج` },
      { name: "description", content: `لوحة ملف ${params.file} التابع لـ ${params.dept}.` },
      { property: "og:title", content: `${params.file} — ${params.dept}` },
      { property: "og:description", content: `مؤشرات ومستهدفات وسجلات ملف ${params.file}.` },
    ],
  }),
  component: FilePage,
});

function FilePage() {
  const { dept, file } = Route.useParams();
  const ds = useDataset();
  const rows = useMemo(() => ds.activities.filter((a) => a.department === dept && a.file === file), [ds, dept, file]);
  const planItems = useMemo(
    () => ds.plans.flatMap((p) => p.items).filter((i) => looseMatch(file, i.goal)),
    [ds, file],
  );
  const images = ds.images.filter((i) => normalizeArabic(i.department) === normalizeArabic(dept) && (!i.file || looseMatch(i.file, file)));
  const photos = [...images.map((i) => i.url), ...rows.map((r) => r.image).filter((x): x is string => !!x)].slice(0, 8);

  return (
    <div>
      <Hero label={dept} title={file} subtitle="لوحة متابعة الملف: المؤشرات، المستهدفات، التحليلات والسجلات." back={{ to: "/departments/$dept", params: { dept }, text: dept }} />
      {!planItems.length && (
        <p className="mt-4 rounded-xl bg-accent/15 p-3 text-sm">لم يتم العثور على مستهدف مطابق لهذا الملف في الماستر بلان.</p>
      )}
      <ActivityDashboard rows={rows} planItems={planItems} exportName={`${dept}-${file}`} />
      {photos.length > 0 && (
        <>
          <SectionTitle>الصور التوثيقية</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {photos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="card-surface px-3 py-2 text-sm text-primary underline">
                صورة {i + 1}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
