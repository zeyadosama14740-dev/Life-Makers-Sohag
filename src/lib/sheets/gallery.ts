import type { ActivityRecord, ImageRef } from "./types";

export interface GalleryPhoto {
  url: string;
  thumb: string;
  department: string;
  file: string;
  center: string;
  date: string | null;
  activity: string;
}

/** Extracts a Google Drive file id from common share-link shapes. */
export function driveId(url: string): string | null {
  const m = url.match(/\/d\/([\w-]{10,})/) ?? url.match(/[?&]id=([\w-]{10,})/);
  return m && /drive\.google|docs\.google|googleusercontent/.test(url) ? (m[1] ?? null) : null;
}

/** Displayable thumbnail URL (Drive links are converted, others used as-is). */
export function thumbUrl(url: string, size = 800): string {
  const id = driveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${size}` : url;
}

/** Merges the images tab and activity-report photos, de-duplicated by link. */
export function buildGallery(images: ImageRef[], activities: ActivityRecord[]): GalleryPhoto[] {
  const seen = new Set<string>();
  const out: GalleryPhoto[] = [];
  const add = (p: Omit<GalleryPhoto, "thumb">) => {
    const key = driveId(p.url) ?? p.url;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...p, thumb: thumbUrl(p.url) });
  };
  for (const a of activities) {
    if (!a.image) continue;
    for (const url of a.image.split(/[\s,]+/).filter((u) => /^https?:\/\//.test(u)))
      add({ url, department: a.department, file: a.file, center: a.center, date: a.date, activity: a.name });
  }
  for (const i of images) add({ url: i.url, department: i.department, file: i.file, center: "", date: null, activity: "" });
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
