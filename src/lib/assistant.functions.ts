import { createServerFn } from "@tanstack/react-start";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const MODEL = "openai/gpt-6-astra";

/** Optional auth: returns the caller's access if a valid bearer token is present. */
async function optionalAccess() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const auth = getRequest().headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await sb.auth.getUser(token);
  if (!data.user) return null;
  const [{ data: roles }, { data: centers }] = await Promise.all([
    sb.from("user_roles").select("role").eq("user_id", data.user.id),
    sb.from("user_center_access").select("center").eq("user_id", data.user.id),
  ]);
  const r = (roles ?? []).map((x) => x.role as string);
  return { isAdmin: r.includes("admin"), isCenterManager: r.includes("center_manager"), centers: (centers ?? []).map((c) => c.center) };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: ChatMsg[] }) => {
    const messages = (input?.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!messages.length || messages.at(-1)!.role !== "user") throw new Error("اكتب سؤالك أولاً");
    return { messages };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مُعدة");
    const { getRawSources } = await import("./sheets/fetch.server");
    const { buildDataset } = await import("./sheets/build");
    const { buildAssistantContext } = await import("./sheets/assistant-context");
    const raw = await getRawSources();
    const ds = buildDataset(raw);
    const access = await optionalAccess();
    const context = buildAssistantContext(ds, raw, access);

    const instructions = `أنت "مساعد صناع الحياة سوهاج"، محلل بيانات لنظام المتابعة.
- أجب بالعربية بإيجاز ووضوح، واستخدم أرقاماً من البيانات فقط.
- لا تخترع أرقاماً. إذا لم تكن المعلومة في البيانات قل ذلك صراحة.
- اذكر مصدر الرقم (تقارير الأنشطة، الماستر بلان، مراحل المتطوعين...).
- اقترح توصيات عملية عند السؤال عن الأداء.
- لا تعرض أي بيانات شخصية؛ البيانات المتاحة لك مجمعة فقط.
${access ? "" : "- المستخدم غير مسجل الدخول: لديك فقط البيانات العامة المجمعة."}

البيانات الحالية (JSON):
${context}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
        reasoning: { effort: "low" },
        store: false,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${body}`);
      if (res.status === 429) throw new Error("طلبات كثيرة، حاول بعد قليل");
      if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي لمساحة العمل");
      throw new Error(`تعذر الحصول على رد [${res.status}]`);
    }
    // Consume the stream server-side and return the final text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error") throw new Error(ev.error?.message ?? "فشل الرد");
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected end of JSON input" && !(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (!text.trim()) throw new Error("لم يصل رد من المساعد");
    return { reply: text.trim(), scope: access ? (access.isAdmin ? "admin" : access.isCenterManager ? "center" : "public") : "public" };
  });
