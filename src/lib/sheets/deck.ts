// Pure: builds the live goals presentation from Master Plan + center-plan data.
import { normalizeArabic } from "./normalize";
import type { CenterPlan, PlanItem, PlanSheet } from "./types";

export interface DeckGoal {
  item: string;
  /** Goal heading this item belongs to, when the source keeps one. */
  goal?: string | undefined;
  target: number | null;
  achieved: number | null;
  /** Achieved ÷ yearly target, uncapped. */
  pct: number | null;
  centers: { center: string; achieved: number; target: number }[];
}
export interface DeckSlide { title: string; goals: DeckGoal[] }

export function buildDeck(plans: PlanSheet[], centerPlans: CenterPlan[]): { year: number | null; slides: DeckSlide[] } {
  const year = plans.length ? Math.max(...plans.map((p) => p.year)) : null;
  const items = plans.filter((p) => p.year === year).flatMap((p) => p.items);
  const slides: DeckSlide[] = [];
  for (const i of items) {
    if (i.totalTarget === null && i.achieved === null) continue;
    let s = slides.find((x) => x.title === i.goal);
    if (!s) slides.push((s = { title: i.goal, goals: [] }));
    const byCenter = new Map<string, { achieved: number; target: number }>();
    for (const cp of centerPlans.filter((c) => c.year === year)) {
      const m = cp.items.find((x) => normalizeArabic(x.item) === normalizeArabic(i.item));
      if (!m) continue;
      const cur = byCenter.get(cp.center) ?? { achieved: 0, target: 0 };
      cur.achieved += m.achieved ?? 0;
      cur.target += m.target ?? 0;
      byCenter.set(cp.center, cur);
    }
    s.goals.push({
      item: i.item,
      goal: i.goal,
      target: i.totalTarget,
      achieved: i.achieved,
      pct: i.totalTarget && i.achieved !== null ? Math.round((i.achieved / i.totalTarget) * 100) : null,
      centers: [...byCenter].map(([center, v]) => ({ center, ...v })).sort((a, b) => b.achieved - a.achieved),
    });
  }
  return { year, slides };
}

/** One slide per center: its own goal items with the quarterly targets/achievements summed. */
export function buildCenterDeck(centerPlans: CenterPlan[]): { year: number | null; slides: DeckSlide[] } {
  const year = centerPlans.length ? Math.max(...centerPlans.map((c) => c.year)) : null;
  if (year === null) return { year: null, slides: [] };
  type Acc = { item: string; goal: string; target: number; achieved: number };
  const byCenter = new Map<string, Map<string, Acc>>();
  for (const cp of centerPlans.filter((c) => c.year === year)) {
    const items = byCenter.get(cp.center) ?? new Map();
    byCenter.set(cp.center, items);
    for (const it of cp.items) {
      if (!it.target) continue; // an item without a target is a tally, not a goal
      const key = `${normalizeArabic(it.goal)}\u0000${normalizeArabic(it.item)}`;
      const cur = items.get(key) ?? { item: it.item, goal: it.goal, target: 0, achieved: 0 };
      cur.target += it.target;
      cur.achieved += it.achieved ?? 0;
      items.set(key, cur);
    }
  }
  const slides: DeckSlide[] = [];
  for (const [center, items] of byCenter) {
    const goals: DeckGoal[] = [...items.values()]
      .map((v) => ({
        item: v.item,
        goal: v.goal || undefined,
        target: v.target,
        achieved: v.achieved,
        pct: Math.round((v.achieved / v.target) * 100),
        centers: [{ center, achieved: v.achieved, target: v.target }],
      }))
      .sort((a, b) => (b.achieved ?? 0) - (a.achieved ?? 0));
    if (goals.length) slides.push({ title: center, goals });
  }
  const sum = (s: DeckSlide) => s.goals.reduce((a, g) => a + (g.achieved ?? 0), 0);
  return { year, slides: slides.sort((a, b) => sum(b) - sum(a)) };
}

export interface DeckSummary {
  year: number | null;
  /** Distinct goal headings that carry at least one counted item. */
  goals: number;
  /** Goal items with both a yearly target and a recorded achievement. */
  items: number;
  /** Mean of per-item achievement, each capped at 100%. */
  avgPct: number | null;
  onTrack: number;
  behind: number;
  topCenters: { center: string; pct: number | null; achieved: number; target: number }[];
}

/** Overall picture of the newest plan year, derived the same way the dashboard average is. */
export function buildSummary(plans: PlanSheet[], centerPlans: CenterPlan[]): DeckSummary {
  const year = plans.length ? Math.max(...plans.map((p) => p.year)) : null;
  const items = plans
    .filter((p) => p.year === year)
    .flatMap((p) => p.items)
    .filter((i): i is PlanItem & { totalTarget: number; achieved: number } => i.totalTarget !== null && i.achieved !== null);
  const pcts = items.map((i) => Math.min(100, Math.round((i.achieved / i.totalTarget) * 100)));
  const byCenter = new Map<string, { pcts: number[]; achieved: number; target: number }>();
  for (const cp of centerPlans.filter((c) => c.year === year)) {
    for (const it of cp.items) {
      if (it.target === null || it.achieved === null) continue;
      const cur = byCenter.get(cp.center) ?? { pcts: [], achieved: 0, target: 0 };
      cur.pcts.push(Math.min(100, Math.round((it.achieved / it.target) * 100)));
      cur.achieved += it.achieved;
      cur.target += it.target;
      byCenter.set(cp.center, cur);
    }
  }
  return {
    year,
    goals: new Set(items.map((i) => i.goal)).size,
    items: items.length,
    avgPct: pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null,
    onTrack: pcts.filter((p) => p >= 100).length,
    behind: pcts.filter((p) => p < 50).length,
    topCenters: [...byCenter]
      .map(([center, v]) => ({
        center,
        achieved: v.achieved,
        target: v.target,
        pct: v.pcts.length ? Math.round(v.pcts.reduce((s, x) => s + x, 0) / v.pcts.length) : null,
      }))
      .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)),
  };
}
