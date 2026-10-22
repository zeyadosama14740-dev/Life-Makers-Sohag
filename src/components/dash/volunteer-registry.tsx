import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Lock, Minus, MessageCircle, ShieldAlert, UserCheck, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/hooks/use-access";
import { getVolunteer, listVolunteers } from "@/lib/access.functions";
import type { VolunteerSummary } from "@/lib/sheets/volunteers";
import { fmt } from "@/lib/format";
import { Select } from "./activity-dashboard";
import { DataTable } from "./data-table";
import { Empty, Kpi, SectionTitle } from "./ui";
import { whatsappNumber } from "@/lib/sheets/identity";
import { getParticipationData } from "@/lib/participations.functions";
import { approvedTotals } from "@/lib/sheets/participations";

const STAGES = ["جذب", "استقبال", "تسكين", "تفعيل"] as const;

function StageMark({ on }: { on: boolean }) {
  return on ? <Check className="size-4 text-success" /> : <Minus className="size-4 text-muted-foreground" />;
}

export function VolunteerRegistry() {
  const me = useAccess();
  const allowed = !!me.data && (me.data.isAdmin || me.data.isCenterManager);
  const list = useQuery({ queryKey: ["volunteers"], queryFn: () => listVolunteers(), enabled: allowed, staleTime: 5 * 60 * 1000 });
  const [center, setCenter] = useState("");
  const [stage, setStage] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [placement, setPlacement] = useState("");
  const participation = useQuery({ queryKey: ["participations"], queryFn: () => getParticipationData(), enabled: allowed, staleTime: 300000 });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const profile = useQuery({ queryKey: ["volunteer", openKey], queryFn: () => { if (!openKey) throw new Error("لا يوجد ملف مختار"); return getVolunteer({ data: { key: openKey } }); }, enabled: !!openKey });
  const history = (participation.data?.rows ?? []).filter(r => r.volunteerKey === openKey);

  const [idStatus, setIdStatus] = useState("");
  const [hoursFilter, setHoursFilter] = useState("");
  const filteredRows = useMemo(
    () =>
      (list.data?.rows ?? []).filter(
        (r) => (!center || r.center === center) && (!stage || r.stages[stage as (typeof STAGES)[number]]) && (!gender || r.gender === gender) && (!age || r.ageGroup === age) && (!placement || (placement === "مسكن" ? !!r.placementFile : !r.placementFile)) && (!idStatus || (idStatus === "سليم" ? !!r.identityValid : !r.identityValid)),
      ),
    [list.data, center, stage, gender, age, placement, idStatus],
  );
  const centers = useMemo(() => [...new Set((list.data?.rows ?? []).map((r) => r.center))].sort(), [list.data]);
  const hoursByKey = useMemo(() => {
    const m = new Map<string, number>();
    const participationRows = participation.data?.rows ?? [];
    const groups = new Map<string, typeof participationRows>();
    participationRows.forEach((p) => { if (p.volunteerKey) groups.set(p.volunteerKey, [...(groups.get(p.volunteerKey) ?? []), p]); });
    groups.forEach((g, k) => m.set(k, approvedTotals(g).hours));
    return m;
  }, [participation.data]);
  const rows = filteredRows.filter(r => !hoursFilter || (hoursFilter === "له ساعات معتمدة" ? (hoursByKey.get(r.key) ?? 0) > 0 : (hoursByKey.get(r.key) ?? 0) === 0));
  const pctOf = (n: number) => (rows.length ? `${Math.round((n / rows.length) * 100)}% من المعروض` : undefined);

  if (me.isLoading) return null;
  if (!allowed)
    return (
      <>
        <SectionTitle>سجل المتطوعين</SectionTitle>
        <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="flex items-center gap-2"><Lock className="size-4 text-primary" />
            {me.data ? "حسابك لا يملك صلاحية عرض ملفات المتطوعين. اطلب من المسؤول الرئيسي منحك صلاحية مدير مركز." : "الملفات الفردية للمتطوعين متاحة للمسؤولين ومديري المراكز فقط."}
          </span>
          {!me.data && <Button asChild size="sm"><Link to="/auth">تسجيل الدخول</Link></Button>}
        </div>
      </>
    );

  return (
    <>
      <SectionTitle>
        ملف المتطوع والعضوية {list.data && !list.data.access.isAdmin && `— ${list.data.access.centers.join("، ") || "لا توجد مراكز مخصصة"}`}
      </SectionTitle>
      {list.isLoading ? (
        <Empty>جاري تحميل السجل…</Empty>
      ) : list.error ? (
        <Empty>{(list.error as Error).message}</Empty>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="المتطوعون (حسب الفلاتر)" value={rows.length} icon={<Users className="size-5" />} />
            <Kpi label="تم تسكينهم" value={rows.filter(r => r.placementFile).length} tone="success" icon={<UserCheck className="size-5" />} hint={pctOf(rows.filter(r => r.placementFile).length)} />
            <Kpi label="ذكور / إناث (مستنتج)" value={`${fmt(rows.filter(r => r.inferredGender === "ذكر").length)} / ${fmt(rows.filter(r => r.inferredGender === "أنثى").length)}`} tone="navy" icon={<Users className="size-5" />} />
            <Kpi label="رقم قومي يحتاج مراجعة" value={rows.filter(r => !r.identityValid).length} tone="accent" icon={<ShieldAlert className="size-5" />} hint={pctOf(rows.filter(r => !r.identityValid).length)} />
          </div>
          <div className="card-surface mb-3 p-4">
            <div className="mb-3 text-sm font-bold">مسار المتطوع — من الجذب إلى التفعيل</div>
            <div className="space-y-2">
              {STAGES.map((s) => { const n = rows.filter(r => r.stages[s]).length; const w = rows.length ? (n / rows.length) * 100 : 0; return (
                <button key={s} onClick={() => setStage(stage === s ? "" : s)} className={`flex w-full items-center gap-3 text-right text-xs transition-opacity ${stage && stage !== s ? "opacity-50" : ""}`}>
                  <span className="w-14 shrink-0 font-semibold">{s}</span>
                  <span className="h-6 flex-1 overflow-hidden rounded-md bg-muted"><span className="block h-full rounded-md bg-primary transition-all duration-700" style={{ width: `${w}%` }} /></span>
                  <span className="w-24 shrink-0 tabular-nums">{fmt(n)} · {Math.round(w)}%</span>
                </button>); })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">اضغط على مرحلة لتصفية الجدول بها.</p>
          </div>
          <div className="card-surface mb-3 grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
            <Select label="المركز" value={center} onChange={setCenter} options={centers} />
            <Select label="وصل لمرحلة" value={stage} onChange={setStage} options={[...STAGES]} />
            <Select label="النوع المسجل" value={gender} onChange={setGender} options={[...new Set((list.data?.rows ?? []).map(r => r.gender).filter(Boolean))]} />
            <Select label="الفئة العمرية" value={age} onChange={setAge} options={["أقل من 18", "18 - 24", "25 - 34", "35 فأكثر", "غير محدد"]} />
            <Select label="التسكين" value={placement} onChange={setPlacement} options={["مسكن", "غير مسكن"]} />
            <Select label="الرقم القومي" value={idStatus} onChange={setIdStatus} options={["سليم", "يحتاج مراجعة"]} />
            <Select label="ساعات المشاركة" value={hoursFilter} onChange={setHoursFilter} options={["له ساعات معتمدة", "بلا ساعات معتمدة"]} />
          </div>
          {(center || stage || gender || age || placement || idStatus || hoursFilter) && <Button variant="ghost" size="sm" className="mb-2" onClick={() => { setCenter(""); setStage(""); setGender(""); setAge(""); setPlacement(""); setIdStatus(""); setHoursFilter(""); }}><X className="size-4" /> مسح الفلاتر</Button>}
          <DataTable<VolunteerSummary>
            rows={rows}
            exportName="سجل-المتطوعين"
            onRowClick={(r) => setOpenKey(r.key)}
            columns={[
              { key: "vid", label: "Volunteer ID", value: r => r.volunteerId ?? "—" },
              { key: "code", label: "الكود", value: (r) => r.code },
              { key: "name", label: "الاسم", value: (r) => r.name },
              { key: "phone", label: "الموبايل", value: (r) => r.phone, render: r => <span className="flex items-center gap-2"><span dir="ltr">{r.phone}</span>{whatsappNumber(r.phone) && <Button asChild size="icon" variant="ghost" className="size-8"><a href={`https://wa.me/${whatsappNumber(r.phone)}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} aria-label="فتح واتساب" title="فتح واتساب"><MessageCircle className="size-4 text-success" /></a></Button>}</span> },
              { key: "gender", label: "النوع المسجل", value: r => r.gender },
              { key: "inferred", label: "النوع المستنتج", value: r => r.inferredGender ?? "غير محدد" },
              { key: "nid", label: "الرقم القومي", value: (r) => r.nationalId },
              { key: "center", label: "المركز", value: (r) => r.center },
              { key: "age", label: "السن", value: (r) => r.age },
              { key: "reg", label: "تاريخ التسجيل", value: (r) => r.registeredAt },
              ...STAGES.map((s) => ({ key: s, label: s, value: (r: VolunteerSummary) => (r.stages[s] ? "نعم" : "لا"), render: (r: VolunteerSummary) => <StageMark on={r.stages[s]} /> })),
              { key: "file", label: "ملف التسكين", value: (r) => r.placementFile },
              { key: "hours", label: "ساعات معتمدة", value: (r) => hoursByKey.get(r.key) ?? 0 },
            ]}
          />
        </>
      )}

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{profile.data?.name ?? "ملف المتطوع"}</DialogTitle>
          </DialogHeader>
          {profile.isLoading && <p className="text-sm text-muted-foreground">جاري التحميل…</p>}
          {profile.error && <p className="text-sm text-destructive">{(profile.error as Error).message}</p>}
          {profile.data && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  ["Volunteer ID", profile.data.volunteerId ?? "—"],
                  ["النوع المستنتج", profile.data.inferredGender ?? "غير محدد"],
                  ["تاريخ الميلاد", profile.data.birthDate ?? "—"],
                  ["الفئة العمرية", profile.data.ageGroup ?? "غير محدد"],
                  ["حالة الرقم القومي", profile.data.identityValid ? "مستوفٍ للتحقق الأساسي" : "يحتاج مراجعة"],
                  ["الكود", profile.data.code],
                  ["الموبايل", profile.data.phone],
                  ["الرقم القومي", profile.data.nationalId],
                  ["المركز", profile.data.center],
                  ["النوع", profile.data.gender],
                  ["السن", profile.data.age ?? ""],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted p-2"><div className="text-xs text-muted-foreground">{k}</div><div className="font-bold">{v || "—"}</div></div>
                ))}
              </div>
              {profile.data.genderConflict && <p role="alert" className="rounded-md bg-warning/15 p-3 text-sm">النوع المسجل يختلف عن النوع المستنتج؛ يحتاج مراجعة.</p>}
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <span key={s} className={profile.data?.stages[s] ? "rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success" : "rounded-full border px-3 py-1 text-xs text-muted-foreground"}>
                    {s} {profile.data?.stages[s] ? "✓" : "— لم يتم"}
                  </span>
                ))}
              </div>
              {profile.data.stageDetails.map((d, i) => (
                <details key={i} className="rounded-lg border p-3" open={i === 0}>
                  <summary className="cursor-pointer font-bold text-primary">بيانات مرحلة {d.stage}{d.repeats ? ` (مسجل ${d.repeats} مرات في الشيت)` : ""}</summary>
                  <dl className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {d.fields.map((f, j) => (
                      <div key={j} className="border-b pb-1"><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="break-words">{f.value}</dd></div>
                    ))}
                  </dl>
                </details>
              ))}
              <div>
                <div className="mb-1 font-bold">سجل المشاركات</div>
                {participation.isLoading && <p className="text-xs text-muted-foreground">جارٍ تحميل المشاركات…</p>}
                {participation.error && <p role="alert" className="text-xs text-destructive">{participation.error.message}</p>}
                <p className="mb-3 text-xs text-muted-foreground">الساعات المعتمدة: {approvedTotals(history).hours} · المشاركات المعتمدة: {approvedTotals(history).participations}</p>
                {history.length ? (
                  <ul className="space-y-1">
                    {history.map((a) => (
                      <li key={a.id} className="rounded-md border p-3">{a.activity || "نشاط غير محدد"}<div className="text-xs text-muted-foreground">{a.date ?? "—"} · {a.project} · {a.hours ?? "—"} ساعة · {a.approved ? "معتمد" : "غير معتمد"} · {a.attendance}</div></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">لا توجد مشاركات مرتبطة بمعرّف موثوق. تشابه اسم مقدّم التقرير لا يثبت مشاركة المتطوع.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
