import { describe, expect, it } from "vitest";
import { buildActivityDeck, isActivityGoal } from "./activity-deck";
import type { ActivityRecord } from "./types";
const row=(id:string, extra:Partial<ActivityRecord>={}):ActivityRecord=>({id,date:"2026-10-18",department:"إدارة المكاتب",file:"أنشطة أطفال",center:"سوهاج",reporter:"",name:"",place:"",beneficiaries:20,volunteers:5,newVolunteers:0,oldVolunteers:5,metrics:{},details:{},image:null,sourceLabel:"sheet",...extra});
describe("live activity presentation",()=>{
 it("sums actual beneficiary and volunteer figures by center",()=>{
  const d=buildActivityDeck([row("1"),row("2",{center:"طما",beneficiaries:30,volunteers:7})]);
  const g=d.slides.flatMap(s=>s.goals).find(g=>g.item==="أنشطة أطفال");
  if(!g || !isActivityGoal(g)) throw Error("Missing activity");
  expect(g.metrics.find(m=>m.key==="ben")?.value).toBe(50);expect(g.metrics.find(m=>m.key==="vol")?.value).toBe(12);expect(g.centerMetrics.find(c=>c.center==="طما")?.metrics[0]?.value).toBe(30);
 });
 it("automatically includes a newly recorded activity type",()=>{
  const d=buildActivityDeck([row("new",{department:"إدارة جديدة",file:"نشاط جديد",beneficiaries:13})]);
  expect(d.slides.find(s=>s.title==="إدارة جديدة")?.goals.find(g=>g.item==="نشاط جديد")?.achieved).toBe(13);
 });
 it("uses no demo figures when a metric is absent",()=>{
  const d=buildActivityDeck([]);expect(d.slides[0]?.goals[0]?.achieved).toBeNull();
 });
 it("reads Intake and Initial separately from the same case report",()=>{
  const d=buildActivityDeck([row("case",{department:"إدارة الحالة",file:"أنشطة عامة",metrics:{"كام استمارة Intake اتعملت؟":53,"كام استمارة Initial اتعملت؟":20,cm_total_forms:73}})]);
  const g=d.slides.find(s=>s.title==="إدارة الحالة")?.goals;expect(g?.[0]?.achieved).toBe(53);expect(g?.[1]?.achieved).toBe(20);
 });
});
