import { normalizeArabic, normalizeCenter, parseDate, toNumber } from "./normalize";
import { cleanDigits, inspectNationalId } from "./identity";
import type { FetchedSource } from "./build";
import type { VolunteerProfile } from "./volunteers";
import { mappedGrid } from "./source-config";
import { durationHours } from "./participation-time";
export { durationHours } from "./participation-time";

export interface Participation {
 id: string; volunteerKey: string | null; volunteerId: string | null; name: string; center: string;
 activity: string; project: string; department: string; file: string; date: string | null;
  startTime: string; endTime: string; startDate: string | null; endDate: string | null; hoursSource: "duration" | "reported" | "missing";
 hours: number | null; attendance: string; approved: boolean; source: string; sourceId: string;
 issues: string[];
}
export function parseParticipations(sources: FetchedSource[], profiles: VolunteerProfile[]): Participation[] {
 const identities = new Map<string, VolunteerProfile[]>();
 profiles.forEach(p => {
  for (const key of [p.identityValid ? `nid:${p.nationalId}` : "", p.code ? `code:${p.code}` : ""].filter(Boolean)) identities.set(key,[...(identities.get(key)??[]),p]);
 });
 const out: Participation[] = []; const seen = new Set<string>();
 for (const source of sources) for (const tab of source.tabs) {
  const config = source.config?.tabs?.[tab.title];
  const grid = mappedGrid(tab.grid, config); const headers = grid[0] ?? [];
  if (config?.kind === "unused") continue;
  if (config?.kind !== "participations" && !headers.some(h=>/total_hours_raw|عدد الساعات|بداية الوقت/.test(h))) continue;
  const approvalHeader = config?.mapping.approval;
  const validationMappedAsApproval = !!approvalHeader && /validation|التحقق/.test(normalizeArabic(approvalHeader));
  const pick = (row: string[], ...patterns: RegExp[]) => {
   for(const pattern of patterns) {const i=headers.findIndex(h=>pattern.test(normalizeArabic(h)));if(i>=0 && row[i]?.trim())return row[i]?.trim()??"";} return "";
  };
  for(const row of grid.slice(1)) {
   if(!row.some(Boolean))continue;
   const nationalId=cleanDigits(pick(row,/الرقم القوم/));const code=pick(row,/كود المتطوع/);
   const key=inspectNationalId(nationalId).valid?`nid:${nationalId}`:code?`code:${code}`:"";
   const matches=identities.get(key)??[];const profile=matches.length===1?matches[0]:undefined;
   const sourceUuid=pick(row,/^_uuid$/, /rootuuid/);
   const id=`${source.id}:${sourceUuid || JSON.stringify(row)}`;
   if(seen.has(id))continue;seen.add(id);
    const startTime=pick(row,/بدايه الوقت/,/^start_time$/, /^start$/);const endTime=pick(row,/نهايه الوقت/,/^end_time$/, /^end$/);
    const startDate=parseDate(pick(row,/تاريخ البدايه/,/^start_date$/)) ?? parseDate(startTime);
    const endDate=parseDate(pick(row,/تاريخ النهايه/,/^end_date$/)) ?? parseDate(endTime);
    const explicitHours=toNumber(pick(row,/^عدد الساعات$/, /^total_hours_raw$/)) ?? (()=>{const h=toNumber(pick(row,/^hours$/));const m=toNumber(pick(row,/^minutes$/));return h===null&&m===null?null:(h??0)+(m??0)/60;})();
    const computedHours=durationHours(startTime,endTime,startDate ?? "",endDate ?? "");
    const hours=computedHours ?? explicitHours;
    const hoursSource=computedHours!==null?"duration":explicitHours!==null?"reported":"missing";
   const approval=validationMappedAsApproval ? "" : normalizeArabic(pick(row,/حاله الاعتماد/, /اعتماد المشاركه/));
   // Kobo validation metadata is not an operational approval of attendance or hours.
   const approved=/^(معتمد|معتمده|approved|نعم)$/.test(approval);
   const attendance=pick(row,/حاله الحضور/, /^الحضور$/) || "غير محدد";
   const date=parseDate(pick(row,/تاريخ النشاط/, /تاريخ المشاركه/, /تاريخ ملئ الاستماره/)) ?? startDate;
   const issues=[];
   if(!profile)issues.push(matches.length>1?"هوية مرتبطة بأكثر من ملف":"مشاركة بلا متطوع مرتبط");
   if(!date)issues.push("تاريخ المشاركة غير متاح");
   if(startTime && endTime && computedHours===null)issues.push("بداية أو نهاية غير صالحة لحساب المدة");
   if(computedHours!==null && explicitHours!==null && Math.abs(computedHours-explicitHours)>0.01)issues.push("الساعات المسجلة تختلف عن مدة البداية والنهاية");
   if(hours===null)issues.push("الساعات غير متاحة");else if(hours<0||hours>24)issues.push("الساعات تحتاج مراجعة");
   if(!approved)issues.push("الساعات غير معتمدة");
   out.push({id,volunteerKey:profile?.key??null,volunteerId:profile?.volunteerId??null,name:profile?.name||pick(row,/اسم المتطوع/, /الاسم/),center:profile?.center??normalizeCenter(pick(row,/^المركز$/, /المركز.*المدينه/)),activity:pick(row,/اسم النشاط/, /نوع النشاط/),project:pick(row,/اسم المشروع/),department:pick(row,/اسم الوحده/, /^الاداره$/),file:pick(row,/اسم الحمله/, /الملف/),date,startTime,endTime,startDate,endDate,hoursSource,hours,attendance,approved:approved && hours!==null && hours>=0 && hours<=24,source:source.label,sourceId:source.id,issues});
  }
 }
 return out;
}
export function approvedTotals(rows: Participation[]) {
 const actual=rows.filter(r=>r.approved && /^(حضر|حاضر|تم الحضور|attended|present)$/i.test(r.attendance));
 return {participations:actual.length,hours:Math.round(actual.reduce((sum,r)=>sum+(r.hours??0),0)*100)/100};
}