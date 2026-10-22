import { normalizeArabic } from "./normalize";
import type { ActivityRecord } from "./types";
import type { DeckGoal, DeckSlide } from "./deck";

export interface ActivityMetric { key: string; label: string; value: number | null; unit?: string | undefined }
export interface ActivityGoal extends DeckGoal { activityId: string; icon: string; metrics: ActivityMetric[]; records: ActivityRecord[]; centerMetrics: { center: string; metrics: ActivityMetric[] }[] }
interface Spec { id: string; ic: string; n: string; m: string[][]; f?: string[][] }
const CATALOG: { t: string; a: Spec[] }[] = [
  {
    "t": "معارض الملابس",
    "a": [
      {
        "id": "cl_collect",
        "ic": "shirt",
        "n": "تحصيل ملابس",
        "f": [],
        "m": [
          [
            "pieces",
            "عدد القطع المحصلة"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "cl_sort",
        "ic": "sort",
        "n": "فرز ملابس",
        "f": [],
        "m": [
          [
            "good",
            "قطع صالحة"
          ],
          [
            "bad",
            "قطع هالكة"
          ],
          [
            "cost",
            "مصاريف الفرز",
            "ج"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "cl_expo",
        "ic": "shop",
        "n": "تنفيذ معرض",
        "f": [],
        "m": [
          [
            "sold",
            "قطع تم بيعها"
          ],
          [
            "cost",
            "المصاريف",
            "ج"
          ],
          [
            "profit",
            "صافي الربح",
            "ج"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "بيست باديز",
    "a": [
      {
        "id": "bb_merge",
        "ic": "smile",
        "n": "فعالية دمج",
        "f": [],
        "m": [
          [
            "ben",
            "أطفال مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "bb_aware",
        "ic": "mega",
        "n": "فعالية توعية",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "الحملات والقوافل",
    "a": [
      {
        "id": "blood",
        "ic": "drop",
        "n": "حملات التبرع بالدم",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "med",
        "ic": "cross",
        "n": "القوافل الطبية",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "conv",
        "ic": "truck",
        "n": "القوافل المجمعة",
        "f": [
          [
            "details",
            "تفاصيل الأنشطة"
          ]
        ],
        "m": [
          [
            "acts",
            "الأنشطة المنفذة"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "إدارة المكاتب (١)",
    "a": [
      {
        "id": "off_expo",
        "ic": "shop",
        "n": "معارض",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_kids",
        "ic": "shapes",
        "n": "أنشطة أطفال",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_orph",
        "ic": "home",
        "n": "زيارات دور الأيتام",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_train",
        "ic": "cap",
        "n": "تدريبات",
        "f": [
          [
            "trainer",
            "اسم المدرب"
          ],
          [
            "type",
            "نوع التدريب"
          ]
        ],
        "m": [
          [
            "att",
            "عدد الحضور"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "إدارة المكاتب (٢)",
    "a": [
      {
        "id": "off_aware",
        "ic": "mega",
        "n": "توعية",
        "f": [
          [
            "topic",
            "موضوع التوعية"
          ]
        ],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_field",
        "ic": "heart",
        "n": "حملات التبرع الميدانية",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_doy",
        "ic": "waves",
        "n": "دوي",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "off_qudwa",
        "ic": "star",
        "n": "قدوة",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "الاحتياجات الأساسية (١)",
    "a": [
      {
        "id": "nd_board",
        "ic": "board",
        "n": "سبورة المحروسة",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_bread",
        "ic": "bread",
        "n": "عيش وملح",
        "f": [],
        "m": [
          [
            "meals",
            "عدد الوجبات"
          ],
          [
            "partner",
            "وجبات شراكات"
          ],
          [
            "donor",
            "وجبات متبرعين"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_bride",
        "ic": "gem",
        "n": "تجهيز العرائس",
        "f": [],
        "m": [
          [
            "dev",
            "عدد الأجهزة"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_water",
        "ic": "pipe",
        "n": "وصلات المياه",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_aid",
        "ic": "coin",
        "n": "إعانة مالية",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_debt",
        "ic": "receipt",
        "n": "سداد ديون",
        "f": [],
        "m": [
          [
            "amt",
            "المبلغ",
            "ج"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "الاحتياجات الأساسية (٢)",
    "a": [
      {
        "id": "nd_surg",
        "ic": "surg",
        "n": "عمليات جراحية",
        "f": [
          [
            "type",
            "نوع العملية"
          ]
        ],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_rx",
        "ic": "pill",
        "n": "روشتة",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_box",
        "ic": "box",
        "n": "كراتين غذائية",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_meal",
        "ic": "utensils",
        "n": "وجبات",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_cloth",
        "ic": "shirt",
        "n": "كسوة",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "nd_blanket",
        "ic": "bed",
        "n": "ألحفة",
        "f": [],
        "m": [
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  },
  {
    "t": "إدارة الحالة",
    "a": [
      {
        "id": "cm_entech",
        "ic": "clip",
        "n": "استمارات ان تيك",
        "f": [],
        "m": [
          [
            "forms",
            "عدد الاستمارات"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      },
      {
        "id": "cm_enshal",
        "ic": "file",
        "n": "استمارات الإنشيل",
        "f": [],
        "m": [
          [
            "forms",
            "عدد الاستمارات"
          ],
          [
            "ben",
            "مستفيدين"
          ],
          [
            "vol",
            "متطوعين"
          ]
        ]
      }
    ]
  }
];
const norm = (s: string) => normalizeArabic(s).replace(/^ال/, "").replace(/ ال/g, " ");
const ALIASES: Record<string, string[]> = { nd_board: ["السبورة المحروسة"], cm_entech: ["intake", "ان تيك"], cm_enshal: ["initial", "انشيل", "إنشيل"] };
const METRIC_WORDS: Record<string, string[]> = {
 pieces: ["محصل", "تحصيل"], good: ["صالح"], bad: ["هالك"], cost: ["مصاريف"], sold: ["بيع", "مباع"], profit: ["صافي الربح"], acts: ["انشطه منفذه"], att: ["حضور"], meals: ["وجبه", "وجبات"], partner: ["شراكات"], donor: ["متبرع"], dev: ["اجهزه", "جهاز"], amt: ["مبلغ"], forms: ["استماره", "forms"]
};
function matches(r: ActivityRecord, s: Spec, group: string) {
 const office = group.startsWith("إدارة المكاتب");
 if (office !== normalizeArabic(r.department).includes("مكاتب") && (office || s.id.startsWith("cl_"))) return false;
 if (s.id.startsWith("cm_")) return normalizeArabic(r.department).includes("حاله") && Object.keys(r.metrics).some(k => (ALIASES[s.id] ?? []).some(a => norm(k).includes(norm(a))));
 return [s.n, ...(ALIASES[s.id] ?? [])].some(a => norm(r.file) === norm(a) || norm(r.name) === norm(a));
}
function values(rows: ActivityRecord[], spec: Spec): ActivityMetric[] {
 return spec.m.map(([key = "", label = "", unit]) => {
  if (key === "ben" || key === "vol") return {key,label,unit,value: rows.length ? rows.reduce((n,r)=>n+(key === "ben" ? r.beneficiaries : r.volunteers),0) : null};
  const entries = rows.flatMap(r => Object.entries(r.metrics)).filter(([k]) => {
   const n = norm(k);
   if (key === "forms") return (ALIASES[spec.id] ?? []).some(a=>n.includes(norm(a)));
   if (key === "meals" && /شراك|متبرع/.test(n)) return false;
   return (METRIC_WORDS[key] ?? [label]).some(w=>n.includes(norm(w)));
  });
  return {key,label,unit,value: entries.length ? entries.reduce((n,[,v])=>n+v,0) : null};
 });
}
function goal(spec: Spec, title: string, records: ActivityRecord[]): ActivityGoal {
 const metrics=values(records,spec);
 const centerMetrics=[...new Set(records.map(r=>r.center))].map(center=>({center,metrics:values(records.filter(r=>r.center===center),spec)}));
 return {item:spec.n,goal:title,activityId:spec.id,icon:spec.ic,metrics,records,centerMetrics,target:null,achieved:metrics[0]?.value ?? null,pct:null,centers:centerMetrics.map(c=>({center:c.center,achieved:c.metrics[0]?.value ?? 0,target:0}))};
}
/** Reference labels are static; every figure and additional activity comes from public Sheets rows. */
export function buildActivityDeck(rows: ActivityRecord[]): { year: number | null; slides: DeckSlide[] } {
 const assigned = new Set<string>();
 const slides: DeckSlide[] = CATALOG.map(g=>({title:g.t,goals:g.a.map(s=>{const records=rows.filter(r=>matches(r,s,g.t)); records.forEach(r=>assigned.add(r.id)); return goal(s,g.t,records);})}));
 const extra=new Map<string,ActivityRecord[]>();
 for(const r of rows) { if(assigned.has(r.id)) continue; const key=r.department+"\0"+r.file; extra.set(key,[...(extra.get(key) ?? []),r]); }
 for(const records of extra.values()) {
  const r=records[0]; if(!r) continue;
  let slide=slides.find(s=>s.title===r.department); if(!slide) { slide={title:r.department,goals:[]}; slides.push(slide); }
  const labels=[...new Set(records.flatMap(r=>Object.keys(r.metrics)))].filter(k=>!k.startsWith("_") && !/^[a-z_]+$/.test(k));
  const spec:Spec={id:`sheet:${r.department}:${r.file}`,ic:"heart",n:r.file,m:[["ben","مستفيدين"],["vol","متطوعين"]]};
  const item=goal(spec,r.department,records);
  item.metrics.push(...labels.map(label=>({key:label,label,value:records.reduce((n,r)=>n+(r.metrics[label] ?? 0),0)})));
  item.centerMetrics.forEach(c=>c.metrics.push(...labels.map(label=>({key:label,label,value:records.filter(r=>r.center===c.center).reduce((n,r)=>n+(r.metrics[label] ?? 0),0)}))));
  slide.goals.push(item);
 }
 return {year:null,slides};
}
export function isActivityGoal(g: DeckGoal): g is ActivityGoal { return "activityId" in g; }
