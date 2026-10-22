import { describe, expect, it } from "vitest";
import { buildCenterDeck, buildDeck, buildSummary } from "./deck";
import type { CenterPlan } from "./types";

const CENTERS: CenterPlan[] = [
  { year: 2026, quarter: "Q1", quarterLabel: "", center: "طهطا", items: [{ goal: "", item: "طلبات تطوع", target: 10, achieved: 4, pct: null }, { goal: "", item: "زيارات", target: 5, achieved: 5, pct: null }] },
  { year: 2026, quarter: "Q2", quarterLabel: "", center: "طهطا", items: [{ goal: "", item: "طلبات تطوع", target: 10, achieved: 6, pct: null }] },
  { year: 2026, quarter: "Q1", quarterLabel: "", center: "جرجا", items: [{ goal: "", item: "طلبات تطوع", target: 20, achieved: 2, pct: null }] },
];

describe("buildDeck", () => {
  it("groups items by goal, uses the latest year and sums center quarters", () => {
    const item = (goal: string, name: string, t: number, a: number) => ({ goal, item: name, totalTarget: t, targetToDate: t, achieved: a, pct: null, months: [] });
    const d = buildDeck(
      [
        { year: 2025, sourceLabel: "", title: "", department: null, items: [item("قديم", "x", 1, 1)] },
        { year: 2026, sourceLabel: "", title: "", department: null, items: [item("التطوع", "طلبات تطوع", 200, 50), item("التطوع", "استقبال", 100, 100)] },
      ],
      CENTERS,
    );
    expect(d.year).toBe(2026);
    expect(d.slides).toHaveLength(1);
    expect(d.slides[0]?.goals[0]?.pct).toBe(25);
    expect(d.slides[0]?.goals[0]?.centers[0]).toEqual({ center: "طهطا", achieved: 10, target: 20 });
  });
});

describe("buildCenterDeck", () => {
  it("makes one slide per center, summing the same item across quarters", () => {
    const d = buildCenterDeck(CENTERS);
    expect(d.year).toBe(2026);
    expect(d.slides.map((s) => s.title)).toEqual(["طهطا", "جرجا"]);
    expect(d.slides[0]?.goals[0]).toMatchObject({ item: "طلبات تطوع", target: 20, achieved: 10, pct: 50 });
    expect(d.slides[0]?.goals[1]).toMatchObject({ item: "زيارات", target: 5, achieved: 5, pct: 100 });
    expect(d.slides[0]?.goals[0]?.centers).toEqual([{ center: "طهطا", achieved: 10, target: 20 }]);
  });

  it("keeps the same item name separate when it belongs to different goals", () => {
    const d = buildCenterDeck([
      { year: 2026, quarter: "Q1", quarterLabel: "", center: "المراغة", items: [{ goal: "أنشطة الاطفال", item: "عدد المستفيدين", target: 100, achieved: 40, pct: null }, { goal: "زيارات الأيتام", item: "عدد المستفيدين", target: 20, achieved: 5, pct: null }, { goal: "بلا مستهدف", item: "جولات", target: null, achieved: 900, pct: null }] },
    ]);
    expect(d.slides[0]?.goals.map((g) => `${g.goal}/${g.item}:${g.pct}%`)).toEqual([
      "أنشطة الاطفال/عدد المستفيدين:40%",
      "زيارات الأيتام/عدد المستفيدين:25%",
    ]);
  });

  it("returns no slides when there is no center data", () => {
    expect(buildCenterDeck([])).toEqual({ year: null, slides: [] });
  });
});

describe("buildSummary", () => {
  it("averages capped per-item achievement and ranks centers the same way", () => {
    const item = (goal: string, name: string, t: number | null, a: number | null) => ({ goal, item: name, totalTarget: t, targetToDate: t, achieved: a, pct: null, months: [] });
    const s = buildSummary(
      [{ year: 2026, sourceLabel: "", title: "", department: null, items: [item("التطوع", "أ", 100, 50), item("التطوع", "ب", 100, 100), item("الجودة", "ج", 100, 20), item("الجودة", "د", null, null)] }],
      CENTERS,
    );
    expect(s.goals).toBe(2);
    expect(s.items).toBe(3);
    expect(s.avgPct).toBe(57);
    expect(s.onTrack).toBe(1);
    expect(s.behind).toBe(1);
    expect(s.topCenters[0]).toEqual({ center: "طهطا", achieved: 15, target: 25, pct: 67 });
    expect(s.topCenters[1]).toEqual({ center: "جرجا", achieved: 2, target: 20, pct: 10 });
  });

  it("reports nothing measured when no item has both target and achievement", () => {
    const s = buildSummary([{ year: 2026, sourceLabel: "", title: "", department: null, items: [{ goal: "g", item: "i", totalTarget: null, targetToDate: null, achieved: null, pct: null, months: [] }] }], []);
    expect(s).toMatchObject({ goals: 0, items: 0, avgPct: null, onTrack: 0, behind: 0, topCenters: [] });
  });
});
