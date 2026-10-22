const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

export async function driveFetch(path: string): Promise<Response> {
  const key = process.env['LOVABLE_API_KEY'];
  const conn = process.env['GOOGLE_DRIVE_API_KEY'];
  if (!key || !conn) throw new Error("Google Drive غير مربوط");
  const res = await fetch(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn } });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive request failed [${res.status}]: ${body}`);
    throw new Error(`Google Drive [${res.status}]: ${body.slice(0, 300)}`);
  }
  return res;
}

export async function configuredFolders(): Promise<{ folder_id: string; label: string }[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("photo_folders").select("folder_id,label");
  if (error) throw error;
  return data ?? [];
}
