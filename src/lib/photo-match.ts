import { normalizeArabic } from "./sheets/normalize";

export interface SitePhoto {
  url: string;
  /** Words describing the photo: file name, folder, activity, department. */
  label: string;
  date?: string | null;
}

const STOP = new Set(["عدد", "في", "من", "على", "الى", "إلى", "و", "مع", "عن", "نشاط", "انشطه", "أنشطة", "img", "jpg", "jpeg", "png", "photo", "صوره", "صورة"]);

export function tokens(text: string): string[] {
  return normalizeArabic(text.replace(/\.[a-z0-9]{2,4}$/i, ""))
    .replace(/^ال(?=\S{3,})/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .map((w) => w.replace(/^ال(?=\S{3,})/, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Best-matching photo for a label by shared words; null when nothing shares a word. Deterministic. */
export function matchPhoto(label: string, photos: SitePhoto[]): SitePhoto | null {
  const want = new Set(tokens(label));
  if (!want.size) return null;
  let best: SitePhoto | null = null;
  let bestScore = 0;
  for (const p of photos) {
    const score = new Set(tokens(p.label).filter((t) => want.has(t))).size;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}
