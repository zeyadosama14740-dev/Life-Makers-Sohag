import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import { SectionTitle } from "@/components/dash/ui";
import { useSitePhotos } from "@/hooks/use-site-photos";

/** Rotating banner + strip of the newest field photos (Drive folders and activity sheet). */
export function FieldPhotos() {
  const { photos } = useSitePhotos();
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const list = photos.filter((p) => !failed.has(p.url)).slice(0, 12);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, [list.length]);
  if (!list.length) return null;
  const current = list[i % list.length]!;
  const fail = (url: string) => setFailed((s) => new Set(s).add(url));
  return (
    <section>
      <SectionTitle action={<Link to="/gallery" className="text-sm font-bold text-primary">كل الصور ←</Link>}>من الميدان</SectionTitle>
      <div className="relative h-56 overflow-hidden rounded-2xl bg-navy md:h-72">
        <img key={current.url} src={current.url} alt={current.label} referrerPolicy="no-referrer" onError={() => fail(current.url)} className="animate-fade-up absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
        <div className="absolute bottom-0 p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs opacity-80"><Images className="size-4" />{current.date ?? ""}</div>
          <p className="mt-1 line-clamp-2 text-lg font-extrabold">{current.label.replace(/\.[a-z]{3,4}\b/i, "")}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {list.map((p, n) => (
          <button key={p.url} aria-label={p.label} onClick={() => setI(n)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${n === i % list.length ? "border-accent" : "border-transparent"}`}>
            <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => fail(p.url)} className="size-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}
