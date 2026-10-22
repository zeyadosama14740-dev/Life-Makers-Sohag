import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAuditEvents=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:admin,error}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(error||!admin)throw new Error("سجل التعديلات للمسؤول الرئيسي فقط");
 const result=await context.supabase.from("audit_events").select("id,action,entity_id,source_id,result,origin,created_at").order("created_at",{ascending:false}).limit(200);
 if(result.error)throw result.error;
 return result.data;
});