import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/logo.png.asset.json";
import { BarChart3, Bot, Building2, CalendarDays, ChevronDown, Handshake, Home, Images, ListChecks, LogIn, LogOut, Menu, PanelRightClose, PanelRightOpen, Presentation, Search, Settings, Target, Users, X } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDataset } from "@/hooks/use-dataset";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { normalizeArabic } from "@/lib/sheets/normalize";
import { SiteGuide } from "./site-guide";

type Item = { to: string; label: string; icon: typeof Home };

function NavItem({ to, params, icon, children, onClick }: { to: string; params?: Record<string, string> | undefined; icon: ReactNode; children: ReactNode; onClick?: (() => void) | undefined }) {
  return (
    <Link
      to={to}
      {...({ params } as object)}
      onClick={onClick}
      title={typeof children === "string" ? children : undefined}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/85 transition-all duration-300 hover:-translate-x-1 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground font-bold shadow-[inset_-3px_0_0_var(--sidebar-primary)]" }}
    >
      {icon}
      <span className="sidebar-label min-w-0">{children}</span>
    </Link>
  );
}

function NavSection({ label, items, onNavigate }: { label: string; items: Item[]; onNavigate?: (() => void) | undefined }) {
  return (
    <div className="space-y-1">
      <div className="sidebar-label px-3 pt-1 text-[11px] font-extrabold tracking-wide text-sidebar-primary/90">{label}</div>
      {items.map((i) => (
        <NavItem key={i.to} to={i.to} icon={<i.icon className="size-4 shrink-0" />} onClick={onNavigate}>
          {i.label}
        </NavItem>
      ))}
    </div>
  );
}

