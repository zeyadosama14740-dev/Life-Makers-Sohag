// Pure: merge volunteer rows from the stage tabs into one profile per person.
import { normalizeArabic, normalizeCenter, parseDate, toNumber } from "./normalize";
import type { Grid } from "./process";
import type { ActivityRecord, VolunteerStage } from "./types";
import { cleanDigits, inspectNationalId, genderConflict, ageGroup } from "./identity";

export const STAGES: VolunteerStage[] = ["جذب", "استقبال", "تسكين", "تفعيل"];

export interface VolunteerSummary {
  key: string;
  name: string;
  phone: string;
  nationalId: string;
  code: string;
  center: string;
  gender: string;
  age: number | null;
  registeredAt: string | null;
  stages: Record<VolunteerStage, boolean>;
  placementFile: string;
  volunteerId?: string | undefined;
  inferredGender?: string;
  birthDate?: string | null;
  ageGroup?: string;
  identityValid?: boolean;
  genderConflict?: boolean;
}

export interface VolunteerProfile extends VolunteerSummary {
  stageDetails: { stage: VolunteerStage; repeats?: number; fields: { label: string; value: string }[] }[];
  activities: Pick<ActivityRecord, "id" | "date" | "department" | "file" | "name" | "center">[];
}

const pick = (head: string[], row: string[], ...patterns: RegExp[]) => {
  for (const p of patterns) {
    const i = head.findIndex((h) => p.test(h ?? ""));
    if (i >= 0 && (row[i] ?? "").trim()) return (row[i] ?? "").trim();
  }
  return "";
};

const digits = cleanDigits;

export function buildVolunteerProfiles(stageGrids: { stage: VolunteerStage; grid: Grid; sourceId?: string }[]) {
  const map = new Map<string, VolunteerProfile>();
  for (const { stage, grid, sourceId } of stageGrids) {
    const head = grid[0] ?? [];
    grid.slice(1).forEach((row, index) => {
      if (!row.some((v) => v && v.trim())) return;
      const nationalId = digits(pick(head, row, /الرقم القوم/));
      const code = pick(head, row, /كود المتطوع/).replace(/\s/g, "");
      const name = pick(head, row, /الاسم باللغة العربية/, /الاسم رباعي/, /^الاسم/);
      const identity = inspectNationalId(nationalId);
      const sourceUuid = pick(head, row, /^_uuid$/, /rootUuid/);
      // Invalid IDs and similar names must never automatically merge different people.
      const key = identity.valid ? `nid:${nationalId}` : code ? `code:${code}` : `source:${sourceId ?? "legacy"}:${stage}:${sourceUuid || `row:${index + 2}`}`;
      const p =
        map.get(key) ??
        ({
          key,
          name: "",
          phone: "",
          nationalId: "",
          code: "",
          center: "غير محدد",
          gender: "",
          age: null,
          registeredAt: null,
          stages: { جذب: false, استقبال: false, تسكين: false, تفعيل: false },
          placementFile: "",
          stageDetails: [],
          activities: [],
        } satisfies VolunteerProfile);
      p.name ||= name;
      p.nationalId ||= nationalId;
      p.code ||= code;
      p.phone ||= pick(head, row, /رقم الموبايل/, /رقم الهاتف/, /رقم الواتساب/);
      p.gender ||= pick(head, row, /^النوع$/);
      p.age ??= toNumber(pick(head, row, /^السن$/, /^العمر$/));
      p.identityValid = identity.valid;
      p.inferredGender = identity.gender;
      p.birthDate = identity.birthDate;
      if (identity.age !== null) p.age = identity.age;
      p.ageGroup = ageGroup(p.age);
      p.genderConflict = genderConflict(p.gender, identity.gender);
      const center = pick(head, row, /المركز \/ المدينة/, /المركز \/ القسم/);
      if (center && p.center === "غير محدد") p.center = normalizeCenter(center);
      if (stage === "جذب") p.registeredAt ??= parseDate(pick(head, row, /تاريخ ملئ الاستمارة/));
      if (stage === "تسكين") p.placementFile ||= pick(head, row, /اختر الملف الأساس/, /الحملة/);
      p.stages[stage] = true;
      const existing = p.stageDetails.find((d) => d.stage === stage);
      if (existing) {
        existing.repeats = (existing.repeats ?? 1) + 1;
        map.set(key, p);
        return;
      }
      p.stageDetails.push({
        stage,
        fields: head
          .map((label, i) => ({ label: (label ?? "").trim(), value: (row[i] ?? "").trim() }))
          .filter((f) => f.label && f.value && !/^_|uuid/i.test(f.label)),
      });
      map.set(key, p);
    });
  }
  return [...map.values()];
}

/** Activity reports only carry the reporter's name, so match on the first two name parts. */
export function matchActivities(name: string, acts: ActivityRecord[]) {
  const parts = normalizeArabic(name).split(" ").filter(Boolean);
  if (parts.length < 2) return [];
  const prefix = parts.slice(0, 2).join(" ");
  return acts
    .filter((a) => a.reporter && normalizeArabic(a.reporter).startsWith(prefix))
    .map(({ id, date, department, file, name: n, center }) => ({ id, date, department, file, name: n, center }));
}

export function canSeeCenter(access: { isAdmin: boolean; centers: string[] }, center: string) {
  if (access.isAdmin) return true;
  const c = normalizeArabic(normalizeCenter(center));
  return access.centers.some((x) => normalizeArabic(normalizeCenter(x)) === c);
}

export const toSummary = ({ stageDetails: _s, activities: _a, ...rest }: VolunteerProfile): VolunteerSummary => rest;
