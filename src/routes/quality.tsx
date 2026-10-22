import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccess } from "@/hooks/use-access";
import { useDataset } from "@/hooks/use-dataset";
import { listVolunteers } from "@/lib/access.functions";
import { getParticipationData } from "@/lib/participations.functions";
import { getAuditEvents } from "@/lib/quality.functions";
import { Hero, SectionTitle, Empty } from "@/components/dash/ui";
import { DataTable } from "@/components/dash/data-table";

export const Route=createFileRoute("/quality")({head:()=>({meta:[
 {title:"جودة البيانات وسجل التعديلات — صناع الحياة سوهاج"},
 {name:"description",content:"مراجعة جودة المصادر والهويات والمشاركات وسجل تغييرات المصادر حسب الصلاحيات."},
 {property:"og:title",content:"جودة البيانات — صناع الحياة سوهاج"},
 {property:"og:description",content:"فحوصات جودة البيانات ومتابعة التغييرات المسجلة."},
 {property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"},
]}),component:QualityPage});
const ACTIONS:Record<string,string>={source_link:"ربط مصدر",source_mapping_update:"تعديل إعدادات مصدر",source_change_observed:"رصد تغير في المصدر"};
export function QualityPage(){
 const ds=useDataset();const me=useAccess();const allowed=!!me.data&&(me.data.isAdmin||me.data.isCenterManager);
 const volunteers=useQuery({queryKey:["volunteers"],queryFn:()=>listVolunteers(),enabled:allowed,staleTime:300000});
 const participations=useQuery({queryKey:["participations"],queryFn:()=>getParticipationData(),enabled:allowed,staleTime:300000});
 const audit=useQuery({queryKey:["audit"],queryFn:()=>getAuditEvents(),enabled:!!me.data?.isAdmin,staleTime:60000});
 const issues=(volunteers.data?.rows??[]).flatMap(p=>[
  ...(!p.identityValid?[{name:p.name,center:p.center,issue:"رقم قومي غير مستوفٍ للتحقق الأساسي"}]:[]),
  ...(p.genderConflict?[{name:p.name,center:p.center,issue:"تعارض النوع المسجل والمستنتج"}]:[]),
  ...(!p.phone?[{name:p.name,center:p.center,issue:"رقم الهاتف غير متاح"}]:[]),
  ...(p.center==="غير محدد"?[{name:p.name,center:p.center,issue:"المركز غير محدد"}]:[]),
 ]);
 return <div>
  <Hero title="جودة البيانات وسجل التعديلات" label="المراجعة" subtitle="ملاحظات المصادر والسجلات ضمن نطاق صلاحيات حسابك." back={{to:"/",text:"الرئيسية"}}/>
  <SectionTitle>فحوصات عامة</SectionTitle>
  <DataTable rows={ds.quality} exportName="جودة-البيانات" columns={[{key:"label",label:"الفحص",value:r=>r.label},{key:"count",label:"السجلات",value:r=>r.count}]}/>
  {allowed&&<><SectionTitle>هويات تحتاج مراجعة</SectionTitle>{volunteers.isLoading?<Empty>جارٍ المراجعة…</Empty>:volunteers.error?<Empty>{volunteers.error.message}</Empty>:<DataTable rows={issues} exportName="مراجعة-الهويات" columns={[{key:"name",label:"المتطوع",value:r=>r.name},{key:"center",label:"المركز",value:r=>r.center},{key:"issue",label:"الملاحظة",value:r=>r.issue}]}/>}
  <SectionTitle>مشاركات تحتاج مراجعة</SectionTitle>{participations.error?<Empty>{participations.error.message}</Empty>:<DataTable rows={(participations.data?.rows??[]).filter(r=>r.issues.length)} exportName="مراجعة-المشاركات" columns={[{key:"name",label:"المتطوع",value:r=>r.name},{key:"activity",label:"النشاط",value:r=>r.activity},{key:"issues",label:"الملاحظات",value:r=>r.issues.join("، ")}]}/>}</>}
  {me.data?.isAdmin&&<><SectionTitle>سجل تغييرات المصادر</SectionTitle>{audit.error?<Empty>{audit.error.message}</Empty>:<DataTable rows={audit.data??[]} exportName="سجل-التغييرات" columns={[{key:"date",label:"التاريخ",value:r=>r.created_at},{key:"action",label:"العملية",value:r=>ACTIONS[r.action]??r.action},{key:"origin",label:"المصدر",value:r=>r.origin==="sync"?"ملاحظة أثناء القراءة":"التطبيق"},{key:"result",label:"النتيجة",value:r=>r.result==="success"?"نجاح":r.result==="observed"?"تغير مرصود":r.result}]}/>}<p className="mt-3 text-xs text-muted-foreground">التغير الخارجي يُرصد عند قراءة المصدر؛ اسم محرر الشيت والحقول المعدلة لا تتوفر من هذه القراءة.</p></>}
 </div>;
}