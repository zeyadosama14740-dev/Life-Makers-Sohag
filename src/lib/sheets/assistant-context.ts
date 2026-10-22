// Pure: compact, permission-aware JSON summary given to the AI assistant.
import type { FetchedSource } from "./build";
import { normalizeArabic } from "./normalize";
import type { Dataset } from "./types";
import { buildVolunteerProfiles, canSeeCenter, STAGES } from "./volunteers";

export function buildAssistantContext(
  ds: Dataset,
  raw: FetchedSource[],
  access: { isAdmin: boolean; isCenterManager: boolean; centers: string[] } | null,
) {
  const authorized = !!access && (access.isAdmin || access.isCenterManager);
  let volunteerByCenter: Record<string, Record<string, number>> | undefined;
  if (authorized) {
    const grids = raw.flatMap((s) =>
      s.tabs.flatMap((t) => {
        const stage = STAGES.find((x) => normalizeArabic(x) === normalizeArabic(t.title));
        return stage ? [{ stage, grid: t.grid }] : [];
      }),
    );
    volunteerByCenter = {};
    for (const p of buildVolunteerProfiles(grids)) {
      if (!canSeeCenter(access!, p.center)) continue;
      const c = (volunteerByCenter[p.center] ??= { جذب: 0, استقبال: 0, تسكين: 0, تفعيل: 0 });
      STAGES.forEach((s) => p.stages[s] && (c[s] = (c[s] ?? 0) + 1));
    }
  }
  return JSON.stringify({
    today: new Date().toISOString().slice(0, 10),
    scope: authorized ? (access!.isAdmin ? "كل المراكز" : `المراكز: ${access!.centers.join("، ")}`) : "بيانات عامة",
    activities: ds.activities.map((a) => ({
      date: a.date,
      dept: a.department,
      file: a.file,
      center: a.center,
      beneficiaries: a.beneficiaries,
      volunteers: a.volunteers,
      metrics: a.metrics,
    })),
    volunteerFunnel: ds.volunteers.stages,
    volunteerBreakdown: { byCenter: ds.volunteers.byCenter, byGender: ds.volunteers.byGender, byAge: ds.volunteers.byAge, duplicates: ds.volunteers.duplicates },
    volunteerByCenterAndStage: volunteerByCenter,
    masterPlans: ds.plans.map((p) => ({
      year: p.year,
      title: p.title,
      items: p.items.map((i) => ({ goal: i.goal, item: i.item, total: i.totalTarget, targetToDate: i.targetToDate, achieved: i.achieved, pct: i.pct })),
    })),
    centerPlans: ds.centerPlans.map((c) => ({ q: c.quarter, center: c.center, items: c.items.map((i) => [i.item, i.target, i.achieved, i.pct]) })),
    expenses: ds.expenses,
    partnerships: ds.partnerships.length,
    dataQuality: ds.quality,
  });
}
