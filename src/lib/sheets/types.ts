export type SourceCategory = "activities" | "volunteers" | "master_plan" | "other";

export interface SourceStatus {
  id: string;
  label: string;
  year: number;
  category: SourceCategory;
  ok: boolean;
  error?: string | undefined;
  tabs: { title: string; kind: TabKind; rows: number }[];
}

export type TabKind =
  | "activities"
  | "volunteer_stage"
  | "images"
  | "master_plan"
  | "expenses"
  | "center_plan"
  | "partnerships"
  | "unused";

export interface ActivityRecord {
  id: string;
  date: string | null;
  department: string;
  file: string;
  center: string;
  reporter: string;
  name: string;
  place: string;
  beneficiaries: number;
  volunteers: number;
  newVolunteers: number;
  oldVolunteers: number;
  /** Every other numeric column discovered in the row. */
  metrics: Record<string, number>;
  details: Record<string, string>;
  image: string | null;
  sourceLabel: string;
}

export type VolunteerStage = "جذب" | "استقبال" | "تسكين" | "تفعيل";

export interface VolunteerStats {
  stages: { stage: VolunteerStage; count: number; unique: number }[];
  byCenter: { name: string; value: number }[];
  byGender: { name: string; value: number }[];
  byAge: { name: string; value: number }[];
  bySource: { name: string; value: number }[];
  preferredFiles: { name: string; value: number }[];
  duplicates: number;
  missingId: number;
}

export interface PlanItem {
  goal: string;
  item: string;
  totalTarget: number | null;
  targetToDate: number | null;
  achieved: number | null;
  pct: number | null;
  months: { label: string; target: number | null; achieved: number | null }[];
}

export interface PlanSheet {
  year: number;
  sourceLabel: string;
  title: string;
  department: string | null;
  items: PlanItem[];
}

export interface ExpensesSummary {
  sourceLabel: string;
  spent: number | null;
  received: number | null;
  remaining: number | null;
}

export interface ImageRef {
  department: string;
  file: string;
  url: string;
}

export interface CenterPlanItem {
  goal: string;
  item: string;
  target: number | null;
  achieved: number | null;
  pct: number | null;
}

export interface CenterPlan {
  year: number;
  quarter: string;
  /** e.g. "Q1 10%" — share of the yearly target planned for this quarter. */
  quarterLabel: string;
  center: string;
  items: CenterPlanItem[];
}

export interface Partnership {
  name: string;
  center: string;
  village: string;
  contactName: string;
  contactRole: string;
  startDate: string;
  goal: string;
  type: string;
  activities: string;
}

export interface Dataset {
  generatedAt: string;
  sources: SourceStatus[];
  activities: ActivityRecord[];
  metricLabels: string[];
  volunteers: VolunteerStats;
  plans: PlanSheet[];
  expenses: ExpensesSummary[];
  images: ImageRef[];
  centerPlans: CenterPlan[];
  partnerships: Partnership[];
  quality: { label: string; count: number }[];
}
