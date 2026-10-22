import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccess } from "@/hooks/use-access";
import { Button } from "@/components/ui/button";
import { formatParticipationTime } from "@/lib/sheets/participation-time";
import { getParticipationData } from "@/lib/participations.functions";
import { approvedTotals, type Participation } from "@/lib/sheets/participations";
import { fmt } from "@/lib/format";
import { DataTable } from "./data-table";
import { Select } from "./activity-dashboard";
import { Empty, Kpi, SectionTitle } from "./ui";

export function ParticipationDashboard() {
 const me=useAccess();
 const allowed=!!me.data&&(me.data.isAdmin||me.data.isCenterManager);
 const query=useQuery({queryKey:["participations"],queryFn:()=>getParticipationData(),enabled:allowed,staleTime:300000});
 const [center,setCenter]=useState("");const [project,setProject]=useState("");const [approval,setApproval]=useState("");
 const [from,setFrom]=useState("");const [to,setTo]=useState("");
 const [review,setReview]=useState(false);
 const all=query.data?.rows??[];
 const rows=useMemo(()=>all.filter(r=>(!center||r.center===center)&&(!project||r.project===project)&&(!approval||(approval==="معتمد"?r.approved:!r.approved))&&(!review||r.issues.length>0)&&(!from||!!r.date&&r.date.slice(0,10)>=from)&&(!to||!!r.date&&r.date.slice(0,10)<=to)),[all,center,project,approval,from,to,review]);
 const totals=approvedTotals(rows);
 const leaderboard=useMemo(()=>{
  const grouped=new Map<string,Participation[]>();
  rows.forEach(r=>{if(r.volunteerKey)grouped.set(r.volunteerKey,[...(grouped.get(r.volunteerKey)??[]),r]);});
  return [...grouped.values()].map(group=>({name:group[0]?.name??"",center:group[0]?.center??"",...approvedTotals(group)})).filter(r=>r.participations>0).sort((a,b)=>b.hours-a.hours);
 },[rows]);
 const [mode,setMode]=useState<"hours"|"count"|"centers">("hours");
 const board=useMemo(()=>[...leaderboard].sort((a,b)=>mode==="count"?b.participations-a.participations||b.hours-a.hours:b.hours-a.hours).map((r,i)=>({...r,rank:i+1})),[leaderboard,mode]);
 const centerBoard=useMemo(()=>{
  const m=new Map<string,{center:string;hours:number;participations:number;volunteers:number}>();
  leaderboard.forEach(r=>{const c=m.get(r.center)??{center:r.center,hours:0,participations:0,volunteers:0};c.hours=Math.round((c.hours+r.hours)*100)/100;c.participations+=r.participations;c.volunteers+=1;m.set(r.center,c);});
  return [...m.values()].sort((a,b)=>b.hours-a.hours).map((r,i)=>({...r,rank:i+1}));
 },[leaderboard]);
 if(!allowed)return null;
 return <>
  <SectionTitle>المشاركات التطوعية</SectionTitle>
  {query.isLoading?<Empty>جارٍ تحميل المشاركات…</Empty>:query.error?<Empty>{query.error.message}</Empty>:<>
   <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <Select label="المركز" value={center} onChange={setCenter} options={[...new Set(all.map(r=>r.center))]}/>
    <Select label="المشروع" value={project} onChange={setProject} options={[...new Set(all.map(r=>r.project).filter(Boolean))]}/>
    <Select label="الاعتماد" value={approval} onChange={setApproval} options={["معتمد","غير معتمد"]}/>
    <label className="text-xs font-semibold">من تاريخ<input type="date" className="mt-1 h-9 w-full rounded-md border bg-card px-2" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label className="text-xs font-semibold">إلى تاريخ<input type="date" className="mt-1 h-9 w-full rounded-md border bg-card px-2" value={to} onChange={e=>setTo(e.target.value)}/></label>
   </div>
   <div className="mb-3 flex flex-wrap gap-2"><Button size="sm" variant={review?"default":"outline"} onClick={()=>setReview(!review)}>مشاركات تحتاج مراجعة</Button><Button size="sm" variant="ghost" onClick={()=>{setCenter("");setProject("");setApproval("");setFrom("");setTo("");setReview(false);}}>مسح الفلاتر</Button></div>
   <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="سجلات المشاركة" value={fmt(rows.length)}/><Kpi label="مشاركات حضور معتمدة" value={fmt(totals.participations)} tone="success"/><Kpi label="الساعات المعتمدة" value={new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(totals.hours)} tone="accent"/><Kpi label="سجلات تحتاج مراجعة" value={fmt(rows.filter(r=>r.issues.length).length)}/></div>
   <DataTable rows={rows} exportName="المشاركات-التطوعية" columns={[
    {key:"name",label:"المتطوع",value:r=>r.name},{key:"center",label:"المركز",value:r=>r.center},{key:"activity",label:"النشاط",value:r=>r.activity},{key:"project",label:"المشروع",value:r=>r.project},{key:"date",label:"التاريخ",value:r=>r.date},{key:"startDate",label:"تاريخ البداية",value:r=>r.startDate},{key:"endDate",label:"تاريخ النهاية",value:r=>r.endDate},{key:"start",label:"بداية الوقت",value:r=>formatParticipationTime(r.startTime)},{key:"end",label:"نهاية الوقت",value:r=>formatParticipationTime(r.endTime)},{key:"hours",label:"الساعات المحسوبة",value:r=>r.hours},{key:"basis",label:"مصدر الساعات",value:r=>r.hoursSource==="duration"?"البداية والنهاية":r.hoursSource==="reported"?"الساعات المسجلة":"غير متاح"},{key:"attendance",label:"الحضور",value:r=>r.attendance},{key:"approved",label:"الاعتماد",value:r=>r.approved?"معتمد":"غير معتمد"},{key:"issues",label:"المراجعة",value:r=>r.issues.join("، ")},
   ]}/>
    <SectionTitle action={<div className="flex gap-1 text-xs">{([["hours","الساعات"],["count","المشاركات"],["centers","المراكز"]] as const).map(([k,l])=><Button key={k} size="sm" variant={mode===k?"default":"ghost"} onClick={()=>setMode(k)}>{l}</Button>)}</div>}>لوحة المتصدّرين</SectionTitle>
    {mode==="centers"?(centerBoard.length?<DataTable rows={centerBoard} exportName="ترتيب-المراكز" columns={[{key:"rank",label:"#",value:r=>r.rank},{key:"center",label:"المركز",value:r=>r.center},{key:"hours",label:"الساعات المعتمدة",value:r=>r.hours},{key:"participations",label:"مشاركات معتمدة",value:r=>r.participations},{key:"volunteers",label:"متطوعون نشطون",value:r=>r.volunteers}]}/>:<Empty>لا توجد مشاركات معتمدة ضمن النتائج الحالية.</Empty>)
    :board.length?<DataTable rows={board} exportName="ترتيب-المتطوعين" columns={[{key:"rank",label:"#",value:r=>r.rank,render:r=><span className="font-extrabold">{r.rank<=3?["🥇","🥈","🥉"][r.rank-1]:r.rank}</span>},{key:"name",label:"المتطوع",value:r=>r.name},{key:"center",label:"المركز",value:r=>r.center},{key:"hours",label:"الساعات المعتمدة",value:r=>r.hours},{key:"participations",label:"مشاركات معتمدة",value:r=>r.participations}]}/>:<Empty>لا توجد ساعات حضور معتمدة ومرتبطة بمتطوع ضمن النتائج الحالية.</Empty>}
  </>}
 </>;
}