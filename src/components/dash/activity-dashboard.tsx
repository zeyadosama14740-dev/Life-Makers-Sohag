import { Activity, CalendarDays, HandHeart, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/format";
import type { ActivityRecord, PlanItem } from "@/lib/sheets/types";
import { BarsChart, DonutChart, TimelineChart } from "./charts";
import { DataTable, type Column } from "./data-table";
import { Empty, Kpi, ProgressBar, SectionTitle, TrendBadge } from "./ui";

const sumBy = (rows: ActivityRecord[], f: (r: ActivityRecord) => number) => rows.reduce((s, r) => s + f(r), 0);

function group(rows: ActivityRecord[], key: (r: ActivityRecord) => string, val: (r: ActivityRecord) => number = () => 1) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + val(r)));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border bg-card px-2 text-sm text-foreground"
      >
        <option value="">الكل</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function ActivityDashboard({
  rows,
  showFileFilter,
  planItems = [],
  exportName,
}: {
  rows: ActivityRecord[];
  showFileFilter?: boolean;
  planItems?: PlanItem[];
  exportName: string;
}) {
  const [center, setCenter] = useState("");
  const [file, setFile] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<ActivityRecord | null>(null);

  const centers = useMemo(() => [...new Set(rows.map((r) => r.center))].sort(), [rows]);
  const files = useMemo(() => [...new Set(rows.map((r) => r.file))].sort(), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!center || r.center === center) &&
          (!file || r.file === file) &&
          (!from || (r.date && r.date >= from)) &&
          (!to || (r.date && r.date <= to)),
      ),
    [rows, center, file, from, to],
  );

  const metricTotals = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => Object.entries(r.metrics).forEach(([k, v]) => m.set(k, (m.get(k) ?? 0) + v)));
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const timeline = useMemo(() => {
    const m = new Map<string, { label: string; activities: number; beneficiaries: number; volunteers: number }>();
    filtered.forEach((r) => {
      const k = r.date?.slice(0, 7) ?? "بدون تاريخ";
      const cur = m.get(k) ?? { label: k, activities: 0, beneficiaries: 0, volunteers: 0 };
      cur.activities++;
      cur.beneficiaries += r.beneficiaries;
      cur.volunteers += r.volunteers;
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered]);

  const columns: Column<ActivityRecord>[] = [
    { key: "date", label: "التاريخ", value: (r) => r.date },
    { key: "dept", label: "الإدارة", value: (r) => r.department },
    { key: "file", label: "الملف", value: (r) => r.file },
    { key: "name", label: "النشاط", value: (r) => r.name || "—" },
    { key: "center", label: "المركز", value: (r) => r.center },
    { key: "ben", label: "المستفيدين", value: (r) => r.beneficiaries, render: (r) => fmt(r.beneficiaries) },
    { key: "vol", label: "المتطوعين", value: (r) => r.volunteers, render: (r) => fmt(r.volunteers) },
    { key: "rep", label: "مقدم التقرير", value: (r) => r.reporter },
  ];

  if (!rows.length) return <Empty>لا توجد تقارير أنشطة لهذا القسم في المصادر المتصلة حالياً.</Empty>;

  return (
    <div>
      <div className="card-surface mt-6 grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <Select label="المركز" value={center} onChange={setCenter} options={centers} />
        {showFileFilter ? <Select label="الملف / النشاط" value={file} onChange={setFile} options={files} /> : <div className="hidden md:block" />}
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          من تاريخ
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          إلى تاريخ
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="عدد الأنشطة" value={fmt(filtered.length)} icon={<Activity className="size-5" />} />
        <Kpi label="المستفيدين" value={fmt(sumBy(filtered, (r) => r.beneficiaries))} icon={<HandHeart className="size-5" />} tone="accent" />
        <Kpi
          label="فرص تطوعية"
          value={fmt(sumBy(filtered, (r) => r.volunteers))}
          hint={`جدد ${fmt(sumBy(filtered, (r) => r.newVolunteers))} · قدامى ${fmt(sumBy(filtered, (r) => r.oldVolunteers))}`}
          icon={<Users className="size-5" />}
          tone="success"
        />
        <Kpi label="المراكز المشمولة" value={fmt(new Set(filtered.map((r) => r.center)).size)} icon={<CalendarDays className="size-5" />} tone="navy" />
      </div>

      {metricTotals.length > 0 && (
        <>
          <SectionTitle>مؤشرات مكتشفة من البيانات</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {metricTotals.slice(0, 12).map(([k, v]) => (
              <div key={k} className="card-surface p-3">
                <div className="line-clamp-2 text-xs text-muted-foreground">{k}</div>
                <div className="text-xl font-extrabold tabular-nums">{fmt(v)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {planItems.length > 0 && (
        <>
          <SectionTitle>المستهدفات من الماستر بلان</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {planItems.map((p) => (
              <div key={p.goal + p.item} className="card-surface space-y-2 p-4">
                <div className="text-xs text-muted-foreground">{p.goal}</div>
                <div className="font-bold">{p.item}</div>
                <ProgressBar value={p.pct} />
                <TrendBadge achieved={p.achieved} target={p.targetToDate} />
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>التحليلات</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <TimelineChart
          title="الأنشطة عبر الزمن"
          data={timeline}
          series={[
            { key: "activities", name: "الأنشطة" },
            { key: "beneficiaries", name: "المستفيدين" },
            { key: "volunteers", name: "المتطوعين" },
          ]}
        />
        <DonutChart title="توزيع الأنشطة حسب المركز" data={group(filtered, (r) => r.center)} />
        <BarsChart title="المستفيدين حسب الملف" data={group(filtered, (r) => r.file, (r) => r.beneficiaries)} horizontal />
        <BarsChart title="عدد الأنشطة حسب الملف" data={group(filtered, (r) => r.file)} horizontal />
      </div>

      <SectionTitle>السجلات التفصيلية</SectionTitle>
      <DataTable rows={filtered} columns={columns} onRowClick={setOpen} exportName={exportName} />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">{open.name || open.file}</DialogTitle>
              </DialogHeader>
              {open.image && (
                <a href={open.image} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  عرض الصورة التوثيقية
                </a>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["الإدارة", open.department],
                  ["الملف", open.file],
                  ["المركز", open.center],
                  ["التاريخ", open.date ?? "—"],
                  ["المكان", open.place || "—"],
                  ["مقدم التقرير", open.reporter || "—"],
                  ["المستفيدين", fmt(open.beneficiaries)],
                  ["المتطوعين", fmt(open.volunteers)],
                  ...Object.entries(open.metrics).map(([k, v]) => [k, fmt(v)]),
                  ...Object.entries(open.details).map(([k, v]) => [k, v]),
                ].map(([k, v]) => (
                  <div key={k} className="border-b pb-1">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-semibold break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">المصدر: {open.sourceLabel}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
