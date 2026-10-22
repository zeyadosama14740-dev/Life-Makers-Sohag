import { normalizeArabic, parseDate } from "./normalize";

function timestamp(value: string): number | null {
  const text = normalizeArabic(value);
  if (!/^\d{4}-\d{2}-\d{2}[t ]\d{1,2}:\d{2}/.test(text)) return null;
  const n = Date.parse(text.replace(" ","T").replace("t","T"));
  return Number.isFinite(n) ? n : null;
}
function clock(value: string): number | null {
  const text = normalizeArabic(value);
  const fraction = Number(text);
  if (text && Number.isFinite(fraction) && fraction >= 0 && fraction < 1) return fraction * 24;
  const m = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:[+-]\d{2}:\d{2}|z)?\s*(am|pm|ص|م)?$/);
  if (!m) return null;
  let hour = Number(m[1]); const minute = Number(m[2]); const second = Number(m[3] ?? 0);
  if (minute > 59 || second > 59 || hour > 23) return null;
  if (m[4]) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (/pm|م/.test(m[4]) ? 12 : 0); }
  return hour + minute/60 + second/3600;
}
export function durationHours(start: string, end: string, startDate = "", endDate = ""): number | null {
  const a = timestamp(start); const b = timestamp(end);
  let result: number;
  if (a !== null || b !== null) {
    if (a === null || b === null || b < a) return null;
    result = (b-a)/3600000;
  } else {
    const from = clock(start); const to = clock(end);
    if (from === null || to === null) return null;
    const first = parseDate(startDate); const last = parseDate(endDate);
    if (first && last) result = (Date.parse(last)-Date.parse(first))/3600000 + to-from;
    else { result = to-from; if (result < 0) result += 24; }
    if (result < 0) return null;
  }
  return Math.round(result*100)/100;
}
export function formatParticipationTime(value: string): string {
  return (value.match(/[T ](\d{2}:\d{2})/)?.[1] ?? value.match(/^(\d{1,2}:\d{2})/)?.[1] ?? value) || "—";
}