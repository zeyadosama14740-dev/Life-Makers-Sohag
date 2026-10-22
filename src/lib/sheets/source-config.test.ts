import { expect, it } from "vitest";
import { mappedGrid, sourceConfigSchema, suggestMapping } from "./source-config";
import { parseParticipations } from "./participations";
import { buildDataset } from "./build";

it("keeps only explicitly selected sheet columns",()=>{
 expect(mappedGrid([["اسم","خاص","ساعات"],["أ","سري","3"]],{kind:"participations",mapping:{hours:"ساعات"},selectedColumns:["اسم","ساعات"]})).toEqual([["اسم","عدد الساعات"],["أ","3"]]);
});
it("includes both boundaries and excludes missing and outside dates",()=>{
 const grid=[["يوم","عدد الساعات"],["2026-10-01","1"],["2026-10-20","2"],["2026-10-21","3"],["","4"]];
 const config={kind:"participations" as const,mapping:{date:"يوم"},dateFrom:"2026-10-01",dateTo:"2026-10-20"};
 expect(mappedGrid(grid,config).slice(1)).toEqual([["2026-10-01","1"],["2026-10-20","2"]]);
 expect(parseParticipations([{id:"s",label:"s",year:2026,category:"other",tabs:[{title:"form",grid}],config:{tabs:{form:config}}}],[])).toHaveLength(2);
});
it("preserves timestamp mappings and rejects reversed date windows",()=>{
 expect(sourceConfigSchema.parse({tabs:{form:{kind:"participations",mapping:{startTime:"start",endTime:"end"},selectedColumns:["start","end"],dateFrom:"2026-10-01",dateTo:"2026-10-20"}}}).tabs?.['form']?.mapping).toEqual({startTime:"start",endTime:"end"});
 expect(sourceConfigSchema.safeParse({tabs:{form:{kind:"participations",mapping:{},dateFrom:"2026-10-20",dateTo:"2026-10-01"}}}).success).toBe(false);
});
it("suggests separate beginning and ending date/time fields",()=>{
 expect(suggestMapping(["start","end","تاريخ البداية","تاريخ النهاية"])).toMatchObject({startTime:"start",endTime:"end",startDate:"تاريخ البداية",endDate:"تاريخ النهاية"});
});
it("uses selected date and center columns in public activity totals",()=>{
 const ds=buildDataset([{id:"s",label:"s",year:2026,category:"activities",tabs:[{title:"report",grid:[["يوم","مدينة","نوع النشاط"],["2026-10-20","طما","وجبات"],["2026-09-01","سوهاج","وجبات"]]}],config:{tabs:{report:{kind:"activities",mapping:{date:"يوم",center:"مدينة"},dateFrom:"2026-10-01"}}}}]);
 expect(ds.activities).toHaveLength(1);expect(ds.activities[0]?.date).toBe("2026-10-20");expect(ds.activities[0]?.center).toBe("طما");
});