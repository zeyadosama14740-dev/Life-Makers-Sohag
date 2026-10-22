// Private durable last-good source cache; raw grids never leave server handlers.
import { createClient } from "@supabase/supabase-js";
import type { FetchedSource } from "./build";
import type { SourceConfig } from "./source-config";
import { fetchSpreadsheet } from "./source-fetch.server";

const CACHE_MS = 5 * 60 * 1000;
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("إعدادات الاتصال غير متاحة");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
}
export async function getRawSources(force = false): Promise<FetchedSource[]> {
  const { data: rows, error } = await publicClient().from("data_sources")
    .select("id,label,spreadsheet_id,category,year,source_type,config").eq("enabled", true).order("year");
  if (error) throw new Error(`تعذر قراءة المصادر: ${error.message}`);
  // Privilege is limited to private import/cache grids belonging to public enabled sources.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all((rows ?? []).map(async (source) => {
    const out: FetchedSource = { id: source.id, label: source.label, year: source.year, category: source.category,
      config: source.config as SourceConfig, tabs: [] };
    if (source.source_type !== "google_sheets") {
      const { data, error } = await supabaseAdmin.from("data_sources").select("import_tabs").eq("id", source.id).single();
      if (error) out.error = error.message;
      else out.tabs = (data.import_tabs ?? []) as unknown as FetchedSource["tabs"];
      return out;
    }
    const { data: cached } = await supabaseAdmin.from("sheet_cache").select("tabs,fetched_at,retry_at").eq("source_id", source.id).maybeSingle();
    const now = Date.now();
    if (!force && cached && (cached.retry_at ? now < Date.parse(cached.retry_at) : now - Date.parse(cached.fetched_at) < CACHE_MS)) {
      out.tabs = cached.tabs as unknown as FetchedSource["tabs"];
      return out;
    }
    try {
      out.tabs = await fetchSpreadsheet(source.spreadsheet_id);
      const encoded = JSON.stringify(out.tabs);
      const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encoded)))].map(x => x.toString(16).padStart(2,"0")).join("");
      const { data: observation } = await supabaseAdmin.from("source_observations").select("fingerprint").eq("source_id", source.id).maybeSingle();
      if (observation && observation.fingerprint !== hash) {
        await supabaseAdmin.from("audit_events").insert({ action: "source_change_observed", entity_id: source.id, source_id: source.id, origin: "sync", previous: { fingerprint: observation.fingerprint }, next: { fingerprint: hash }, result: "observed" });
      }
      await supabaseAdmin.from("source_observations").upsert({ source_id: source.id, fingerprint: hash, observed_at: new Date().toISOString() });
      await supabaseAdmin.from("sheet_cache").upsert({ source_id: source.id, tabs: out.tabs, fetched_at: new Date().toISOString(), retry_at: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (cached) {
        out.tabs = cached.tabs as unknown as FetchedSource["tabs"];
        await supabaseAdmin.from("sheet_cache").update({ retry_at: new Date(now + 60_000).toISOString() }).eq("source_id", source.id);
      } else out.error = message;
      console.error(`Source read failed: ${message}`);
    }
    return out;
  }));
}
