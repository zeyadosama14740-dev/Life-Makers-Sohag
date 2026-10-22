import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { CHART_COLORS, fmt } from "@/lib/format";

export function ChartCard({ title, children, empty }: { title: string; children: ReactNode; empty?: boolean }) {
  return (
    <div className="card-surface p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="h-64" dir="ltr">
        {empty ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground" dir="rtl">
            لا توجد بيانات كافية
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const tip = {
  contentStyle: { borderRadius: 12, border: "1px solid var(--border)", fontFamily: "Cairo", direction: "rtl" as const },
  formatter: (v: number) => fmt(v),
};

export function BarsChart({ title, data, horizontal }: { title: string; data: { name: string; value: number }[]; horizontal?: boolean }) {
  return (
    <ChartCard title={title} empty={!data.length}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        {horizontal ? <XAxis type="number" tick={{ fontSize: 11 }} /> : <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />}
        {horizontal ? (
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} orientation="right" />
        ) : (
          <YAxis tick={{ fontSize: 11 }} />
        )}
        <Tooltip {...tip} />
        <Bar dataKey="value" name="العدد" radius={6}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

export function DonutChart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <ChartCard title={title} empty={!data.length}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Cairo" }} />
      </PieChart>
    </ChartCard>
  );
}

export function TimelineChart({
  title,
  data,
  series,
}: {
  title: string;
  data: Record<string, string | number | null>[];
  series: { key: string; name: string }[];
}) {
  return (
    <ChartCard title={title} empty={!data.length}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Cairo" }} />
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={CHART_COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ChartCard>
  );
}

export function TargetVsAchieved({ title, data }: { title: string; data: { name: string; target: number; achieved: number }[] }) {
  return (
    <ChartCard title={title} empty={!data.length}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Cairo" }} />
        <Bar dataKey="target" name="المستهدف" fill="var(--chart-1)" radius={4} />
        <Bar dataKey="achieved" name="المحقق" fill="var(--chart-2)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
