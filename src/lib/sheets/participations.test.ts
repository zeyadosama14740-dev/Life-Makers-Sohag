import { expect, it } from "vitest";
import { parseParticipations, approvedTotals, durationHours } from "./participations";
it("computes hours from start and end time when explicit hours are missing",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["بداية الوقت","نهاية الوقت","حالة الاعتماد","حالة الحضور"],["14:00:00.000+02:00","17:00:00.000+02:00","معتمد","حضر"]]}]}],[]);
 expect(rows[0]?.hours).toBe(3);expect(approvedTotals(rows).hours).toBe(3);
});
it("calculates full timestamps with offsets across dates",()=>{
 expect(durationHours("2026-10-20T22:30:00+03:00","2026-10-21T01:45:00+03:00")).toBe(3.25);
 expect(durationHours("2026-10-21T12:00:00+03:00","2026-10-20T13:00:00+03:00")).toBeNull();
});
it("uses explicit start/end dates for duration",()=>{
 expect(durationHours("22:30","01:45","2026-10-20","2026-10-21")).toBe(3.25);
 expect(durationHours("12:00","11:00","2026-10-20","2026-10-20")).toBeNull();
});
it("supports Arabic clock digits, seconds and spreadsheet clock fractions",()=>{
 expect(durationHours("١٠:٠٠","١٢:١٥")).toBe(2.25);
 expect(durationHours("10:00:00","10:01:30")).toBe(0.03);
 expect(durationHours("0.5","0.625")).toBe(3);
});
it("uses measured duration rather than conflicting reported hours",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["بداية الوقت","نهاية الوقت","عدد الساعات","حالة الاعتماد","حالة الحضور"],["10:00","12:15","8","معتمد","حضر"]]}]}],[]);
 expect(rows[0]?.hours).toBe(2.25);expect(rows[0]?.hoursSource).toBe("duration");expect(rows[0]?.issues).toContain("الساعات المسجلة تختلف عن مدة البداية والنهاية");expect(approvedTotals(rows).hours).toBe(2.25);
});
it("handles activities crossing midnight and rejects invalid times",()=>{
 expect(durationHours("22:30","01:30")).toBe(3);
 expect(durationHours("10:00","12:15")).toBe(2.25);
 expect(durationHours("","12:00")).toBeNull();
 expect(durationHours("25:00","12:00")).toBeNull();
});
it("registration forms without explicit operational approval do not count as approved hours",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["اسم المتطوع","total_hours_raw","_validation_status"],["name","5","approved"]]}]}],[]);
 expect(rows[0]?.hours).toBe(5);expect(rows[0]?.approved).toBe(false);expect(approvedTotals(rows).hours).toBe(0);
});
it("never treats form validation metadata mapped to approval as approved hours",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["عدد الساعات","_validation_status","حالة الحضور"],["3","approved","حضر"]]}],config:{tabs:{form:{kind:"participations",mapping:{approval:"_validation_status"}}}}}],[]);
 expect(rows[0]?.approved).toBe(false);expect(approvedTotals(rows).hours).toBe(0);
});
it("does not match participants by similar names",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["اسم المتطوع","عدد الساعات"],["same name","2"]]}]}],[]);
 expect(rows[0]?.volunteerKey).toBeNull();
});
it("counts attended explicitly approved hours only",()=>{
 const rows=parseParticipations([{id:"s",year:2026,label:"source",category:"other",tabs:[{title:"form",grid:[["عدد الساعات","حالة الاعتماد","حالة الحضور"],["3","معتمد","حضر"],["2","معتمد","غائب"],["25","معتمد","حضر"],["4","غير معتمد","حضر"]]}]}],[]);
 expect(approvedTotals(rows)).toEqual({hours:3,participations:1});
});