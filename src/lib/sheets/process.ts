// Pure transforms: raw sheet tabs → dashboard dataset. No network here.
import { normalizeArabic, normalizeCenter, parseDate, toNumber } from "./normalize";
import { ageGroup, inspectNationalId } from "./identity";
import type {
  ActivityRecord,
  CenterPlan,
  Partnership,
  ExpensesSummary,
  ImageRef,
  PlanItem,
  PlanSheet,
  TabKind,
  VolunteerStage,
  VolunteerStats,
} from "./types";

export type Grid = string[][];

const STAGES: VolunteerStage[] = ["جذب", "استقبال", "تسكين", "تفعيل"];

// Headers that must never leave the server (personal contact / identity data).
const PRIVATE_HEADER = /(تليفون|موبايل|واتساب|الرقم القومي|الرقم القومى|جواز|البريد|email|العنوان|بيانات صاحب|_uuid|_id|_submitted_by|rootuuid|__version__|_index|_validation|_status|_submission)/i;

const IGNORE_NUMERIC = /^(start|end|_|meta)/i;

export function findHeader(grid: Grid, header: string): number {
  const row = grid[0] ?? [];
  const target = normalizeArabic(header);
  return row.findIndex((h) => normalizeArabic(h) === target);
}

export function classifyTab(title: string, grid: Grid): TabKind {
  const t = normalizeArabic(title);
  if (STAGES.some((s) => normalizeArabic(s) === t)) return "volunteer_stage";
  if (t === "images" || t === "الصور") return "images";
  if (t.includes("مصروفات")) return "expenses";
  if (t.includes("شراكات")) return "partnerships";
  if (t.includes("مراكز") && /q\s*\d/.test(t)) return "center_plan";
  const head = (grid[0] ?? []).map(normalizeArabic);
  if (head.includes(normalizeArabic("الإدارة")) && head.includes(normalizeArabic("نوع النشاط")))
    return "activities";
  if (t === "all year") return "master_plan";
  const firstCol = grid.slice(0, 6).map((r) => normalizeArabic(r[0]));
  if (!t.includes("مراكز") && firstCol.includes(normalizeArabic("الاهداف"))) return "master_plan";
  return "unused";
}

const cell = (row: string[] | undefined, i: number) => (i >= 0 && row ? (row[i] ?? "").trim() : "");

export function parseActivities(grid: Grid, sourceLabel: string): ActivityRecord[] {
  const h = grid[0] ?? [];
  const idx = (name: string) => findHeader(grid, name);
  const iDept = idx("الإدارة");
  const iType = idx("نوع النشاط");
  const iName = idx("اكتب اسم النشاط");
  const iTitle = idx("اسم / عنوان النشاط");
  const iDate = idx("تاريخ تنفيذ النشاط");
  const iCenter = idx("المركز / القرية");
  const iReporter = idx("اسم مقدّم التقرير");
  const iPlace = idx("مكان تنفيذ النشاط");
  const iImg = idx("صورة توثيقية_URL");
  const iUuid = idx("_uuid");
  const iBenTotal = idx("beneficiaries_total");
  const iBen = idx("كام مستفيد من النشاط؟");
  const iVolTotal = idx("volunteers_total");
  const iVol = idx("كام متطوع شارك؟");
  const iNew = idx("كام متطوع جديد شارك؟");
  const iOld = idx("كام متطوع قديم شارك؟");
  const core = new Set([iDept, iType, iName, iTitle, iDate, iCenter, iReporter, iPlace, iImg, iBenTotal, iBen, iVolTotal, iVol, iNew, iOld]);

  const seen = new Set<string>();
  const out: ActivityRecord[] = [];
  grid.slice(1).forEach((row, n) => {
    if (!row.some((v) => v && v.trim())) return;
    const uuid = cell(row, iUuid);
    if (uuid && seen.has(uuid)) return; // duplicated submission rows
    if (uuid) seen.add(uuid);
    const metrics: Record<string, number> = {};
    const details: Record<string, string> = {};
    h.forEach((header, i) => {
      if (core.has(i) || !header || PRIVATE_HEADER.test(header)) return;
      const v = cell(row, i);
      if (!v) return;
      const num = toNumber(v);
      if (num !== null && !IGNORE_NUMERIC.test(header)) metrics[header.trim()] = num;
      else if (num === null) details[header.trim()] = v;
    });
    const ben = toNumber(cell(row, iBenTotal)) ?? toNumber(cell(row, iBen)) ?? 0;
    const newV = toNumber(cell(row, iNew)) ?? 0;
    const oldV = toNumber(cell(row, iOld)) ?? 0;
    const vol = toNumber(cell(row, iVolTotal)) ?? toNumber(cell(row, iVol)) ?? newV + oldV;
    out.push({
      id: uuid || `${sourceLabel}-${n + 2}`,
      date: parseDate(cell(row, iDate)),
      department: cell(row, iDept) || "غير محدد",
      file: cell(row, iType) || "أنشطة عامة",
      center: normalizeCenter(cell(row, iCenter)),
      reporter: cell(row, iReporter),
      name: cell(row, iName) || cell(row, iTitle),
      place: cell(row, iPlace),
      beneficiaries: ben,
      volunteers: vol,
      newVolunteers: newV,
      oldVolunteers: oldV,
      metrics,
      details,
      image: /^https?:\/\//.test(cell(row, iImg)) ? cell(row, iImg) : null,
      sourceLabel,
    });
  });
  return out;
}

