import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSourceForEdit, previewSource, saveSource } from "@/lib/sources.functions";
import { FIELD_LABELS, mappedGrid, suggestMapping, type SourceConfig, type TabConfig, type MappingField } from "@/lib/sheets/source-config";
import { parseParticipations } from "@/lib/sheets/participations";
import { toast } from "sonner";

type Tab = { title: string; grid: string[][] };
const KINDS = { auto: "اكتشاف تلقائي", volunteers: "بيانات المتطوعين", participations: "مشاركات المتطوعين", placement: "تسكين", activities: "تقارير أنشطة", master_plan: "مستهدفات", expenses: "بيانات مالية", unused: "غير مصنف — لا يدخل المؤشرات" };
export function SourceWizard({ onSaved, sourceId }: { onSaved: () => Promise<void>; sourceId?: string }) {
 const [open,setOpen] = useState(false);
 const [step,setStep] = useState(0);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [type,setType] = useState<"google_sheets"|"csv"|"excel">("google_sheets");
 const [url,setUrl] = useState("");
 const [label,setLabel] = useState("");
 const [year,setYear] = useState(new Date().getFullYear());
  const [category,setCategory] = useState<"activities"|"volunteers"|"master_plan"|"other">("other");
 const [tabs,setTabs] = useState<Tab[]>([]);
 const [selected,setSelected] = useState("");
 const [config,setConfig] = useState<SourceConfig>({priority:"assistant",matchKey:"nationalId",relationship:"additional",tabs:{}});
 const load = async () => {
  setBusy(true); setError("");
  try {
   const result = await previewSource({data:{url}});
   setTabs(result.tabs); setSelected(result.tabs[0]?.title ?? "");
   setConfig({...config,tabs:Object.fromEntries(result.tabs.map(t=>[t.title,{kind:"auto",mapping:suggestMapping(t.grid[0] ?? [])}]))});
   setStep(1);
  } catch(e) { setError(e instanceof Error?e.message:String(e)); } finally {setBusy(false);}
 };
 const upload = async (file: File|undefined) => {
  if (!file) return;
  if (file.size>8_000_000) {setError("حجم الملف أكبر من 8 ميجابايت");return;}
  setBusy(true);setError("");
  try {
   const XLSX = await import("xlsx");
   const book = XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
   const readTabs = book.SheetNames.map(title=>({title,grid:XLSX.utils.sheet_to_json<string[]>(book.Sheets[title] ?? {},{header:1,defval:"",raw:false}).map(row=>row.map(String))}));
   setTabs(readTabs);setSelected(readTabs[0]?.title ?? "");setLabel(file.name);setUrl(file.name);
   setType(/\.csv$/i.test(file.name)?"csv":"excel");
   setConfig({...config,tabs:Object.fromEntries(readTabs.map(t=>[t.title,{kind:"unused",mapping:suggestMapping(t.grid[0]??[])}]))});
   setStep(1);
  } catch(e) {setError(e instanceof Error?e.message:"تعذر قراءة الملف");} finally {setBusy(false);}
 };
 const current = tabs.find(t=>t.title===selected);
 const setting: TabConfig = config.tabs?.[selected] ?? {kind:"auto",mapping:{}};
 const update = (next: TabConfig)=>setConfig({...config,tabs:{...config.tabs,[selected]:next}});
 const headers = current?.grid[0]?.filter(Boolean) ?? [];
 const included = setting.selectedColumns ?? headers;
 const previewGrid = current ? mappedGrid(current.grid,setting) : [];
 const participationPreview = current && setting.kind === "participations" ? parseParticipations([{id:"preview",label:"معاينة",year,category:"other",tabs:[current],config:{tabs:{[selected]:setting}}}],[]) : [];
 const save = async () => {
  setBusy(true);setError("");
  try {
    await saveSource({data:{...(sourceId?{id:sourceId}:{}),label:label.trim()||`مصدر ${year}`,url,year,category,sourceType:type,config,...(type!=="google_sheets"?{tabs}:{})}});
   toast.success("تم حفظ المصدر وإعداداته");setOpen(false);await onSaved();
  } catch(e) {setError(e instanceof Error?e.message:String(e));} finally {setBusy(false);}
 };
 const steps=["المصدر","المعاينة","التصنيف والأعمدة","الربط","التأكيد"];
  const begin = async () => {
   setError("");setBusy(true);
   try {
    if(sourceId){
     const source=await getSourceForEdit({data:{id:sourceId}});
     const sourceType=source.source_type as typeof type;
     const loaded=sourceType==="google_sheets"?(await previewSource({data:{url:source.url}})).tabs:(source.import_tabs??[]) as unknown as Tab[];
     setType(sourceType);setCategory(source.category === "activities" || source.category === "volunteers" || source.category === "master_plan" ? source.category : "other");setUrl(source.url);setLabel(source.label);setYear(source.year);setTabs(loaded);setSelected(loaded[0]?.title??"");setConfig(source.config as unknown as SourceConfig);setStep(1);
    } else {setStep(0);setType("google_sheets");setCategory("other");setUrl("");setLabel("");setTabs([]);setConfig({tabs:{}});}
    setOpen(true);
   }catch(e){toast.error(e instanceof Error?e.message:"تعذر فتح المصدر");}finally{setBusy(false);}
  };
 return <>
   <Button variant={sourceId?"outline":"default"} size={sourceId?"sm":"default"} disabled={busy} onClick={begin}><FileSpreadsheet className="size-4"/>{sourceId?"إعدادات المصدر":"إضافة مصدر بيانات"}</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
    <DialogHeader><DialogTitle>{sourceId?"إعدادات المصدر":"إضافة مصدر بيانات"}</DialogTitle></DialogHeader>
   <div className="flex flex-wrap gap-2 text-xs">{steps.map((s,i)=><span key={s} className={i===step?"rounded-md bg-primary px-3 py-2 font-bold text-primary-foreground":"rounded-md bg-muted px-3 py-2 text-muted-foreground"}>{i+1}. {s}</span>)}</div>
   {step===0?<div className="space-y-4">
    <div className="flex flex-wrap gap-2"><Button variant={type==="google_sheets"?"default":"outline"} onClick={()=>setType("google_sheets")}>Google Sheets</Button><Button variant={type!=="google_sheets"?"default":"outline"} onClick={()=>setType("excel")}><Upload className="size-4"/>ملف CSV / Excel</Button></div>
    {type==="google_sheets"?<label className="block space-y-2 text-sm">الرابط أو Spreadsheet ID<Input dir="ltr" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…"/></label>:<label className="block space-y-2 text-sm">ملف من الجهاز<Input type="file" accept=".csv,.xlsx,.xls" onChange={e=>upload(e.target.files?.[0])}/><span className="block text-xs text-muted-foreground">نسخة مستوردة، لا تتحدث تلقائيًا من الملف الأصلي.</span></label>}
    <p className="text-xs text-muted-foreground">ملفات Drive من نوع Google Sheets تُربط برابط الشيت؛ ملفات Excel تُرفع كنسخة مستوردة.</p>
   </div>:step===1?<div className="space-y-3">
    <div className="flex flex-wrap gap-2">{tabs.map(t=><Button key={t.title} size="sm" variant={selected===t.title?"default":"outline"} onClick={()=>setSelected(t.title)}>{t.title} · {t.grid.slice(1).filter(r=>r.some(Boolean)).length} سجل</Button>)}</div>
    <div className="max-h-72 overflow-auto rounded-md border"><table className="w-full text-xs"><thead className="bg-muted"><tr>{current?.grid[0]?.map((h,i)=><th key={i} className="whitespace-nowrap p-2 text-right">{h||"—"}</th>)}</tr></thead><tbody>{current?.grid.slice(1,6).map((row,i)=><tr key={i} className="border-t">{row.map((v,j)=><td key={j} className="max-w-48 truncate p-2">{v||"—"}</td>)}</tr>)}</tbody></table></div>
   </div>:step===2?<div className="space-y-3">
    <label className="block text-sm">الشيت<select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-card px-3">{tabs.map(t=><option key={t.title}>{t.title}</option>)}</select></label>
    <label className="block text-sm">طبيعة البيانات<select value={setting.kind} onChange={e=>update({...setting,kind:e.target.value as TabConfig["kind"]})} className="mt-1 h-10 w-full rounded-md border bg-card px-3">{Object.entries(KINDS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <fieldset className="space-y-2 border-t pt-3"><legend className="text-sm font-bold">الأعمدة المستخدمة</legend><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>update({...setting,selectedColumns:headers})}>اختيار الكل</Button><Button size="sm" variant="ghost" onClick={()=>update({...setting,selectedColumns:[],mapping:{}})}>إلغاء الكل</Button></div><div className="grid gap-2 sm:grid-cols-2">{headers.map((h,i)=><label key={i} className="flex items-center gap-2 text-xs"><Checkbox checked={included.includes(h)} onCheckedChange={checked=>{const next=checked?[...included,h]:included.filter(x=>x!==h);update({...setting,selectedColumns:next,mapping:Object.fromEntries(Object.entries(setting.mapping).filter(([,v])=>next.includes(v ?? "")))});}}/>{h}</label>)}</div></fieldset>
    {(setting.kind==="volunteers"||setting.kind==="placement")&&<label className="block text-sm">مرحلة التطوع<select value={setting.stage??(setting.kind==="placement"?"تسكين":"جذب")} onChange={e=>update({...setting,stage:e.target.value})} className="mt-1 h-10 w-full rounded-md border bg-card px-3">{["جذب","استقبال","تسكين","تفعيل"].map(s=><option key={s}>{s}</option>)}</select></label>}
    <Button size="sm" variant="outline" onClick={()=>update({...setting,mapping:suggestMapping(included)})}>اقتراح ربط الأعمدة</Button>
    <div className="grid gap-3 sm:grid-cols-2">{Object.entries(FIELD_LABELS).map(([field,caption])=><label key={field} className="block text-xs">{caption}<select value={setting.mapping[field as MappingField]??""} onChange={e=>update({...setting,mapping:{...setting.mapping,[field]:e.target.value}})} className="mt-1 h-9 w-full rounded-md border bg-card px-2"><option value="">غير مرتبط</option>{included.map((h,i)=><option key={i}>{h}</option>)}</select></label>)}</div>
    <fieldset className="grid gap-3 border-t pt-3 sm:grid-cols-2"><legend className="text-sm font-bold">فترة احتساب البيانات</legend><label className="text-xs">من تاريخ<Input type="date" value={setting.dateFrom??""} onChange={e=>update({...setting,dateFrom:e.target.value})}/></label><label className="text-xs">إلى تاريخ<Input type="date" min={setting.dateFrom} value={setting.dateTo??""} onChange={e=>update({...setting,dateTo:e.target.value})}/></label></fieldset>
    <p className="text-xs text-muted-foreground">{previewGrid.slice(1).filter(r=>r.some(Boolean)).length} سجل ضمن الاختيار الحالي{(setting.dateFrom||setting.dateTo)&&" — السجلات بلا تاريخ مستبعدة"}</p>
    {setting.dateFrom && setting.dateTo && setting.dateFrom>setting.dateTo && <p role="alert" className="text-xs text-destructive">تاريخ النهاية يجب ألا يسبق البداية.</p>}
    {setting.kind==="participations"&&<div className="overflow-auto border-t pt-3"><h3 className="mb-2 text-sm font-bold">معاينة حساب الساعات</h3><table className="w-full text-xs"><thead><tr>{["البداية","النهاية","المدة بالساعات"].map(h=><th key={h} className="p-2 text-right">{h}</th>)}</tr></thead><tbody>{participationPreview.slice(0,5).map(r=><tr key={r.id} className="border-t"><td className="p-2" dir="ltr">{r.startDate} {r.startTime||"—"}</td><td className="p-2" dir="ltr">{r.endDate} {r.endTime||"—"}</td><td className="p-2">{r.hours??"—"}</td></tr>)}</tbody></table></div>}
   </div>:step===3?<div className="grid gap-4 sm:grid-cols-2">
     <p className="text-sm sm:col-span-2">تُربط السجلات بالرقم القومي الصالح أو كود المتطوع. لا تُعدّل البيانات الأصلية عند حفظ التصنيف.</p>
    <p className="text-xs text-muted-foreground sm:col-span-2">تشابه الاسم وحده لا يدمج الأشخاص. السجلات المتعارضة تحتاج مراجعة.</p>
   </div>:<div className="space-y-3">
    <label className="block text-sm">اسم المصدر<Input value={label} onChange={e=>setLabel(e.target.value)}/></label>
    <label className="block text-sm">السنة<Input type="number" min={2020} max={2100} value={year} onChange={e=>setYear(Number(e.target.value))}/></label>
    <p className="text-sm">{type==="google_sheets"?"مصدر حي من Google Sheets":"نسخة مستوردة"} · {tabs.length} شيت · {tabs.reduce((n,t)=>n+t.grid.slice(1).filter(r=>r.some(Boolean)).length,0)} سجل</p>
    <ul className="space-y-1 text-xs">{tabs.map(t=><li key={t.title}>{t.title} — {KINDS[config.tabs?.[t.title]?.kind??"auto"]}</li>)}</ul>
   </div>}
   {error&&<p role="alert" className="break-words rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
   <div className="flex justify-between border-t pt-4"><Button variant="outline" disabled={step===0||busy} onClick={()=>setStep(step-1)}><ArrowRight className="size-4"/>السابق</Button><Button disabled={busy||(step===0&&!url)} onClick={()=>step===0?load():step===4?save():setStep(step+1)}>{busy?<Loader2 className="size-4 animate-spin"/>:step===4?<Check className="size-4"/>:<ArrowLeft className="size-4"/>}{step===4?"تأكيد وحفظ":step===0?"قراءة المصدر":"التالي"}</Button></div>
  </DialogContent></Dialog>
 </>;
}
