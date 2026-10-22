import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ImagePlus, Copy, Keyboard, LayoutGrid, Maximize, Pause, PieChart, Play, Timer, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PresentationPhotoPicker } from "@/components/dash/presentation-photo-picker";
import { usePresentationPhotos } from "@/hooks/use-presentation-photos";
import { useSitePhotos } from "@/hooks/use-site-photos";
import { presentationPhotoKey } from "@/lib/presentation-photos";
import { buildGallery } from "@/lib/sheets/gallery";
import logo from "@/assets/logo.png.asset.json";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import { buildCenterDeck, buildDeck, buildSummary, type DeckGoal } from "@/lib/sheets/deck";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildActivityDeck, isActivityGoal } from "@/lib/sheets/activity-deck";
import { ActivityCard, ActivityDetails } from "@/components/dash/activity-slide";

type Mode = "activities" | "goals" | "centers";
type Panel = "overview" | "summary" | "help" | null;
const SPEEDS = [5000, 8000, 15000];
/** Above 100% stays truthful, but a phrase reads better on a slide than a huge number. */
const pctLabel = (p: number | null) => (p === null ? "—" : p > 100 ? "أكثر من ١٠٠٪" : `${p}%`);

export const Route = createFileRoute("/presentation")({
  validateSearch: (s: Record<string, unknown>) => ({
    slide: Math.max(1, Number(s["slide"]) || 1),
    mode: (s["mode"] === "centers" ? "centers" : s["mode"] === "goals" ? "goals" : "activities") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "أنشطة صناع الحياة سوهاج — العرض الحي" },
      { name: "description", content: "عرض أنشطة وأهداف صناع الحياة سوهاج بأرقام Google Sheets الحية وصور الأنشطة وتفاصيل المراكز." },
      { property: "og:title", content: "أنشطة صناع الحياة سوهاج — العرض الحي" },
      { property: "og:description", content: "الأنشطة والإنجاز والأهداف لكل مركز، مباشرة من Google Sheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;500;700&display=swap" }],
  }),
  component: PresentationPage,
});

