import { normalizeArabic } from "./sheets/normalize";

/** A goal's photo is shared across center views, but never across plan years. */
export function presentationPhotoKey(year: number | null, goal: string, item: string) {
  return JSON.stringify([year, normalizeArabic(goal), normalizeArabic(item)]);
}

function openPhotos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("life-makers-presentation", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readPresentationPhotos(): Promise<Record<string, Blob | string>> {
  const db = await openPhotos();
  try {
    return await new Promise((resolve, reject) => {
      const out: Record<string, Blob | string> = {};
      const tx = db.transaction("photos", "readonly");
      const request = tx.objectStore("photos").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        out[String(cursor.key)] = cursor.value;
        cursor.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function writePresentationPhoto(key: string, value: Blob | string | null) {
  const db = await openPhotos();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      const store = tx.objectStore("photos");
      if (value === null) store.delete(key);
      else store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}