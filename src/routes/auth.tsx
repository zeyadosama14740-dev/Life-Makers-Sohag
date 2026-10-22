import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import logo from "@/assets/logo.png.asset.json";
import { authDestination, authError } from "@/lib/auth-navigation";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: authDestination(search["redirect"]) }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — صناع الحياة سوهاج" },
      { name: "description", content: "تسجيل دخول مسؤولي نظام المتابعة لإدارة مصادر البيانات." },
      { property: "og:title", content: "تسجيل الدخول — صناع الحياة سوهاج" },
      { property: "og:description", content: "دخول المسؤولين لإدارة مصادر البيانات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const redirect = authDestination(search.redirect);
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        sessionStorage.removeItem("auth-return-to");
        nav({ to: redirect, replace: true });
      }
    });
    return () => { active = false; };
  }, [nav, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const address = email.trim();
      const result = mode === "forgot"
        ? await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/reset-password` })
        : mode === "in"
          ? await supabase.auth.signInWithPassword({ email: address, password })
          : await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: window.location.origin } });
      if (result.error) throw result.error;
      if (mode === "forgot") setNotice("إذا كان البريد مسجلًا، ستصلك رسالة بها رابط لتعيين كلمة مرور جديدة.");
      else if (mode === "up") setNotice("افتح بريدك الإلكتروني واضغط رابط التأكيد لإكمال إنشاء حسابك.");
      else await nav({ to: redirect, replace: true });
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem("auth-return-to", redirect);
      const callback = new URL("/auth", window.location.origin);
      if (redirect !== "/") callback.searchParams.set("redirect", redirect);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: callback.href,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data, error: verifyError } = await supabase.auth.getUser();
        if (verifyError) throw verifyError;
        if (data.user) {
          sessionStorage.removeItem("auth-return-to");
          await nav({ to: redirect, replace: true });
        }
      }
    } catch (err) {
      sessionStorage.removeItem("auth-return-to");
      setError(authError(err instanceof Error ? err.message : String(err)));
    } finally { setBusy(false); }
  };

  const changeMode = (next: typeof mode) => { setMode(next); setError(""); setNotice(""); setPassword(""); };

  return (
    <main className="min-h-screen border-t-4 border-accent bg-background px-5 py-6 sm:py-10">
      <div className="mx-auto max-w-md">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowRight className="size-4" /> العودة للرئيسية</Link></Button>
        <div className="mb-8 mt-6 text-center">
          <img src={logo.url} alt="صناع الحياة سوهاج" className="mx-auto mb-5 h-28 max-w-full object-contain" />
          <h1 className="text-2xl font-extrabold text-navy">صناع الحياة سوهاج</h1>
          <p className="mt-1 text-sm text-muted-foreground">رؤية واحدة، كيان واحد</p>
        </div>
        <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-extrabold">{mode === "in" ? "تسجيل الدخول" : mode === "up" ? "إنشاء حساب" : "استعادة كلمة المرور"}</h2>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">{mode === "forgot" ? "أدخل بريد حسابك لاستلام رابط الاستعادة." : "مرحبًا بك في نظام المتابعة"}</p>
          {mode !== "forgot" && <>
            <Button variant="outline" className="h-11 w-full" onClick={google} disabled={busy}>
              <span className="font-bold" aria-hidden="true">G</span> المتابعة باستخدام Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> أو بالبريد الإلكتروني <span className="h-px flex-1 bg-border" /></div>
          </>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-2 text-sm font-semibold" htmlFor="email"><span>البريد الإلكتروني</span>
              <Input id="email" type="email" dir="ltr" autoComplete="email" required placeholder="name@example.com" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
            </label>
            {mode !== "forgot" && <label className="block space-y-2 text-sm font-semibold" htmlFor="password"><span>كلمة المرور</span>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} dir="ltr" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={mode === "up" ? 8 : undefined} placeholder={mode === "up" ? "8 أحرف على الأقل" : "كلمة المرور"} className="h-11 pl-11" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
                <Button type="button" size="icon" variant="ghost" className="absolute left-1 top-1 size-9" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
              </div>
            </label>}
            {mode === "in" && <Button type="button" variant="link" className="h-auto px-0 text-xs" disabled={busy} onClick={() => changeMode("forgot")}>نسيت كلمة المرور؟</Button>}
            {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="flex items-start gap-2 rounded-md bg-success/10 p-3 text-sm"><Mail className="mt-1 size-4 shrink-0 text-success" />{notice}</p>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{mode === "in" ? "دخول" : mode === "up" ? "إنشاء حساب" : "إرسال رابط الاستعادة"}</Button>
          </form>
          <div className="mt-5 border-t pt-4 text-center"><Button variant="link" disabled={busy} onClick={() => changeMode(mode === "in" ? "up" : "in")} className="h-auto whitespace-normal text-sm">{mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}</Button></div>
        </section>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /> الوصول لملفات المتطوعين وفق صلاحيات حسابك</p>
      </div>
    </main>
  );
}
