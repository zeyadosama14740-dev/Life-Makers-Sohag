// Pure helpers for cleaning raw Google Sheets values (Arabic-aware).

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeArabic(input: unknown): string {
  return String(input ?? "")
    .replace(/[\u064B-\u0652\u0640]/g, "") // diacritics + tatweel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Parse "12,500", "18%", "٢٥", "" → number | null. Errors like #DIV/0! → null. */
export function toNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input)
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[,\s%]/g, "")
    .trim();
  if (!s || s.startsWith("#")) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse ISO, M/D/YYYY, or a Sheets serial into YYYY-MM-DD. */
export function parseDate(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** Clean center names: "مركز طهطا" / "طهطا" → "طهطا". */
export function normalizeCenter(input: unknown): string {
  const s = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "غير محدد";
  return s.replace(/^(مركز|قسم)\s+/, "").replace(/^(اول|أول|ثان|ثاني)\s+/, "").trim() || "غير محدد";
}

/** Loose match between two Arabic labels (e.g. activity type vs plan goal). */
export function looseMatch(a: string, b: string): boolean {
  const x = normalizeArabic(a).replace(/^ال/, "").replace(/ ال/g, " ");
  const y = normalizeArabic(b).replace(/^ال/, "").replace(/ ال/g, " ");
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function spreadsheetIdFromUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1] ?? null;
  return /^[a-zA-Z0-9-_]{25,}$/.test(url.trim()) ? url.trim() : null;
}
