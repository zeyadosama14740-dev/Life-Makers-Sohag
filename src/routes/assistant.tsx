import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, User } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Hero } from "@/components/dash/ui";
import { useAccess } from "@/hooks/use-access";
import { askAssistant, type ChatMsg } from "@/lib/assistant.functions";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "المساعد الذكي — صناع الحياة سوهاج" },
      { name: "description", content: "اسأل عن الأنشطة والمتطوعين والمستهدفات واحصل على تحليل فوري من البيانات." },
      { property: "og:title", content: "المساعد الذكي — صناع الحياة سوهاج" },
      { property: "og:description", content: "تحليل ذكي لبيانات نظام المتابعة." },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "ما أضعف 5 بنود في الماستر بلان حتى الآن وما توصياتك؟",
  "قارن أداء المراكز في الربع الأول",
  "كم نسبة التحويل من الجذب إلى التسكين؟",
  "لخص أنشطة إدارة الحالة",
];

function AssistantPage() {
  const me = useAccess();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const { reply } = await askAssistant({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحصول على رد");
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const scope = me.data?.isAdmin ? "كل البيانات (مسؤول رئيسي)" : me.data?.isCenterManager ? `بيانات مراكزك: ${me.data.centers.join("، ")}` : "البيانات العامة المجمعة";

  return (
    <div>
      <Hero label="المساعد الذكي" title="اسأل عن بياناتك" subtitle={`يحلل البيانات المتصلة الحالية فقط. نطاق الوصول: ${scope}.`} back={{ to: "/", text: "الرئيسية" }} />
      <div className="card-surface mt-6 flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 p-4">
          {!messages.length && (
            <div className="grid gap-2 md:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border bg-secondary/50 p-3 text-right text-sm hover:border-primary">{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex gap-3" : "flex gap-3"}>
              <div className={m.role === "user" ? "grid size-8 shrink-0 place-items-center rounded-full bg-accent/25" : "grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"}>
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div className={m.role === "user" ? "rounded-2xl bg-secondary px-4 py-2 text-sm" : "whitespace-pre-wrap rounded-2xl border px-4 py-2 text-sm leading-7"}>{m.content}</div>
            </div>
          ))}
          {busy && <div className="text-sm text-muted-foreground">المساعد يحلل البيانات…</div>}
          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك…" rows={2} className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="إرسال"><Send className="size-4" /></Button>
        </form>
      </div>
    </div>
  );
}