function PresentationPage() {
  const ds = useDataset();
  const { photos, ready: photosReady, save: savePhoto } = usePresentationPhotos();
  const site = useSitePhotos();
  const gallery = useMemo(() => buildGallery(ds.images, ds.activities), [ds]);
  const [photoGoal, setPhotoGoal] = useState<DeckGoal | null>(null);
  const { slide, mode } = Route.useSearch();
  const deck = useMemo(
    () => (mode === "activities" ? buildActivityDeck(ds.activities) : mode === "centers" ? buildCenterDeck(ds.centerPlans) : buildDeck(ds.plans, ds.centerPlans)),
    [ds, mode],
  );
  const summary = useMemo(() => buildSummary(ds.plans, ds.centerPlans), [ds]);
  const navigate = useNavigate({ from: "/presentation" });
  const total = deck.slides.length;
  const idx = Math.min(slide, Math.max(total, 1)) - 1;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8000);
  const [panel, setPanel] = useState<Panel>(null);
  const [detail, setDetail] = useState<DeckGoal | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (n: number, m: Mode = mode) =>
      total && navigate({ search: { slide: ((n % total) + total) % total + 1, mode: m }, replace: true }),
    [navigate, total, mode],
  );
  const setMode = (m: Mode) => {
    setPanel(null);
    setDetail(null);
    navigate({ search: { slide: 1, mode: m }, replace: true });
  };
  const toggleFullscreen = () =>
    document.fullscreenElement ? void document.exitFullscreen() : void box.current?.requestFullscreen();

  const copyNumbers = async () => {
    const text = [
      `صناع الحياة سوهاج — ${mode === "activities" ? "الأنشطة والإنجاز" : mode === "centers" ? "إنجاز المراكز" : "الأهداف والإنجاز"} ${deck.year ?? ""}`,
      ...deck.slides.flatMap((s) => [
        s.title,
        ...s.goals.map((g) => isActivityGoal(g) ? `• ${g.item}: ${g.metrics.map(m=>`${m.label}: ${m.value === null ? "—" : fmt(m.value)}`).join(" · ")}` : `• ${g.item}: ${fmt(g.achieved ?? 0)} من ${fmt(g.target ?? 0)}${g.pct === null ? "" : ` (${g.pct}%)`}`),
      ]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ أرقام العرض");
    } catch {
      toast.error("تعذر النسخ من المتصفح");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (photoGoal) {
        if (e.key === "Escape") setPhotoGoal(null);
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (detail) {
        if (e.key === "Escape") setDetail(null);
        return;
      }
      if (panel) {
        if (e.key === "Escape" || e.key === "o") setPanel(null);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === " ") go(idx + 1);
      else if (e.key === "ArrowRight") go(idx - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key === "o" || e.key === "O") setPanel("overview");
      else if (e.key === "s" || e.key === "S") setPanel("summary");
      else if (e.key === "?") setPanel("help");
      else if (e.key === "p" || e.key === "P") setPlaying((p) => !p);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, idx, detail, panel, total, photoGoal]);

  useEffect(() => {
    if (!playing || detail || panel || photoGoal) return;
    const t = setTimeout(() => go(idx + 1), speed);
    return () => clearTimeout(t);
  }, [playing, idx, go, detail, panel, speed, photoGoal]);

  const s = deck.slides[idx];
  useEffect(() => {
    if (s) document.title = `${idx + 1}/${total} — ${s.title}`;
  }, [s, idx, total]);

  return (
    <div
      ref={box}
      className={cn("deck-surface relative flex min-h-[78vh] flex-col overflow-hidden rounded-3xl [&:fullscreen]:rounded-none", mode === "activities" && "activity-presentation")}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const x = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (detail || panel || photoGoal) return;
        if (x !== null && end !== undefined && Math.abs(end - x) > 50) go(end < x ? idx + 1 : idx - 1);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-primary-foreground/10">
        <i className="block h-full bg-[color:var(--deck-gold)] transition-all duration-700" style={{ width: `${total ? ((idx + 1) / total) * 100 : 0}%` }} />
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 md:px-8">
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="شعار صناع الحياة سوهاج" className="size-12 rounded-xl bg-card object-contain p-1" />
          <span className="text-sm text-[color:var(--deck-mute)]">صناع الحياة سوهاج · {mode === "activities" ? "الأنشطة والإنجاز" : mode === "centers" ? "إنجاز المراكز" : "الأهداف والإنجاز"} {deck.year ?? ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-primary-foreground/15 p-0.5">
            {(["activities", "goals", "centers"] as Mode[]).map((m) => (
              <Button variant="ghost"
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition",
                  mode === m ? "bg-[color:var(--deck-gold)] text-navy font-bold" : "text-[color:var(--deck-mute)] hover:text-[color:var(--deck-gold)]",
                )}
              >
                {m === "activities" ? "الأنشطة" : m === "goals" ? "حسب الهدف" : "حسب المركز"}
              </Button>
            ))}
          </div>
          <DeckBtn label="نظرة عامة على كل الشرائح (o)" onClick={() => setPanel("overview")}><LayoutGrid className="size-4" /></DeckBtn>
          <DeckBtn label="ملخص الإنجاز (s)" onClick={() => setPanel("summary")}><PieChart className="size-4" /></DeckBtn>
          <DeckBtn label="اختصارات لوحة المفاتيح (؟)" onClick={() => setPanel("help")}><Keyboard className="size-4" /></DeckBtn>
          <DeckBtn label="نسخ الأرقام" onClick={copyNumbers}><Copy className="size-4" /></DeckBtn>
          <DeckBtn label="مدة العرض التلقائي" onClick={() => setSpeed((v) => SPEEDS[(SPEEDS.indexOf(v) + 1) % SPEEDS.length] ?? 8000)}>
            <Timer className="size-4" /><span className="text-[10px] font-bold">{fmt(speed / 1000)}ث</span>
          </DeckBtn>
          <DeckBtn label="ملء الشاشة (f)" onClick={toggleFullscreen}><Maximize className="size-4" /></DeckBtn>
          <DeckBtn label="السابق" onClick={() => go(idx - 1)}><ChevronRight className="size-4" /></DeckBtn>
          <DeckBtn label={playing ? "إيقاف العرض التلقائي (p)" : "تشغيل تلقائي (p)"} onClick={() => setPlaying((p) => !p)}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</DeckBtn>
          <DeckBtn label="التالي" onClick={() => go(idx + 1)}><ChevronLeft className="size-4" /></DeckBtn>
        </div>
      </header>

      {s ? (
        <section key={`${mode}-${idx}`} className="flex flex-1 flex-col justify-center gap-6 px-5 py-6 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="deck-anim max-w-[22ch] text-2xl font-extrabold leading-snug md:text-4xl">{s.title}</h2>
            <span className="rounded-full border border-primary-foreground/15 px-3 py-1 text-xs text-[color:var(--deck-mute)]">
              {s.goals.length} {mode === "activities" ? "أنشطة" : mode === "centers" ? "بند" : "أهداف"} · شريحة {idx + 1} من {total}
            </span>
          </div>
          <div className={mode === "activities" ? "activity-grid" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
            {s.goals.map((g, i) => {
              const photoKey = presentationPhotoKey(deck.year, g.goal ?? s.title, g.item);
              const photo = photos[photoKey] ?? site.find(`${g.item} ${g.goal ?? s.title}`);
              if (isActivityGoal(g)) return <ActivityCard key={photoKey} goal={g} photo={photo} ready={photosReady} onPhoto={()=>setPhotoGoal(g)} onDetail={()=>setDetail(g)}/>;
              return (
                <article key={photoKey} style={{ animationDelay: `${i * 0.12 + 0.15}s` }} className={cn("deck-card deck-anim deck-photo-card flex min-h-80 flex-col", photo && "border-primary-foreground/20")}>
                  {photo && <img className="deck-photo" src={photo} alt={g.item} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
                  <div className="flex justify-end p-3">
                    <Button variant="ghost" size="sm" disabled={!photosReady} aria-label={`${photo ? "تغيير" : "إضافة"} صورة: ${g.item}`} title="الصورة محفوظة على هذا الجهاز" onClick={() => setPhotoGoal(g)} className="rounded-full border border-primary-foreground/25 bg-navy/75 text-primary-foreground hover:bg-accent hover:text-accent-foreground"><ImagePlus />{photo ? "تغيير الصورة" : "أضف صورة"}</Button>
                  </div>
                  <Button variant="ghost" onClick={() => setDetail(g)} className="deck-photo-copy h-auto flex-1 flex-col items-stretch justify-end gap-3 whitespace-normal rounded-none p-5 text-start text-primary-foreground hover:bg-primary-foreground/5">
                    <span className="w-fit rounded-full bg-primary-foreground/10 px-3 py-0.5 text-xs">التفاصيل ‹</span>
                    <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                      <span className="text-4xl font-extrabold text-[color:var(--deck-gold)] md:text-5xl">{fmt(g.achieved ?? 0)}</span>
                      <span className="text-sm">من {fmt(g.target ?? 0)}</span>
                    </div>
                    {g.goal && <span className="w-fit text-xs text-[color:var(--deck-gold)]">{g.goal}</span>}
                    <div className="min-h-[3em] leading-relaxed">{g.item}</div>
                    <Bar pct={g.pct} />
                    <div className="flex justify-between gap-2 text-xs text-[color:var(--deck-mute)]"><span>نسبة الإنجاز السنوي</span><span>{pctLabel(g.pct)}</span></div>
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="m-auto p-8 text-center">
          {mode === "centers" ? "لا توجد بيانات مراكز لهذا العام بعد." : "لا توجد أهداف بمستهدفات في الماستر بلان الحالي."}
        </p>
      )}

      <footer className="flex items-center justify-between gap-3 px-5 pb-4 text-xs text-[color:var(--deck-mute)] md:px-8">
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {deck.slides.map((x, i) => (
            <Button variant="ghost" key={`${x.title}-${i}`} aria-label={x.title} onClick={() => go(i)} className={cn("h-2 shrink-0 rounded-full p-0 transition-all", i === idx ? "w-6 bg-[color:var(--deck-gold)]" : "w-2 bg-primary-foreground/30 hover:bg-primary-foreground/60")} />
          ))}
        </div>
        <span suppressHydrationWarning>{total ? `${idx + 1} / ${total}` : ""} · الأرقام مباشرة من Google Sheets — آخر تحديث {new Date(ds.generatedAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</span>
      </footer>
      {playing && <div className="activity-timer"><i key={`${mode}-${idx}-${speed}-${!!detail}-${!!panel}-${!!photoGoal}`} style={{animationDuration:`${speed}ms`,animationPlayState:detail || panel || photoGoal ? "paused" : "running"}}/></div>}

      {photoGoal && (
        <PresentationPhotoPicker title={photoGoal.item} current={photos[presentationPhotoKey(deck.year, photoGoal.goal ?? s?.title ?? "", photoGoal.item)]} gallery={gallery} onClose={() => setPhotoGoal(null)} onSave={(value) => savePhoto(presentationPhotoKey(deck.year, photoGoal.goal ?? s?.title ?? "", photoGoal.item), value)} />
      )}

      {panel === "overview" && (
        <Overlay title="نظرة عامة" onClose={() => setPanel(null)}>
          {total ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {deck.slides.map((x, i) => {
                const pcts = x.goals.map((g) => g.pct).filter((p): p is number => p !== null);
                const avg = pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null;
                return (
                  <Button variant="ghost"
                    key={`${x.title}-${i}`}
                    onClick={() => {
                      setPanel(null);
                      go(i);
                    }}
                    className={cn(
                      "deck-card flex items-center justify-between gap-3 p-3 text-start transition hover:border-[color:var(--deck-gold)]",
                      i === idx && "border-[color:var(--deck-gold)]",
                    )}
                  >
                    <span className="min-w-0">
                      <b className="block truncate">{x.title}</b>
                      <small className="text-[color:var(--deck-mute)]">{x.goals.length} بند</small>
                    </span>
                    <span className="shrink-0 tabular-nums text-[color:var(--deck-gold)]">{mode === "activities" ? fmt(x.goals.reduce((n,g)=>n+(isActivityGoal(g) ? g.records.length : 0),0)) + " تقرير" : pctLabel(avg)}</span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--deck-mute)]">لا توجد شرائح بعد.</p>
          )}
        </Overlay>
      )}

      {panel === "summary" && (
        <Overlay title={mode === "activities" ? "ملخص الأنشطة والإنجاز" : `ملخص الإنجاز ${summary.year ?? ""}`} onClose={() => setPanel(null)}>
          {mode === "activities" ? <>
            <div className="activity-kpis">
              {[["تقارير الأنشطة",ds.activities.length],["مستفيدين",ds.activities.reduce((n,r)=>n+r.beneficiaries,0)],["متطوعين",ds.activities.reduce((n,r)=>n+r.volunteers,0)],["المراكز",new Set(ds.activities.map(r=>r.center)).size]].map(([label,value])=><div key={label}><b>{fmt(Number(value))}</b><span>{label}</span></div>)}
            </div>
            <div className="activity-chips">{[...new Set(ds.activities.map(r=>r.department))].map(d=><span key={d}>{d} · {fmt(ds.activities.filter(r=>r.department===d).length)} تقرير</span>)}</div>
          </> : <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["متوسط التحقيق", summary.avgPct === null ? "—" : `${summary.avgPct}%`],
              ["بنود مقاسة", fmt(summary.items)],
              ["بنود مكتملة", fmt(summary.onTrack)],
              ["بنود متأخرة", fmt(summary.behind)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-3 text-center">
                <b className="block text-2xl text-[color:var(--deck-gold)] tabular-nums">{v}</b>
                <span className="text-xs text-[color:var(--deck-mute)]">{l}</span>
              </div>
            ))}
          </div>
          <h4 className="text-sm text-[color:var(--deck-mute)]">المراكز حسب متوسط التحقيق</h4>
          {summary.topCenters.length ? (
            <div className="grid gap-1.5">
              {summary.topCenters.map((c) => (
                <div key={c.center} className="grid grid-cols-[90px_1fr_60px] items-center gap-3 text-sm">
                  <span className="truncate">{c.center}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-primary-foreground/10">
                    <i className="block h-full rounded-full bg-[color:var(--deck-gold)] transition-all duration-700" style={{ width: `${Math.min(100, c.pct ?? 0)}%` }} />
                  </div>
                  <strong className="text-end tabular-nums">{c.pct === null ? "—" : `${c.pct}%`}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--deck-mute)]">لا توجد بيانات أرباع للمراكز بعد.</p>
          )}
          <p className="text-xs text-[color:var(--deck-mute)]">
            المتوسط محسوب من بنود الماستر بلان التي لها مستهدف سنوي وتحقيق مسجل، وكل بند يساوي بحد أقصى ١٠٠٪.
          </p>
          </>}
        </Overlay>
      )}

      {panel === "help" && (
        <Overlay title="اختصارات لوحة المفاتيح" onClose={() => setPanel(null)}>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["→ أو ←", "الشريحة السابقة / التالية"],
              ["مسافة", "الشريحة التالية"],
              ["Home / End", "أول شريحة / آخر شريحة"],
              ["o", "نظرة عامة على كل الشرائح"],
              ["s", "ملخص الإنجاز"],
              ["p", "تشغيل أو إيقاف العرض التلقائي"],
              ["f", "ملء الشاشة"],
              ["؟", "هذه القائمة"],
              ["Esc", "إغلاق أي نافذة"],
              ["سحب بالإصبع", "التنقل على الهاتف"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-3 py-2">
                <kbd className="rounded-md bg-primary-foreground/15 px-2 py-0.5 text-xs" dir="ltr">{k}</kbd>
                <span className="text-[color:var(--deck-mute)]">{v}</span>
              </li>
            ))}
          </ul>
        </Overlay>
      )}

      {detail && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy/80 p-4 backdrop-blur" onClick={() => setDetail(null)}>
          <div className="deck-card deck-anim relative grid max-h-full w-full max-w-4xl gap-4 overflow-auto p-6" role="dialog" aria-label={detail.item} onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" aria-label="إغلاق" onClick={() => setDetail(null)} className="absolute left-4 top-4 grid size-9 place-items-center rounded-full border border-primary-foreground/20 hover:bg-[color:var(--deck-gold)]"><X className="size-4" /></Button>
            <div>
              <small className="text-[color:var(--deck-gold)]">{s?.title}</small>
              {detail.goal && <p className="text-xs text-[color:var(--deck-mute)]">{detail.goal}</p>}
              <h3 className="mt-1 text-xl font-bold md:text-2xl">{detail.item}</h3>
            </div>
            {isActivityGoal(detail) ? <ActivityDetails key={detail.activityId} goal={detail}/> : <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[["المستهدف السنوي", fmt(detail.target ?? 0)], ["المحقق", fmt(detail.achieved ?? 0)], ["نسبة الإنجاز", pctLabel(detail.pct)]].map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                  <b className="block text-2xl text-[color:var(--deck-gold)] tabular-nums">{v}</b>
                  <span className="text-xs text-[color:var(--deck-mute)]">{l}</span>
                </div>
              ))}
            </div>
            <h4 className="text-sm text-[color:var(--deck-mute)]">الإنجاز حسب المركز (مجموع الأرباع المسجلة)</h4>
            {detail.centers.length ? (
              <div className="grid gap-1.5">
                {detail.centers.map((c) => {
                  const max = Math.max(...detail.centers.map((x) => x.achieved), 1);
                  return (
                    <div key={c.center} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-sm">
                      <span>{c.center}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-primary-foreground/10"><i className="block h-full rounded-full bg-[color:var(--deck-gold)]" style={{ width: `${(c.achieved / max) * 100}%` }} /></div>
                      <strong className="text-end tabular-nums">{fmt(c.achieved)} / {fmt(c.target)}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--deck-mute)]">هذا البند غير موزع على المراكز في تبويبات الأرباع.</p>
            )}
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-navy/85 p-4 backdrop-blur md:p-8" onClick={onClose}>
      <div className="deck-card deck-anim grid w-full max-w-4xl gap-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold md:text-xl">{title}</h3>
          <Button variant="ghost" aria-label="إغلاق" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-primary-foreground/20 transition hover:bg-[color:var(--deck-gold)]">
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeckBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" aria-label={label} title={label} onClick={onClick} className="flex items-center gap-1 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-2 py-1.5 text-[color:var(--deck-mute)] transition hover:border-[color:var(--deck-gold)] hover:bg-[color:var(--deck-gold)] hover:text-navy">
      {children}
    </Button>
  );
}

function Bar({ pct }: { pct: number | null }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-primary-foreground/15">
      <i className="block h-full rounded-full bg-gradient-to-l from-[color:var(--deck-gold)] to-primary-foreground transition-all duration-1000" style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
    </div>
  );
}