function countBy(values: string[], limit = 12) {
  const m = new Map<string, number>();
  values.forEach((v) => {
    const k = v || "غير محدد";
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function splitMulti(values: string[]) {
  // Kobo-style multi-select cells are space-joined; split on known separators only.
  return values.flatMap((v) => v.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean));
}

export function parseVolunteers(stageGrids: Partial<Record<VolunteerStage, Grid[]>>): VolunteerStats {
  const stages: VolunteerStats["stages"] = [];
  let duplicates = 0;
  let missingId = 0;
  let attract: string[][] = [];
  let attractHead: string[] = [];
  let placementFiles: string[] = [];

  for (const stage of STAGES) {
    const grids = stageGrids[stage] ?? [];
    let count = 0;
    const ids = new Set<string>();
    for (const g of grids) {
      const rows = g.slice(1).filter((r) => r.some((v) => v && v.trim()));
      const iId = (g[0] ?? []).findIndex((x) => /الرقم القوم/.test(x));
      const iCode = findHeader(g, "كود المتطوع");
      count += rows.length;
      rows.forEach((r) => {
        const key = (cell(r, iId) || cell(r, iCode)).replace(/\s/g, "");
        if (!key) {
          if (stage === "جذب") missingId++;
          return;
        }
        if (ids.has(key)) {
          if (stage === "جذب") duplicates++;
        } else ids.add(key);
      });
      if (stage === "جذب") {
        attract = attract.concat(rows);
        attractHead = g[0] ?? [];
      }
      if (stage === "تسكين") {
        const iFile = (g[0] ?? []).findIndex((x) => x.includes("اختر الملف الأساسى") || x.includes("اختر الملف الأساسي"));
        placementFiles = placementFiles.concat(rows.map((r) => cell(r, iFile)).filter(Boolean));
      }
    }
    stages.push({ stage, count, unique: ids.size || count });
  }

  const col = (name: string) => attractHead.findIndex((x) => normalizeArabic(x) === normalizeArabic(name));
  const iCenter = col("المركز / المدينة");
  const iGender = col("النوع");
  const iAge = col("السن");
  const iSrc = col("عرفت صناع الحياة إزاي ؟");

  const ageBucket = (v: string) => {
    const n = toNumber(v);
    if (n === null || n <= 0 || n > 90) return "غير محدد";
    if (n < 18) return "أقل من 18";
    if (n <= 24) return "18 - 24";
    return ageGroup(n);
  };

  return {
    stages,
    byCenter: countBy(attract.map((r) => normalizeCenter(cell(r, iCenter)))),
    byGender: countBy(attract.map((r) => cell(r, iGender)), 4),
    byAge: countBy(attract.map((r) => ageBucket(cell(r, iAge))), 8),
    bySource: countBy(attract.map((r) => cell(r, iSrc)), 8),
    preferredFiles: countBy(splitMulti(placementFiles), 10),
    duplicates,
    missingId,
  };
}

/** Parse the "ALL YEAR" master plan layout: goal | item | total | target | achieved | pct | months… */
export function parseMasterPlan(grid: Grid, year: number, sourceLabel: string): PlanSheet {
  const headerRow = grid.findIndex((r) => normalizeArabic(r[0]) === normalizeArabic("الاهداف"));
  const titleRow = grid.find((r) => (r[0] ?? "").includes("خطة")) ?? [];
  const title = (titleRow[0] ?? "الماستر بلان").trim();
  const deptMatch = title.match(/(إدارة|ادارة)\s+[^\d]+?(?=\s*\d|$)/);
  const monthRow = grid[1] ?? [];
  const kindRow = grid[2] ?? [];

  const monthCols: { label: string; col: number }[] = [];
  monthRow.forEach((label, j) => {
    const l = (label ?? "").trim();
    if (j >= 6 && l && !/^q/i.test(l) && normalizeArabic(kindRow[j]) === normalizeArabic("مستهدف")) {
      monthCols.push({ label: l, col: j });
    }
  });

  const items: PlanItem[] = [];
  let goal = "";
  for (const r of grid.slice(headerRow + 1)) {
    if (r[0]?.trim()) goal = r[0].trim();
    const item = (r[1] ?? "").trim();
    if (!item) continue;
    const totalTarget = toNumber(r[2]);
    const targetToDate = toNumber(r[3]);
    const achieved = toNumber(r[4]);
    const pct = targetToDate && achieved !== null ? Math.round((achieved / targetToDate) * 100) : null;
    items.push({
      goal,
      item,
      totalTarget,
      targetToDate,
      achieved,
      pct,
      months: monthCols.map(({ label, col }) => ({
        label,
        target: toNumber(r[col]),
        achieved: toNumber(r[col + 1]),
      })),
    });
  }
  return {
    year,
    sourceLabel,
    title,
    department: deptMatch ? deptMatch[0].replace(/^ادارة/, "إدارة").trim() : null,
    items,
  };
}

export function parseExpenses(grid: Grid, sourceLabel: string): ExpensesSummary {
  const flat = grid.slice(0, 3).flat();
  const after = (label: string) => {
    const i = flat.findIndex((v) => (v ?? "").includes(label));
    return i >= 0 ? toNumber(flat[i + 1]) : null;
  };
  return {
    sourceLabel,
    spent: after("مبالغ تم صرفها"),
    received: after("مبالغ مستلمة"),
    remaining: after("مبالغ متبقية"),
  };
}

export function parseImages(grid: Grid): ImageRef[] {
  const iD = findHeader(grid, "الإدارة");
  const iF = findHeader(grid, "الملف");
  const iU = (grid[0] ?? []).findIndex((x) => x.includes("رابط"));
  return grid
    .slice(1)
    .map((r) => ({ department: cell(r, iD), file: cell(r, iF), url: cell(r, iU) }))
    .filter((x) => /^https?:\/\//.test(x.url));
}

/**
 * Quarterly per-center tab: row0 holds center names at each block start,
 * row1 month / "Qn x%" labels, row2 مستهدف|محقق|نسبة. Each block = 3 months + quarter total.
 */
export function parseCenterPlan(title: string, grid: Grid, year: number): CenterPlan[] {
  const quarter = (title.match(/Q\s*\d/i)?.[0] ?? title).replace(/\s/g, "").toUpperCase();
  const r0 = grid[0] ?? [];
  const r1 = grid[1] ?? [];
  const headerRow = grid.findIndex((r) => normalizeArabic(r[0]) === normalizeArabic("الاهداف"));
  const body = grid.slice(headerRow + 1);
  const starts: { col: number; name: string }[] = [];
  r0.forEach((v, j) => {
    const name = (v ?? "").trim();
    if (j > 7 && name) starts.push({ col: j, name });
  });
  const out: CenterPlan[] = [];
  starts.forEach(({ col, name }, k) => {
    if (/^مركز\s*\d+$/.test(name)) return; // unused template slot
    const end = starts[k + 1]?.col ?? r0.length + 20;
    let qCol = -1;
    for (let j = col; j < end; j++) if (/^q\s*\d/i.test((r1[j] ?? "").trim())) { qCol = j; break; }
    if (qCol < 0) return;
    let goal = "";
    const items: CenterPlan["items"] = [];
    for (const r of body) {
      if (r[0]?.trim()) goal = r[0].trim();
      const item = (r[1] ?? "").trim();
      if (!item) continue;
      const target = toNumber(r[qCol]);
      const achieved = toNumber(r[qCol + 1]);
      if (!target && !achieved) continue;
      items.push({ goal, item, target, achieved, pct: target && achieved !== null ? Math.round((achieved / target) * 100) : null });
    }
    if (items.length) out.push({ year, quarter, quarterLabel: (r1[qCol] ?? "").trim(), center: normalizeCenter(name), items });
  });
  return out;
}

export function parsePartnerships(grid: Grid): Partnership[] {
  // Two header rows: top-level labels then sub-labels (center/village/... , name/role/phone).
  const top = grid.findIndex((r) => r.some((x) => (x ?? "").includes("اسم الجهة")));
  if (top < 0) return [];
  const h = grid[top] ?? [];
  const sub = grid[top + 1] ?? [];
  const find = (row: string[], label: string) => row.findIndex((x) => normalizeArabic(x).includes(normalizeArabic(label)));
  const iName = find(h, "اسم الجهة");
  const iCenter = find(sub, "المركز");
  const iVillage = find(sub, "القرية");
  const iContact = find(sub, "الاسم");
  const iRole = find(sub, "الدور");
  const iStart = find(h, "تاريخ بداية");
  const iGoal = find(h, "الهدف");
  const iType = find(h, "نوع الشراكة");
  const iActs = find(h, "انشطة");
  return grid
    .slice(top + 2)
    .filter((r) => cell(r, iName))
    .map((r) => ({
      name: cell(r, iName),
      center: cell(r, iCenter),
      village: cell(r, iVillage),
      contactName: cell(r, iContact),
      contactRole: cell(r, iRole),
      startDate: cell(r, iStart),
      goal: cell(r, iGoal),
      type: cell(r, iType),
      activities: cell(r, iActs),
    }));
}
