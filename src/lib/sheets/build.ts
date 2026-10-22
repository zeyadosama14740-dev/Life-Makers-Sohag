// Assemble a Dataset from already-fetched tabs (pure; testable).
import {
  classifyTab,
  parseActivities,
  parseExpenses,
  parseImages,
  parseMasterPlan,
  parseVolunteers,
  parseCenterPlan,
  parsePartnerships,
  type Grid,
} from "./process";
import { normalizeArabic } from "./normalize";
import { mappedGrid, type SourceConfig } from "./source-config";
import type { Dataset, SourceCategory, SourceStatus, VolunteerStage } from "./types";

export interface FetchedSource {
  id: string;
  label: string;
  year: number;
  category: SourceCategory;
  tabs: { title: string; grid: Grid }[];
  error?: string | undefined;
  config?: SourceConfig;
}

const STAGES: VolunteerStage[] = ["جذب", "استقبال", "تسكين", "تفعيل"];

export function buildDataset(sources: FetchedSource[]): Dataset {
  const ds: Dataset = {
    generatedAt: new Date().toISOString(),
    sources: [],
    activities: [],
    metricLabels: [],
    volunteers: parseVolunteers({}),
    plans: [],
    expenses: [],
    images: [],
    centerPlans: [],
    partnerships: [],
    quality: [],
  };
  const stageGrids: Partial<Record<VolunteerStage, Grid[]>> = {};

  for (const src of sources) {
    const status: SourceStatus = {
      id: src.id,
      label: src.label,
      year: src.year,
      category: src.category,
      ok: !src.error,
      error: src.error,
      tabs: [],
    };
    for (const original of src.tabs) {
      const config = src.config?.tabs?.[original.title];
       const tab = { title: config?.stage ?? (config?.kind === "volunteers" ? "جذب" : config?.kind === "placement" ? "تسكين" : original.title), grid: mappedGrid(original.grid, config) };
      const detected = classifyTab(tab.title, tab.grid);
      const kind = config?.kind === "unused" || config?.kind === "participations" ? "unused" : config?.kind === "volunteers" || config?.kind === "placement" ? "volunteer_stage" : config?.kind && config.kind !== "auto" ? config.kind : detected;
      status.tabs.push({ title: tab.title, kind, rows: Math.max(0, tab.grid.length - 1) });
      if (kind === "activities") ds.activities.push(...parseActivities(tab.grid, src.label));
      else if (kind === "volunteer_stage") {
        const stage = STAGES.find((s) => normalizeArabic(s) === normalizeArabic(tab.title));
        if (stage) (stageGrids[stage] ??= []).push(tab.grid);
      } else if (kind === "master_plan") ds.plans.push(parseMasterPlan(tab.grid, src.year, src.label));
      else if (kind === "expenses") ds.expenses.push(parseExpenses(tab.grid, src.label));
      else if (kind === "images") ds.images.push(...parseImages(tab.grid));
      else if (kind === "center_plan") ds.centerPlans.push(...parseCenterPlan(tab.title, tab.grid, src.year));
      else if (kind === "partnerships") ds.partnerships.push(...parsePartnerships(tab.grid));
    }
    ds.sources.push(status);
  }

  ds.volunteers = parseVolunteers(stageGrids);
  const labels = new Map<string, number>();
  ds.activities.forEach((a) => Object.entries(a.metrics).forEach(([k, v]) => labels.set(k, (labels.get(k) ?? 0) + v)));
  ds.metricLabels = [...labels.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const missingDate = ds.activities.filter((a) => !a.date).length;
  const missingType = ds.activities.filter((a) => a.file === "أنشطة عامة").length;
  const missingBen = ds.activities.filter((a) => !a.beneficiaries).length;
  const missingTargets = ds.plans.flatMap((p) => p.items).filter((i) => !i.targetToDate && !i.totalTarget).length;
  ds.quality = [
    { label: "تقارير بدون تاريخ تنفيذ", count: missingDate },
    { label: "تقارير بدون نوع نشاط", count: missingType },
    { label: "تقارير بدون عدد مستفيدين", count: missingBen },
    { label: "متطوعين مكررين (جذب)", count: ds.volunteers.duplicates },
    { label: "متطوعين بدون رقم قومي أو كود", count: ds.volunteers.missingId },
    { label: "بنود خطة بدون مستهدف", count: missingTargets },
    { label: "مصادر بها أخطاء", count: ds.sources.filter((s) => !s.ok).length },
  ];
  return ds;
}
