import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "أهلًا بيك في صناع الحياة سوهاج", description: "هنا تقدر تتابع إنجازات المؤسسة وأنشطتها والمتطوعين. الدليل ده هيساعدك توصل للمعلومة في خطوات بسيطة.", to: "/", action: "افتح الرئيسية" },
  { title: "ابدأ من الرئيسية", description: "الرئيسية بتديك نظرة عامة. لو عايز تعرف إيه اللي اتحقق وإيه اللي محتاج متابعة، ابدأ منها.", to: "/", action: "الرئيسية" },
  { title: "تابع الأنشطة والنتائج", description: "مركز المتابعة لمراجعة سير العمل، والتقويم لمعرفة الأنشطة، والتقارير لمتابعة الأثر بالأرقام.", to: "/follow-up", action: "مركز المتابعة" },
  { title: "اعرف المتطوعين والمستهدفات", description: "قسم المتطوعين للمشاركات، والماستر بلان لمقارنة المستهدف بالمنفذ. التفاصيل المتاحة بتعتمد على صلاحيتك.", to: "/volunteers", action: "المتطوعين" },
  { title: "محتاج مساعدة؟", description: "استخدم البحث في القائمة للوصول لأي صفحة، أو افتح المساعد الذكي. وتقدر ترجع للدليل ده من زر «دليل الموقع» في أي وقت.", to: "/assistant", action: "المساعد الذكي" },
];
const KEY = "sonaa-site-guide-v1";
export function SiteGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => { try { if (localStorage.getItem(KEY) !== "done") setOpen(true); } catch { /* storage unavailable */ } }, []);
  const close = () => { setOpen(false); try { localStorage.setItem(KEY, "done"); } catch { /* storage unavailable */ } };
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => { setStep(0); setOpen(true); }}><BookOpen className="size-4" /> دليل الموقع</Button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="guide-title" dir="rtl" className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold text-muted-foreground">دليل استخدام الموقع · {step + 1} من {steps.length}</span><Button variant="ghost" size="icon" aria-label="إغلاق الدليل" onClick={close}><X className="size-5" /></Button></div>
        <div className="mb-5 flex gap-1.5" aria-label="تقدم الدليل">{steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
        <div className="mb-6 rounded-xl bg-muted/60 p-5"><BookOpen className="mb-3 size-8 text-primary" /><h2 id="guide-title" className="mb-3 text-xl font-extrabold">{steps[step]!.title}</h2><p className="leading-8 text-muted-foreground">{steps[step]!.description}</p></div>
        <Link to={steps[step]!.to} onClick={close} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{steps[step]!.action} <ArrowLeft className="size-4" /></Link>
        <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={close}>تخطي الدليل</Button><div className="flex gap-2"><Button variant="outline" disabled={step === 0} onClick={() => setStep((n) => n - 1)}><ArrowRight className="size-4" /> السابق</Button>{step === steps.length - 1 ? <Button onClick={close}><CheckCircle2 className="size-4" /> ابدأ الاستخدام</Button> : <Button onClick={() => setStep((n) => n + 1)}>التالي <ArrowLeft className="size-4" /></Button>}</div></div>
      </section>
    </div>}
  </>;
}
