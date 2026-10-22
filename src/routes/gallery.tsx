import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Images, Lock } from "lucide-react";
import { Empty, Hero, Kpi } from "@/components/dash/ui";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import { buildGallery, thumbUrl, type GalleryPhoto } from "@/lib/sheets/gallery";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "معرض صور الأنشطة — صناع الحياة سوهاج" },
      { name: "description", content: "الصور التوثيقية لأنشطة صناع الحياة سوهاج حسب الإدارة والملف والمركز." },
      { property: "og:title", content: "معرض صور الأنشطة — صناع الحياة سوهاج" },
      { property: "og:description", content: "تصفح الصور التوثيقية لكل نشاط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">
        <option value="">الكل</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Thumb({ photo }: { photo: GalleryPhoto }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
        <Lock className="size-6" />
        الصورة محفوظة في نظام خارجي يتطلب تسجيل الدخول — اضغط لفتح الرابط الأصلي
      </div>
    );
  return <img src={photo.thumb} alt={photo.activity || photo.file} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover transition group-hover:scale-105" />;
}

function GalleryPage() {
  const ds = useDataset();
  const all = useMemo(() => buildGallery(ds.images, ds.activities), [ds]);
  const [dept, setDept] = useState("");
  const [file, setFile] = useState("");
  const [center, setCenter] = useState("");
  const [open, setOpen] = useState<GalleryPhoto | null>(null);
  const photos = all.filter((p) => (!dept || p.department === dept) && (!file || p.file === file) && (!center || p.center === center));

  return (
    <div>
      <Hero label="المعرض" title="معرض صور الأنشطة" subtitle="الصور التوثيقية من تقارير الأنشطة وتبويب «الصور»." back={{ to: "/", text: "الرئيسية" }} />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="إجمالي الصور" value={fmt(all.length)} icon={<Images className="size-5" />} />
        <Kpi label="الإدارات" value={fmt(uniq(all.map((p) => p.department)).length)} tone="accent" />
      </div>
      <div className="card-surface mt-6 grid gap-3 p-4 sm:grid-cols-3">
        <Select label="الإدارة" value={dept} options={uniq(all.map((p) => p.department))} onChange={(v) => { setDept(v); setFile(""); }} />
        <Select label="الملف" value={file} options={uniq(all.filter((p) => !dept || p.department === dept).map((p) => p.file))} onChange={setFile} />
        <Select label="المركز" value={center} options={uniq(all.map((p) => p.center))} onChange={setCenter} />
      </div>
      {photos.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <button key={p.url} onClick={() => setOpen(p)} className="card-surface group overflow-hidden text-start">
              <div className="aspect-square overflow-hidden bg-muted">
                <Thumb photo={p} />
              </div>
              <div className="p-2 text-xs">
                <div className="truncate font-bold">{p.activity || p.file || p.department}</div>
                <div className="truncate text-muted-foreground">{[p.center, p.date].filter(Boolean).join(" · ") || p.department}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty>لا توجد صور مطابقة. تظهر الصور تلقائياً عند إضافة روابطها في تقارير الأنشطة أو تبويب «الصور» في الشيت.</Empty>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && (
            <>
              <DialogTitle>{open.activity || open.file || open.department}</DialogTitle>
              <img src={thumbUrl(open.url, 1600)} alt={open.activity || open.file} referrerPolicy="no-referrer" className="max-h-[70vh] w-full rounded-lg object-contain" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{[open.department, open.file, open.center, open.date].filter(Boolean).join(" · ")}</span>
                <a href={open.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                  فتح الأصل <ExternalLink className="size-3" />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
