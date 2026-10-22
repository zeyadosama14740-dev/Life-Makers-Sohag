import { useEffect, useState } from "react";
import { Activity, Shirt, Store, Heart, Droplet, Truck, GraduationCap, Megaphone, Smile, Home, Star, Waves, ClipboardList, Pill, Package, Utensils, Bed, Gem, Receipt, Shapes, Cross, ListFilter, Presentation, FileText, Coins, Wrench, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityGoal, ActivityMetric } from "@/lib/sheets/activity-deck";
const ICONS = { shirt: Shirt, sort: ListFilter, shop: Store, smile: Smile, mega: Megaphone, drop: Droplet, cross: Cross, truck: Truck, heart: Heart, shapes: Shapes, home: Home, cap: GraduationCap, waves: Waves, star: Star, board: Presentation, bread: Utensils, gem: Gem, pipe: Wrench, coin: Coins, receipt: Receipt, surg: Cross, pill: Pill, box: Package, utensils: Utensils, bed: Bed, clip: ClipboardList, file: FileText };
const number = (n: number | null) => n === null ? "—" : n.toLocaleString("en-US");
function ActivityCount({value}: {value:number}) {
 const [count,setCount]=useState(value);
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) {setCount(value); return;}
  const start=performance.now(); let frame=0;
  const tick=(now:number)=>{const p=Math.min(1,(now-start)/1400);setCount(value*(1-Math.pow(1-p,3)));if(p<1) frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
 },[value]);
 return <>{number(Number.isInteger(value) ? Math.round(count) : Math.round(count*100)/100)}</>;
}
export function ActivityCard({goal,photo,ready,onPhoto,onDetail}: {goal:ActivityGoal;photo:string|null;ready:boolean;onPhoto:()=>void;onDetail:()=>void}) {
 const Icon=ICONS[goal.icon as keyof typeof ICONS] ?? Activity;
 const [main,...rest]=goal.metrics;
 return <article className="activity-card deck-anim deck-photo-card">
  {photo && <img className="deck-photo" src={photo} alt={goal.item} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>}
  <Button variant="ghost" disabled={!ready} aria-label={`${photo ? "تغيير" : "إضافة"} صورة: ${goal.item}`} onClick={onPhoto} className="activity-photo-control"><ImagePlus className="size-3"/>{photo ? "تغيير" : "صورة"}</Button>
  <Button variant="ghost" onClick={onDetail} className="activity-card-action">
   <span className="activity-heading"><span className="activity-icon"><Icon/></span><h3>{goal.item}</h3></span>
   <span className="activity-main"><b>{main?.value === null || main?.value === undefined ? "—" : <ActivityCount value={main.value}/>}{main?.value !== null && main?.unit ? ` ${main.unit}` : ""}</b><em>{main?.label}</em></span>
   <span className="activity-rows">{rest.map(m=><span key={m.key}><span>{m.label}</span><b>{number(m.value)}{m.value !== null && m.unit ? ` ${m.unit}` : ""}</b></span>)}</span>
   <span className="activity-more">التفاصيل حسب المركز ‹</span>
  </Button>
 </article>;
}
export function ActivityDetails({goal}: {goal:ActivityGoal}) {
 const [center,setCenter]=useState(""); const [metric,setMetric]=useState(goal.metrics[0]?.key ?? "ben");
 const metrics=center ? goal.centerMetrics.find(c=>c.center===center)?.metrics ?? [] : goal.metrics;
 const rows=goal.records.filter(r=>!center || r.center===center);
 const max=Math.max(1,...goal.centerMetrics.map(c=>c.metrics.find(m=>m.key===metric)?.value ?? 0));
 const ranked=[...goal.centerMetrics].sort((a,b)=>(b.metrics.find(m=>m.key===metric)?.value ?? 0)-(a.metrics.find(m=>m.key===metric)?.value ?? 0));
 return <>
  <div className="activity-chips"><span>المركز</span><Button variant="ghost" className={!center ? "selected" : ""} onClick={()=>setCenter("")}>الكل</Button>{goal.centerMetrics.map(c=><Button variant="ghost" key={c.center} className={center===c.center ? "selected" : ""} onClick={()=>setCenter(c.center)}>{c.center}</Button>)}</div>
  <div className="activity-detail-body">
   <div className="activity-kpis">{metrics.map((m:ActivityMetric)=><div key={m.key}><b>{number(m.value)}{m.value !== null && m.unit ? ` ${m.unit}` : ""}</b><span>{m.label}</span></div>)}</div>
   <div><div className="activity-chips">{goal.metrics.map(m=><Button variant="ghost" key={m.key} className={metric===m.key ? "selected" : ""} onClick={()=>setMetric(m.key)}>{m.label}</Button>)}</div><h4 className="my-3">التوزيع حسب المركز</h4>{ranked.length ? ranked.map((c,i)=><Button variant="ghost" key={c.center} className="activity-bar-row" onClick={()=>setCenter(center===c.center ? "" : c.center)}><em>{i+1}</em><span>{c.center}</span><span className="activity-track"><i style={{width:`${(c.metrics.find(m=>m.key===metric)?.value ?? 0)/max*100}%`}}/></span><strong>{number(c.metrics.find(m=>m.key===metric)?.value ?? null)}</strong></Button>) : <p>لا توجد تقارير مسجلة لهذا النشاط بعد.</p>}</div>
  </div>
  {rows.length>0 && <div className="overflow-x-auto"><table className="activity-records"><thead><tr><th>المركز</th><th>التاريخ</th><th>النشاط</th><th>التفاصيل</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.center}</td><td>{r.date ?? "—"}</td><td>{r.name || goal.item}</td><td>{Object.entries(r.details).filter(([k])=>!/اسم|هاتف|قومي|بريد|مدرب|مقدم|مقدّم|تليفون|^start$|^end$|^_/.test(k)).map(([k,v])=>`${k}: ${v}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div>}
 </>;
}
