import { describe, expect, it } from "vitest";
import { buildGallery, thumbUrl } from "./gallery";
import type { ActivityRecord } from "./types";

const act = (image: string | null, date: string): ActivityRecord => ({
  id: date, date, department: "د", file: "ف", center: "سوهاج", reporter: "", name: "نشاط", place: "",
  beneficiaries: 0, volunteers: 0, newVolunteers: 0, oldVolunteers: 0, metrics: {}, details: {}, image, sourceLabel: "",
});

describe("gallery", () => {
  it("converts Drive share links to thumbnails", () => {
    expect(thumbUrl("https://drive.google.com/open?id=abcdefghijk123")).toBe("https://drive.google.com/thumbnail?id=abcdefghijk123&sz=w800");
  });
  it("de-duplicates the same Drive photo across sources", () => {
    const g = buildGallery(
      [{ department: "د", file: "ف", url: "https://drive.google.com/file/d/abcdefghijk123/view" }],
      [act("https://drive.google.com/open?id=abcdefghijk123", "2026-01-01")],
    );
    expect(g).toHaveLength(1);
    expect(g[0]?.center).toBe("سوهاج");
  });
});
