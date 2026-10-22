import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Database, Images, ShieldCheck, Users } from "lucide-react";
import { PhotoFolders } from "@/components/dash/photo-folders";
import { useAccess } from "@/hooks/use-access";
import { Button } from "@/components/ui/button";
import { Empty, Hero, SectionTitle } from "@/components/dash/ui";
import { SourcesPage } from "@/routes/sources";
import { QualityPage } from "@/routes/quality";
import { UsersPage } from "@/routes/admin.users";
import { cn } from "@/lib/utils";

type Tab = "sources" | "photos" | "quality" | "users";
const TABS: { key: Tab; label: string; icon: typeof Database }[] = [
  { key: "sources", label: "مصادر البيانات", icon: Database },
  { key: "photos", label: "صور Google Drive", icon: Images },
  { key: "quality", label: "جودة البيانات والسجل", icon: ShieldCheck },
  { key: "users", label: "المستخدمين والصلاحيات", icon: Users },
];

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (["sources", "photos", "quality", "users"].includes(String(s["tab"])) ? String(s["tab"]) : "sources") as Tab,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "مركز الإدارة — صناع الحياة سوهاج" },
      { name: "description", content: "مصادر البيانات وجودة البيانات وسجل التعديلات والمستخدمين والصلاحيات في مكان واحد." },
      { property: "og:title", content: "مركز الإدارة — صناع الحياة سوهاج" },
      { property: "og:description", content: "إدارة ملفات Google Sheets والصلاحيات ومراجعة جودة البيانات." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const me = useAccess();
  const { tab } = Route.useSearch();
  const nav = useNavigate({ from: "/settings" });
  const allowed = !!me.data && (me.data.isAdmin || me.data.isCenterManager);
  const tabs = TABS.filter((t) => (t.key === "users" ? !!me.data?.isAdmin : t.key === "quality" ? allowed : !!me.data?.isAdmin));

  if (!me.data) {
    return (
      <div>
        <Hero label="الإدارة" title="مركز الإدارة" subtitle="مصادر البيانات والجودة والصلاحيات في مكان واحد." back={{ to: "/", text: "الرئيسية" }} />
        <Empty>
          يجب <Link to="/auth" className="text-primary underline">تسجيل الدخول</Link> أولًا كمسؤول لعرض مركز الإدارة.
        </Empty>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div>
        <Hero label="الإدارة" title="مركز الإدارة" subtitle="مصادر البيانات والجودة والصلاحيات في مكان واحد." back={{ to: "/", text: "الرئيسية" }} />
        <Empty>حسابك ({me.data.email}) لا يملك صلاحية الدخول إلى مركز الإدارة.</Empty>
      </div>
    );
  }

  return (
    <div>
      <Hero label="الإدارة" title="مركز الإدارة" subtitle="كل ما يخص الملفات والمراجعة والصلاحيات في صفحة واحدة." back={{ to: "/", text: "الرئيسية" }} />

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => nav({ search: { tab: t.key }, replace: true })}
            className={cn("gap-2", tab === t.key && "shadow-[inset_0_-2px_0_var(--primary)]")}
          >
            <t.icon className="size-4" />
            {t.label}
          </Button>
        ))}
      </div>

      <SectionTitle>{TABS.find((t) => t.key === tab)?.label}</SectionTitle>
      {tab === "sources" && <SourcesPage />}
      {tab === "photos" && <PhotoFolders />}
      {tab === "quality" && <QualityPage />}
      {tab === "users" && <UsersPage />}
    </div>
  );
}
