import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryPhoto } from "@/lib/sheets/gallery";
import { toast } from "sonner";

export function PresentationPhotoPicker({ title, current, gallery, onSave, onClose }: {
  title: string;
  current?: string | undefined;
  gallery: GalleryPhoto[];
  onSave: (value: Blob | string | null) => Promise<void>;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const save = async (value: Blob | string | null) => {
    setBusy(true);
    try {
      await onSave(value);
      toast.success(value === null ? "تم إزالة الصورة" : "تم حفظ الصورة على هذا الجهاز");
      onClose();
    } catch {
      toast.error("تعذر حفظ الصورة على الجهاز؛ جرّب صورة أصغر أو اسمح بتخزين بيانات الموقع");
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-3 backdrop-blur" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`صورة ${title}`} className="deck-card grid max-h-[90dvh] w-full max-w-3xl gap-4 overflow-auto p-5 text-primary-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="text-lg font-bold">صورة النشاط</h3><p className="mt-1 text-sm text-[color:var(--deck-mute)]">{title}</p></div>
          <Button autoFocus variant="ghost" size="icon" aria-label="إغلاق الصور" onClick={onClose}><X /></Button>
        </div>
        {current && <img src={current} alt={title} className="aspect-video max-h-56 w-full rounded-lg object-cover" />}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => input.current?.click()}><Upload />رفع صورة من الجهاز</Button>
          {current && <Button disabled={busy} variant="destructive" onClick={() => save(null)}><Trash2 />إزالة الصورة</Button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="رفع صورة النشاط" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error("اختار صورة JPG أو PNG أو WebP"); return; }
          if (file.size > 20 * 1024 * 1024) { toast.error("حجم الصورة يجب ألا يتجاوز ٢٠ ميجابايت"); return; }
          void save(file);
        }} />
        {gallery.length > 0 && <>
          <h4 className="flex items-center gap-2 text-sm text-[color:var(--deck-mute)]"><ImagePlus className="size-4" />صور الأنشطة</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((photo) => <Button key={photo.url} disabled={busy} variant="ghost" className="h-auto min-w-0 flex-col items-stretch gap-1 whitespace-normal p-0 text-start" onClick={() => save(photo.thumb)}>
              <img src={photo.thumb} alt={photo.activity || photo.file} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full rounded-lg object-cover" />
              <span className="line-clamp-2 text-xs">{photo.activity || photo.file}{photo.center ? ` · ${photo.center}` : ""}</span>
            </Button>)}
          </div>
        </>}
      </div>
    </div>
  );
}