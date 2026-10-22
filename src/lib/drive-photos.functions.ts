import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DrivePhoto { id: string; name: string; folder: string; modified: string }

/** Public: image files in the admin-configured Drive folders (names only, no private data). */
export const getDrivePhotos = createServerFn({ method: "GET" }).handler(async () => {
  const { driveFetch, configuredFolders } = await import("./drive.server");
  const folders = await configuredFolders();
  const out: DrivePhoto[] = [];
  const errors: string[] = [];
  for (const f of folders) {
    try {
      const q = encodeURIComponent(`'${f.folder_id}' in parents and mimeType contains 'image/' and trashed = false`);
      const res = await driveFetch(`/files?q=${q}&pageSize=500&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
      const json = (await res.json()) as { files?: { id: string; name: string; modifiedTime: string }[] };
      for (const file of json.files ?? []) out.push({ id: file.id, name: file.name, folder: f.label, modified: file.modifiedTime });
    } catch (e) {
      errors.push(`${f.label}: ${(e as Error).message}`);
    }
  }
  return { photos: out, folders: folders.length, errors, fetchedAt: new Date().toISOString() };
});

export const drivePhotosQuery = queryOptions({
  queryKey: ["drive-photos"],
  queryFn: () => getDrivePhotos(),
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
});

function folderIdFrom(input: string) {
  const m = input.match(/folders\/([\w-]{10,})/) ?? input.match(/[?&]id=([\w-]{10,})/);
  return m?.[1] ?? (/^[\w-]{10,}$/.test(input.trim()) ? input.trim() : null);
}

export const listPhotoFolders = createServerFn({ method: "GET" }).handler(async () => {
  const { configuredFolders } = await import("./drive.server");
  return configuredFolders();
});

export const addPhotoFolder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().min(5).max(500), label: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("للمسؤول الرئيسي فقط");
    const id = folderIdFrom(data.url);
    if (!id) throw new Error("رابط مجلد Google Drive غير صالح");
    const { driveFetch } = await import("./drive.server");
    const meta = (await (await driveFetch(`/files/${id}?fields=id,name,mimeType&supportsAllDrives=true`)).json()) as { mimeType: string };
    if (meta.mimeType !== "application/vnd.google-apps.folder") throw new Error("الرابط ليس مجلدًا");
    const { error } = await context.supabase.from("photo_folders").insert({ folder_id: id, label: data.label });
    if (error) throw new Error(error.code === "23505" ? "المجلد مضاف بالفعل" : error.message);
    return { ok: true };
  });

export const removePhotoFolder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ folderId: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("photo_folders").delete().eq("folder_id", data.folderId);
    if (error) throw error;
    return { ok: true };
  });
