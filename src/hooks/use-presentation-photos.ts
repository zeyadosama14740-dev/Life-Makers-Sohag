import { useEffect, useRef, useState } from "react";
import { readPresentationPhotos, writePresentationPhoto } from "@/lib/presentation-photos";

export function usePresentationPhotos() {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const objectUrls = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    readPresentationPhotos().then((saved) => {
      if (!active) return;
      const urls: Record<string, string> = {};
      for (const [key, value] of Object.entries(saved)) {
        const url = typeof value === "string" ? value : URL.createObjectURL(value);
        if (typeof value !== "string") objectUrls.current.add(url);
        urls[key] = url;
      }
      setPhotos(urls);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => {
      active = false;
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    };
  }, []);

  const save = async (key: string, value: Blob | string | null) => {
    await writePresentationPhoto(key, value);
    const url = value === null ? null : typeof value === "string" ? value : URL.createObjectURL(value);
    if (value instanceof Blob && url) objectUrls.current.add(url);
    setPhotos((previous) => {
      const next = { ...previous };
      if (url) next[key] = url;
      else delete next[key];
      return next;
    });
  };
  return { photos, ready, save };
}