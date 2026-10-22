import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { ActivityDashboard } from "@/components/dash/activity-dashboard";
import { Hero, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import { looseMatch } from "@/lib/sheets/normalize";

export const Route = createFileRoute("/departments/$dept")({
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `${params.dept} — صناع الحياة سوهاج` },
      { name: "description", content: `متابعة أنشطة وملفات ${params.dept} في صناع الحياة سوهاج.` },
      { property: "og:title", content: `${params.dept} — صناع الحياة سوهاج` },
      { property: "og:description", content: `مؤشرات وملفات وسجلات ${params.dept}.` },
    ],
  }),
  component: DepartmentPage,
});

function DepartmentPage() {
  const { dept } = Route.useParams();
  const ds = useDataset();
  const rows = useMemo(() => ds.activities.filter((a) => a.department === dept), [ds, dept]);
  const files = useMemo(() => {
    const m = new Map<string, { n: number; ben: number }>();
    rows.forEach((r) => {
      const c = m.get(r.file) ?? { n: 0, ben: 0 };
      c.n++;
      c.ben += r.beneficiaries;
      m.set(r.file, c);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [rows]);
  const planItems = useMemo(
    () =>
      ds.plans
        .filter((p) => !p.department || looseMatch(p.department, dept))
        .flatMap((p) => p.items)
        .filter((i) => i.targetToDate && files.some(([f]) => looseMatch(f, i.goal))),
    [ds, dept, files],
  );

  return (
    <div>
      <Hero label="إدارة" title={dept} subtitle={`${rows.length} تقرير نشاط عبر ${files.length} ملف`} back={{ to: "/", text: "الرئيسية" }} />
      <SectionTitle>الملفات والأنشطة</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {files.map(([f, d]) => (
          <Link key={f} to="/files/$dept/$file" params={{ dept, file: f }} className="card-surface flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary">
            <div className="grid size-10 place-items-center rounded-xl bg-accent/20"><FolderOpen className="size-5" /></div>
            <div>
              <div className="font-bold">{f}</div>
              <div className="text-xs text-muted-foreground">{fmt(d.n)} نشاط · {fmt(d.ben)} مستفيد</div>
            </div>
          </Link>
        ))}
      </div>
      <ActivityDashboard rows={rows} showFileFilter planItems={planItems} exportName={`أنشطة-${dept}`} />
    </div>
  );
}
