import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useDataset, useRefresh } from "@/hooks/use-dataset";
import { fmt, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Hero({
  label,
  title,
  subtitle,
  back,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  back?: { to: string; params?: Record<string, string>; text: string };
  children?: ReactNode;
}) {
  const { refresh, busy } = useRefresh();
  const ds = useDataset();
  return (
    <section className="hero-surface animate-fade-up p-6 md:p-8">
      <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-primary-foreground/10 animate-drift" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-accent/20 animate-float" />
      <div className="pointer-events-none absolute -right-10 top-1/3 size-28 rounded-full bg-primary-foreground/5 animate-drift" style={{ animationDelay: "2s" }} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "120ms" }}>
          {back && (
            <Link to={back.to} {...({ params: back.params } as object)} className="inline-flex items-center gap-1 text-sm opacity-85 hover:opacity-100">
              <ArrowRight className="size-4" /> {back.text}
            </Link>
          )}
          <span className="block w-fit rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">{label}</span>
          <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
          {subtitle && <p className="max-w-2xl text-sm opacity-85 md:text-base">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={busy}>
            <RefreshCw className={cn("size-4", busy && "animate-spin")} /> تحديث البيانات
          </Button>
          <span className="text-xs opacity-75" suppressHydrationWarning>
            آخر تحديث: {new Date(ds.generatedAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
          </span>
        </div>
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 mt-8 flex items-center justify-between gap-3">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  );
}

export function CountUp({ n }: { n: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const from = ref.current;
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (n - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = n;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{fmt(display)}</>;
}

const AR = "٠١٢٣٤٥٦٧٨٩";
/** Animate plain whole-number KPI values (e.g. "١٬٢٣٤" or 1234); leave other content untouched. */
function animateValue(value: ReactNode): ReactNode {
  if (typeof value === "number" && Number.isInteger(value)) return <CountUp n={value} />;
  if (typeof value === "string") {
    const s = value.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[,٬\s]/g, "");
    if (/^\d+$/.test(s)) return <CountUp n={Number(s)} />;
  }
  return value;
}

export function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "accent" | "success" | "navy";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-foreground",
    success: "bg-success/15 text-success",
    navy: "bg-navy/10 text-navy",
  }[tone];
  return (
    <div className="card-interactive flex items-start gap-3 p-4">
      {icon && <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110", toneCls)}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="text-3xl font-extrabold leading-tight tabular-nums">{animateValue(value)}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value }: { value: number | null }) {
  const v = value ?? 0;
  const color = v >= 100 ? "bg-success" : v >= 50 ? "bg-primary" : v >= 25 ? "bg-accent" : "bg-destructive";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("relative h-full rounded-full transition-all duration-1000 ease-out", color)} style={{ width: `${Math.min(100, v)}%` }}>
        <div className="shimmer-bar absolute inset-0 rounded-full" />
      </div>
    </div>
  );
}

export function Gauge({ value, label }: { value: number | null; label: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const r = 52;
  const c = Math.PI * r;
  return (
    <div className="card-surface flex flex-col items-center p-4">
      <svg viewBox="0 0 120 70" className="w-40">
        <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="var(--muted)" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M8 62 A52 52 0 0 1 112 62"
          fill="none"
          stroke={v >= 100 ? "var(--success)" : v >= 50 ? "var(--primary)" : "var(--accent)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="-mt-6 text-2xl font-extrabold">{value === null ? "—" : pct(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function TrendBadge({ achieved, target }: { achieved: number | null; target: number | null }) {
  if (!target) return <span className="text-xs text-muted-foreground">لا يوجد مستهدف</span>;
  const p = Math.round(((achieved ?? 0) / target) * 100);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", p >= 100 ? "text-success" : p >= 50 ? "text-primary" : "text-destructive")}>
      <TrendingUp className="size-3" /> {pct(p)} · {fmt(achieved)} / {fmt(target)}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card-surface p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
