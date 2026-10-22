export async function fetchSpreadsheet(id: string) {
  const key = process.env["LOVABLE_API_KEY"];
  const connection = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!key || !connection) throw new Error("اتصال Google Sheets غير مُعد");
  const headers = { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection };
  const base = `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${id}`;
  const read = async (url: string) => {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Sheets [${response.status}]: ${body}`);
      throw new Error(`Google Sheets [${response.status}]: ${body}`);
    }
    return response.json();
  };
  const meta = await read(`${base}?fields=sheets.properties.title`);
  const titles: string[] = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);
  if (!titles.length) return [];
  const params = new URLSearchParams();
  titles.forEach((title) => params.append("ranges", `'${title.replace(/'/g, "''")}'`));
  const values = await read(`${base}/values:batchGet?${params}`);
  return titles.map((title, i) => ({ title, grid: (values.valueRanges?.[i]?.values ?? []) as string[][] }));
}