import { ArrowDownUp, Download, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeArabic } from "@/lib/sheets/normalize";
import { downloadCsv } from "@/lib/format";

export interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  onRowClick,
  exportName,
  pageSize = 15,
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  exportName: string;
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const nq = normalizeArabic(q);
    let r = nq ? rows.filter((row) => columns.some((c) => normalizeArabic(c.value(row)).includes(nq))) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (!col) return r;
      r = [...r].sort((a, b) => {
        const x = col.value(a) ?? "";
        const y = col.value(b) ?? "";
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ar")) * sort.dir;
      });
    }
    return r;
  }, [rows, columns, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="ابحث في السجلات…"
            className="pr-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} سجل</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              exportName,
              filtered.map((r) => Object.fromEntries(columns.map((c) => [c.label, c.value(r)]))),
            )
          }
        >
          <Download className="size-4" /> تصدير CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}
                  >
                    {c.label} <ArrowDownUp className="size-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer border-t hover:bg-secondary/60" : "border-t"}
              >
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-3 py-2">
                    {c.render ? c.render(row) : (c.value(row) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {!current.length && (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  لا توجد سجلات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t p-3 text-xs">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span>
            صفحة {page + 1} من {pages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
