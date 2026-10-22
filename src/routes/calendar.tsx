import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Select } from "@/components/dash/activity-dashboard";
import { DataTable } from "@/components/dash/data-table";
import { Empty, Hero, Kpi, SectionTitle } from "@/components/dash/ui";
import { Button } from "@/components/ui/button";
import { useDataset } from "@/hooks/use-dataset";
import { useSitePhotos } from "@/hooks/use-site-photos";
import { thumbUrl } from "@/lib/sheets/gallery";
import { fmt } from "@/lib/format";
import type { ActivityRecord } from "@/lib/sheets/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تقويم الأنشطة — صناع الحياة سوهاج" },
      { name: "description", content: "عرض شهري لتوزيع الأنشطة والمستفيدين على أيام الشهر لكل المراكز والإدارات." },
      { property: "og:title", content: "تقويم الأنشطة — صناع الحياة سوهاج" },
      { property: "og:description", content: "تصفح الأنشطة يوماً بيوم مع تفاصيل كل يوم ومؤشراته." },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(Date.UTC(year, month, 1)));
}

/** YYYY-MM-DD -> { year, month, day } using the date's own calendar fields (avoids TZ drift). */
function splitIso(date: string): { year: number; month: number; day: number } | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function CalendarPage() {
  const ds = useDataset();
  const site = useSitePhotos();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [center, setCenter] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const centers = useMemo(() => [...new Set(ds.activities.map((a) => a.center).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")), [ds.activities]);
  const departments = useMemo(() => [...new Set(ds.activities.map((a) => a.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")), [ds.activities]);

  const filtered = useMemo(
    () => ds.activities.filter((a) => (!center || a.center === center) && (!department || a.department === department)),
    [ds.activities, center, department],
  );

  const withDate = useMemo(() => filtered.filter((a) => splitIso(a.date ?? "")), [filtered]);
  const undated = useMemo(() => filtered.filter((a) => !splitIso(a.date ?? "")), [filtered]);

  const byDay = useMemo(() => {
    const m = new Map<string, ActivityRecord[]>();
    withDate.forEach((a) => {
      const parts = splitIso(a.date as string)!;
      if (parts.year !== year || parts.month !== month) return;
      const key = `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      const list = m.get(key) ?? [];
      list.push(a);
      m.set(key, list);
    });
    return m;
  }, [withDate, year, month]);

  const monthActivities = useMemo(() => [...byDay.values()].flat(), [byDay]);
  const totalBeneficiaries = monthActivities.reduce((s, a) => s + (a.beneficiaries || 0), 0);
  const topCenter = useMemo(() => {
    const m = new Map<string, number>();
    monthActivities.forEach((a) => m.set(a.center, (m.get(a.center) ?? 0) + 1));
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "—";
  }, [monthActivities]);

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const years = [...new Set(ds.activities.map((a) => splitIso(a.date ?? "")?.year).filter((y): y is number => !!y))].sort();
  const yearOptions = years.length ? years : [today.getFullYear()];

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(null);
  };
  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const dayActivities = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  if (!ds.activities.length) return <Empty>لا توجد أنشطة في البيانات الحالية لعرضها على التقويم.</Empty>;

  return (
    <div>
      <Hero label="المتابعة" title="تقويم الأنشطة" subtitle="عرض شهري لتوزيع الأنشطة والمستفيدين على أيام الشهر." back={{ to: "/", text: "الرئيسية" }}>
        <div className="flex flex-wrap gap-3">
          <div className="max-w-xs rounded-xl bg-card p-3 text-foreground">
            <Select label="المركز" value={center} onChange={setCenter} options={centers} />
          </div>
          <div className="max-w-xs rounded-xl bg-card p-3 text-foreground">
            <Select label="الإدارة" value={department} onChange={setDepartment} options={departments} />
          </div>
        </div>
      </Hero>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="أيام بها أنشطة هذا الشهر" value={fmt(byDay.size)} />
        <Kpi label="إجمالي الأنشطة هذا الشهر" value={fmt(monthActivities.length)} />
        <Kpi label="إجمالي المستفيدين" value={fmt(totalBeneficiaries)} tone="success" />
        <Kpi label="أعلى مركز نشاطًا" value={topCenter} tone="accent" />
      </div>

      <SectionTitle
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="السنة" value={year} onChange={(e) => { setYear(Number(e.target.value)); setSelectedDay(null); }} className="h-9 rounded-md border bg-card px-3 text-sm">
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select aria-label="الشهر" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setSelectedDay(null); }} className="h-9 rounded-md border bg-card px-3 text-sm">
              {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>{monthLabel(year, m)}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={prevMonth}>الشهر السابق</Button>
            <Button variant="secondary" size="sm" onClick={goToday}>اليوم</Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>الشهر التالي</Button>
          </div>
        }
      >
        {monthLabel(year, month)}
      </SectionTitle>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayActs = byDay.get(key) ?? [];
          const isToday = key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          const hasActs = dayActs.length > 0;
          const ben = dayActs.reduce((s, a) => s + (a.beneficiaries || 0), 0);
          const sheetImg = dayActs.find((a) => a.image)?.image?.split(/[\s,]+/)[0];
          const bg = hasActs ? (sheetImg ? thumbUrl(sheetImg, 400) : site.find(dayActs.map((a) => `${a.name} ${a.file}`).join(" "))) : null;
          return (
            <button
              key={key}
              disabled={!hasActs}
              onClick={() => setSelectedDay(key)}
              className={cn(
                "flex min-h-20 flex-col items-start gap-1 rounded-lg border p-2 text-right text-xs transition-colors",
                hasActs ? "card-interactive cursor-pointer" : "bg-muted/40 text-muted-foreground",
                selectedDay === key && "ring-2 ring-primary",
                isToday && "border-primary",
                bg && "relative overflow-hidden text-primary-foreground",
              )}
            >
              {bg && <><img src={bg} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-navy/90 to-navy/30" /></>}
              <span className="relative font-bold">{day}</span>
              {hasActs && (
                <span className={cn("relative", bg ? "font-bold" : "text-navy")}>
                  {fmt(dayActs.length)} نشاط
                  <br />
                  {fmt(ben)} مستفيد
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="card-surface animate-pop-in mt-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">أنشطة يوم {selectedDay}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>إغلاق</Button>
          </div>
          {!dayActivities.length && <p className="text-sm text-muted-foreground">لا توجد أنشطة مسجلة في هذا اليوم.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {dayActivities.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 text-sm">
                <h4 className="font-bold">{a.name || a.file}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{a.department} · {a.center || "المركز غير محدد"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.place || "المكان غير محدد"}</p>
                {a.details["time"] && <p className="mt-1 text-xs text-muted-foreground">الوقت: {a.details["time"]}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>{fmt(a.beneficiaries)} مستفيد</span>
                  <span>{fmt(a.volunteers)} فرصة تطوعية</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionTitle>أنشطة بلا تاريخ مقروء</SectionTitle>
      {undated.length ? (
        <DataTable<ActivityRecord>
          rows={undated}
          exportName="أنشطة-بلا-تاريخ"
          columns={[
            { key: "name", label: "النشاط", value: (a) => a.name || a.file },
            { key: "department", label: "الإدارة", value: (a) => a.department },
            { key: "center", label: "المركز", value: (a) => a.center },
            { key: "place", label: "المكان", value: (a) => a.place },
            { key: "beneficiaries", label: "المستفيدون", value: (a) => a.beneficiaries, render: (a) => fmt(a.beneficiaries) },
            { key: "volunteers", label: "الفرص التطوعية", value: (a) => a.volunteers, render: (a) => fmt(a.volunteers) },
          ]}
        />
      ) : (
        <Empty>كل الأنشطة المطابقة للتصفية الحالية لها تاريخ مقروء.</Empty>
      )}
    </div>
  );
}
