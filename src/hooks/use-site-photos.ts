import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDataset } from "@/hooks/use-dataset";
import { drivePhotosQuery } from "@/lib/drive-photos.functions";
import { matchPhoto, type SitePhoto } from "@/lib/photo-match";
import { buildGallery } from "@/lib/sheets/gallery";

/** Drive-folder photos (refreshed every 5 minutes) plus activity-sheet photos, with a label matcher. */
export function useSitePhotos() {
  const ds = useDataset();
  const drive = useQuery(drivePhotosQuery);
  const photos = useMemo<SitePhoto[]>(() => {
    const fromDrive = (drive.data?.photos ?? []).map((p) => ({ url: `/api/public/drive-image/${p.id}`, label: `${p.name} ${p.folder}`, date: p.modified.slice(0, 10) }));
    const fromSheets = buildGallery(ds.images, ds.activities).map((g) => ({ url: g.thumb, label: `${g.activity} ${g.file} ${g.department}`, date: g.date }));
    return [...fromDrive, ...fromSheets];
  }, [drive.data, ds]);
  const find = (label: string) => matchPhoto(label, photos)?.url ?? null;
  return { photos, find, drive: drive.data, driveLoading: drive.isLoading };
}