function SidebarBody({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const ds = useDataset();
  const me = useAccess();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [search, setSearch] = useState("");
  const [deptsOpen, setDeptsOpen] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await nav({ to: "/auth", replace: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تسجيل الخروج"); }
    finally { setSigningOut(false); }
  };
  const depts = [...new Set(ds.activities.map((a) => a.department))].sort((a, b) => a.localeCompare(b, "ar"));
  const sections: { label: string; items: Item[] }[] = [
    {
      label: "ابدأ من هنا",
      items: [
        { to: "/", label: "الرئيسية", icon: Home },
        { to: "/follow-up", label: "مركز المتابعة", icon: ListChecks },
        { to: "/calendar", label: "تقويم الأنشطة", icon: CalendarDays },
        { to: "/reports", label: "التقارير والأثر", icon: BarChart3 },
      ],
    },
    {
      label: "المتطوعون والخطط",
      items: [
        { to: "/volunteers", label: "المتطوعين والمشاركات", icon: Users },
        { to: "/plan", label: "الماستر بلان والمستهدفات", icon: Target },
        { to: "/partnerships", label: "الشراكات", icon: Handshake },
        { to: "/presentation", label: "العرض الحي للأهداف", icon: Presentation },
        { to: "/gallery", label: "معرض الصور", icon: Images },
      ],
    },
    { label: "المساعدة", items: [{ to: "/assistant", label: "المساعد الذكي", icon: Bot }] },
  ];
  if (me.data && (me.data.isAdmin || me.data.isCenterManager)) {
    sections.push({ label: "الإدارة", items: [{ to: "/settings", label: "مركز الإدارة", icon: Settings }] });
  }
  const shown = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => normalizeArabic(i.label).includes(normalizeArabic(search))) }))
    .filter((s) => s.items.length);
  const visibleDepts = depts.filter((d) => normalizeArabic(d).includes(normalizeArabic(search)));
  const deptsExpanded = deptsOpen || (search.trim().length > 0 && visibleDepts.length > 0);

  return (
    <div className={cn("flex min-h-full flex-col gap-5 p-4", collapsed && "sidebar-mini px-2")}>
      <div className="sidebar-label border-b border-sidebar-border pb-4">
        <div className="mb-3 rounded-2xl bg-card p-2"><img src={logo.url} alt="شعار جمعية صناع الحياة سوهاج" className="mx-auto h-24 object-contain" /></div>
        <div className="text-lg font-extrabold text-sidebar-foreground">صناع الحياة سوهاج</div>
        <div className="text-xs text-sidebar-primary">رؤية واحدة، كيان واحد</div>
      </div>
      <div className="sidebar-label relative"><Search className="absolute right-3 top-2.5 size-4 text-sidebar-foreground/70" /><Input aria-label="البحث في القائمة" placeholder="ابحث في القائمة…" value={search} onChange={(e) => setSearch(e.target.value)} className="border-sidebar-border pr-9 text-sidebar-foreground placeholder:text-sidebar-foreground/60" /></div>
      <nav aria-label="الصفحات" className="space-y-4">
        {shown.map((s) => <NavSection key={s.label} label={s.label} items={s.items} onNavigate={onNavigate} />)}
        {!shown.length && !visibleDepts.length && <p className="sidebar-label px-3 text-sm text-sidebar-foreground/70">لا توجد نتائج</p>}
      </nav>
      <div>
        <button
          type="button"
          onClick={() => setDeptsOpen((v) => !v)}
          aria-expanded={deptsExpanded}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <span className="flex items-center gap-3"><Building2 className="size-4 shrink-0" /><span className="sidebar-label font-bold">الإدارات</span></span>
          <span className="sidebar-label flex items-center gap-1.5 text-xs text-sidebar-foreground/60">
            {depts.length}
            <ChevronDown className={cn("size-3.5 transition-transform duration-300", deptsExpanded && "rotate-180")} />
          </span>
        </button>
        {deptsExpanded && (
          <nav className="space-y-1">
            {visibleDepts.map((d) => (
              <NavItem key={d} to="/departments/$dept" params={{ dept: d }} icon={<Building2 className="size-4" />} onClick={onNavigate}>
                {d}
              </NavItem>
            ))}
          </nav>
        )}
      </div>
      <div className="sidebar-label mt-auto space-y-3 border-t border-sidebar-border pt-4">
        {me.data ? <>
          <p className="break-all text-xs text-sidebar-foreground/80" dir="ltr">{me.data.email}</p>
          <p className="text-xs text-sidebar-primary">{me.data.isAdmin ? "المسؤول الرئيسي" : me.data.isCenterManager ? "مدير مركز" : "مشاهد"}</p>
          <Button variant="ghost" size="sm" disabled={signingOut} onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="size-4" />تسجيل الخروج</Button>
        </> : <Button asChild variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><Link to="/auth"><LogIn className="size-4" />تسجيل الدخول</Link></Button>}
        <div className="text-[11px] text-sidebar-foreground/60">نظام المتابعة · مؤسسة صناع الحياة مصر</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className={cn("min-h-screen lg:grid", collapsed ? "lg:grid-cols-[64px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]")}>
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-sidebar lg:block">
        <SidebarBody collapsed={collapsed} />
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 font-extrabold text-sidebar-foreground"><img src={logo.url} alt="" className="size-8 rounded-md bg-card object-contain" />صناع الحياة سوهاج</span>
        <Button variant="ghost" size="icon" aria-label="القائمة" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-sidebar-foreground">
          <Menu className="size-6" />
        </Button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <aside aria-label="القائمة الجانبية" className="absolute inset-y-0 right-0 w-72 max-w-[90vw] overflow-y-auto bg-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end px-2 pt-2"><Button variant="ghost" size="icon" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X /></Button></div>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <div className="hidden items-center gap-3 border-b bg-card px-6 py-2 lg:flex">
          <Button variant="ghost" size="icon" aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"} title={collapsed ? "توسيع القائمة" : "طي القائمة"} onClick={() => setCollapsed((v) => !v)}>{collapsed ? <PanelRightOpen /> : <PanelRightClose />}</Button>
          <span className="text-sm font-bold text-muted-foreground">صناع الحياة سوهاج</span>
          <div className="mr-auto flex items-center gap-1">
            <SiteGuide />
            <Button asChild variant="ghost" size="sm"><Link to="/follow-up"><ListChecks />مركز المتابعة</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/calendar"><CalendarDays />التقويم</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/reports"><BarChart3 />التقارير</Link></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/70 px-4 py-3 md:px-6" dir="rtl">
          <nav aria-label="مسار الصفحة" className="flex items-center gap-2 text-sm"><Link to="/" className="text-primary hover:underline">الرئيسية</Link>{path !== "/" && <><span className="text-muted-foreground">/</span><span className="font-semibold">{({ "/follow-up": "مركز المتابعة", "/calendar": "تقويم الأنشطة", "/reports": "التقارير والأثر", "/volunteers": "المتطوعين والمشاركات", "/plan": "الماستر بلان والمستهدفات", "/partnerships": "الشراكات", "/presentation": "العرض الحي للأهداف", "/gallery": "معرض الصور", "/assistant": "المساعد الذكي", "/settings": "مركز الإدارة" } as Record<string, string>)[path] ?? (path.startsWith("/departments/") ? "تفاصيل الإدارة" : "تفاصيل الصفحة")}</span></>}</nav>
          <div className="lg:hidden"><SiteGuide /></div>
        </div>
        <main key={path} className={cn("mx-auto w-full max-w-7xl animate-fade-up p-4 md:p-6")}>{children}</main>
      </div>
    </div>
  );
}
