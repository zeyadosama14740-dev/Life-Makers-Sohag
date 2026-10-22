const nf = new Intl.NumberFormat("ar-EG");
export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(Math.round(n)));
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${nf.format(n)}٪`);

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
