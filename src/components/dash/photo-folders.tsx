import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPhotoFolder, drivePhotosQuery, listPhotoFolders, removePhotoFolder } from "@/lib/drive-photos.functions";

export function PhotoFolders() {
  const qc = useQueryClient();
  const folders = useQuery({ queryKey: ["photo-folders"], queryFn: () => listPhotoFolders() });
  const drive = useQuery(drivePhotosQuery);
  const add = useServerFn(addPhotoFolder);
  const remove = useServerFn(removePhotoFolder);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["photo-folders"] }), qc.invalidateQueries({ queryKey: drivePhotosQuery.queryKey })]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await add({ data: { url, label } });
      setUrl(""); setLabel("");
      toast.success("تم ربط المجلد");
      await refresh();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">أضف رابط مجلد صور على Google Drive، وهتظهر صوره تلقائيًا كخلفيات في العرض الحي والتقويم والرئيسية، وتتحدث كل ٥ دقائق. اكتب في اسم الصورة اسم النشاط (مثلاً «قافلة طبية») علشان تتربط بالنشاط الصح.</p>
      <form onSubmit={submit} className="card-surface grid gap-3 p-4 md:grid-cols-[1fr_200px_auto]">
        <Input required dir="ltr" placeholder="https://drive.google.com/drive/folders/..." value={url} onChange={(e) => setUrl(e.target.value)} aria-label="رابط المجلد" />
        <Input required placeholder="اسم المجلد" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="اسم المجلد" />
        <Button disabled={busy}>{busy ? "جاري الربط…" : "ربط المجلد"}</Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <span>{drive.data ? `${drive.data.photos.length} صورة من ${drive.data.folders} مجلد · آخر تحديث ${new Date(drive.data.fetchedAt).toLocaleTimeString("ar-EG")}` : "جاري التحميل…"}</span>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw />تحديث الآن</Button>
      </div>
      {drive.data?.errors.map((e) => <p key={e} className="text-sm text-destructive">{e}</p>)}
      <ul className="space-y-2">
        {folders.data?.map((f) => (
          <li key={f.folder_id} className="card-surface flex items-center justify-between p-3">
            <span className="font-bold">{f.label}</span>
            <Button variant="ghost" size="sm" aria-label={`إزالة ${f.label}`} onClick={async () => { try { await remove({ data: { folderId: f.folder_id } }); await refresh(); } catch (err) { toast.error((err as Error).message); } }}><Trash2 /></Button>
          </li>
        ))}
        {folders.data?.length === 0 && <li className="text-sm text-muted-foreground">لا توجد مجلدات مربوطة بعد.</li>}
      </ul>
    </div>
  );
}
