import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { authError } from "@/lib/auth-navigation";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "كلمة مرور جديدة — صناع الحياة سوهاج" },
    { name: "description", content: "تعيين كلمة مرور جديدة لحسابك عبر رابط الاستعادة." },
    { property: "og:title", content: "استعادة الحساب — صناع الحياة سوهاج" },
    { property: "og:description", content: "استعادة الوصول الآمن إلى حساب نظام المتابعة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const recovery = useQuery({ queryKey: ["password-recovery"], queryFn: () => false, enabled: false });
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const fromRecoveryLink = hash.get("type") === "recovery";
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setVerified(!!data.user && (fromRecoveryLink || qc.getQueryData(["password-recovery"]) === true));
      setChecking(false);
    });
    return () => { active = false; };
  }, [qc, recovery.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verified || busy) return;
    setError("");
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      qc.removeQueries({ queryKey: ["password-recovery"] });
      setDone(true);
    } catch (err) { setError(authError(err instanceof Error ? err.message : String(err))); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen border-t-4 border-accent bg-background px-5 py-10">
    <div className="mx-auto max-w-md">
      <img src={logo.url} alt="صناع الحياة سوهاج" className="mx-auto mb-8 h-28 max-w-full object-contain" />
      <section className="rounded-lg border bg-card p-6">
        <h1 className="mb-5 text-xl font-extrabold">كلمة مرور جديدة</h1>
        {checking ? <p role="status" className="text-sm text-muted-foreground">جارٍ التحقق من رابط الاستعادة…</p> : done ? <>
          <p role="status" className="mb-4 text-sm text-success">تم تغيير كلمة المرور بنجاح.</p>
          <Button className="w-full" onClick={() => nav({ to: "/sources", replace: true })}>متابعة</Button>
        </> : !verified ? <>
          <p role="alert" className="mb-4 text-sm text-destructive">رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.</p>
          <Button asChild className="w-full"><Link to="/auth">العودة لتسجيل الدخول</Link></Button>
        </> : <form onSubmit={submit} className="space-y-4">
          <label htmlFor="new-password" className="block space-y-2 text-sm font-semibold"><span>كلمة المرور الجديدة</span>
            <div className="relative"><Input id="new-password" dir="ltr" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-11" />
              <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1 size-9" onClick={() => setVisible(!visible)} aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
            </div>
          </label>
          <label htmlFor="confirm-password" className="block space-y-2 text-sm font-semibold"><span>تأكيد كلمة المرور</span><Input id="confirm-password" dir="ltr" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="h-11 w-full">{busy && <Loader2 className="size-4 animate-spin" />}حفظ كلمة المرور</Button>
        </form>}
      </section>
    </div>
  </main>;
}