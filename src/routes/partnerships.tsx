import { createFileRoute } from "@tanstack/react-router";
import { Handshake } from "lucide-react";
import { DataTable } from "@/components/dash/data-table";
import { Empty, Hero, Kpi, SectionTitle } from "@/components/dash/ui";
import { useDataset } from "@/hooks/use-dataset";
import { fmt } from "@/lib/format";
import { normalizeArabic } from "@/lib/sheets/normalize";
import type { Partnership } from "@/lib/sheets/types";

export const Route = createFileRoute("/partnerships")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الشراكات — صناع الحياة سوهاج" },
      { name: "description", content: "الجهات الشريكة وأنواع الشراكات والأنشطة المترتبة عليها." },
      { property: "og:title", content: "الشراكات — صناع الحياة سوهاج" },
      { property: "og:description", content: "متابعة الشراكات الرسمية وغير الرسمية." },
    ],
  }),
  component: PartnershipsPage,
});

function PartnershipsPage() {
  const ds = useDataset();
  const planRows = ds.plans.flatMap((p) => p.items).filter((i) => normalizeArabic(i.goal).includes(normalizeArabic("الشراكات")));
  return (
    <div>
      <Hero label="الشراكات" title="الشراكات" subtitle="من تبويب «الشراكات» وبنود الشراكات في الماستر بلان." back={{ to: "/", text: "الرئيسية" }} />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="جهات مسجلة في تبويب الشراكات" value={fmt(ds.partnerships.length)} icon={<Handshake className="size-5" />} />
        {planRows.map((i) => (
          <Kpi key={i.item} label={i.item} value={fmt(i.achieved)} hint="من الماستر بلان" tone="accent" />
        ))}
      </div>
      <SectionTitle>الجهات الشريكة</SectionTitle>
      {ds.partnerships.length ? (
        <DataTable<Partnership>
          rows={ds.partnerships}
          exportName="الشراكات"
          columns={[
            { key: "n", label: "الجهة", value: (p) => p.name },
            { key: "c", label: "المركز", value: (p) => p.center },
            { key: "v", label: "القرية", value: (p) => p.village },
            { key: "t", label: "نوع الشراكة", value: (p) => p.type },
            { key: "g", label: "الهدف", value: (p) => p.goal },
            { key: "s", label: "تاريخ البداية", value: (p) => p.startDate },
            { key: "cn", label: "مسؤول التواصل", value: (p) => [p.contactName, p.contactRole].filter(Boolean).join(" — ") },
            { key: "a", label: "الأنشطة المترتبة", value: (p) => p.activities },
          ]}
        />
      ) : (
        <Empty>تبويب «الشراكات» في ملف الماستر بلان ما زال فارغاً (القالب جاهز بدون جهات). بمجرد إضافة الجهات في الشيت ستظهر هنا تلقائياً.</Empty>
      )}
    </div>
  );
}
