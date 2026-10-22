import { normalizeArabic, parseDate } from "./normalize";
import { z } from "zod";
export const FIELD_LABELS = {
  name: "الاسم باللغة العربية", nationalId: "الرقم القومي", code: "كود المتطوع", phone: "رقم الموبايل",
  center: "المركز / المدينة", gender: "النوع", age: "السن", date: "تاريخ ملئ الاستمارة", file: "اختر الملف الأساسي",
  startTime: "بداية الوقت", endTime: "نهاية الوقت", startDate: "تاريخ البداية", endDate: "تاريخ النهاية",
  department: "الإدارة", activity: "نوع النشاط", hours: "عدد الساعات", attendance: "حالة الحضور", approval: "حالة الاعتماد",
} as const;
export type MappingField = keyof typeof FIELD_LABELS;
export interface TabConfig { kind: "auto" | "volunteers" | "participations" | "placement" | "activities" | "master_plan" | "expenses" | "unused"; stage?: string; mapping: Partial<Record<MappingField, string>>; selectedColumns?: string[]; dateFrom?: string; dateTo?: string; }
export interface SourceConfig { tabs?: Record<string, TabConfig>; priority?: "primary" | "assistant"; matchKey?: "nationalId" | "code"; relationship?: "additional" | "new"; }
const dateBoundary = z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, "تاريخ غير صالح");
export const sourceConfigSchema = z.object({
  tabs: z.record(z.string().max(200), z.object({
    kind: z.enum(["auto","volunteers","participations","placement","activities","master_plan","expenses","unused"]),
    stage: z.enum(["جذب","استقبال","تسكين","تفعيل"]).optional(),
    mapping: z.object(Object.fromEntries(Object.keys(FIELD_LABELS).map(key => [key,z.string().max(300).optional()]))),
    selectedColumns: z.array(z.string().max(300)).max(500).optional(),
    dateFrom: dateBoundary.optional(), dateTo: dateBoundary.optional(),
  }).refine(t => !t.dateFrom || !t.dateTo || t.dateFrom <= t.dateTo, "تاريخ النهاية يجب ألا يسبق البداية")).optional(),
  priority: z.enum(["primary","assistant"]).optional(), matchKey: z.enum(["nationalId","code"]).optional(), relationship: z.enum(["additional","new"]).optional(),
});
export function suggestMapping(headers: string[]): TabConfig["mapping"] {
  const patterns: Record<MappingField, RegExp> = { name: /الاسم|اسم المتطوع/, nationalId: /الرقم القوم/, code: /كود المتطوع/, phone: /موبايل|هاتف|تليفون|واتساب/, center: /المركز|المدينه/, gender: /^النوع$|الجنس/, age: /^السن$|^العمر$/, date: /تاريخ.*(تسجيل|استماره|مشاركه|تنفيذ|نشاط)|^date$/, startTime: /بدايه.*(وقت|ساعه)|^start_time$|^start$/, endTime: /نهايه.*(وقت|ساعه)|^end_time$|^end$/, startDate: /تاريخ البدايه|^start_date$/, endDate: /تاريخ النهايه|^end_date$/, file: /الملف/, department: /الاداره/, activity: /نوع النشاط|اسم النشاط|الفعاليه/, hours: /ساعات|^total_hours_raw$/, attendance: /حضور/, approval: /اعتماد|معتمد/ };
  return Object.fromEntries(Object.entries(patterns).flatMap(([field, regex]) => {
    const preferred = field === "startTime" ? headers.find(h=>normalizeArabic(h)==="بدايه الوقت") : field === "endTime" ? headers.find(h=>normalizeArabic(h)==="نهايه الوقت") : undefined;
    const found = preferred ?? headers.find((h) => regex.test(normalizeArabic(h)));
    return found ? [[field, found]] : [];
  }));
}
export function mappedGrid(grid: string[][], config?: TabConfig) {
  if (!config) return grid;
  const headers = grid[0] ?? [];
  const indices = headers.flatMap((h,i) => !config.selectedColumns || config.selectedColumns.includes(h) ? [i] : []);
  const replacements = new Map(Object.entries(config.mapping).filter(([,h])=>!!h).map(([field, header]) => {
    const label = field === "date" && config.kind === "activities" ? "تاريخ تنفيذ النشاط" : field === "center" && config.kind === "activities" ? "المركز / القرية" : FIELD_LABELS[field as MappingField];
    return [header,label];
  }));
  const mappedHeaders = indices.map(i => replacements.get(headers[i] ?? "") ?? headers[i] ?? "");
  const rows = grid.slice(1).map(row=>indices.map(i=>row[i] ?? ""));
  const dated = rows.filter(row=>{
    if (!config.dateFrom && !config.dateTo) return true;
    const dateIndex = mappedHeaders.findIndex(h => /تاريخ.*(استماره|تسجيل|مشاركه|نشاط|تنفيذ)|^date$/.test(normalizeArabic(h)));
    const startIndex = mappedHeaders.findIndex(h => /تاريخ البدايه|بدايه الوقت|^start$|^start_time$/.test(normalizeArabic(h)));
    const date = parseDate(row[dateIndex]) ?? parseDate(row[startIndex]);
    return !!date && (!config.dateFrom || date >= config.dateFrom) && (!config.dateTo || date <= config.dateTo);
  });
  return [mappedHeaders,...dated];
}