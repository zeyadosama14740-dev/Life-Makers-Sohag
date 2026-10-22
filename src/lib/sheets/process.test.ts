import { describe, expect, it } from "vitest";
import { normalizeCenter, spreadsheetIdFromUrl, toNumber } from "./normalize";
import { classifyTab, parseActivities, parseMasterPlan, parseVolunteers } from "./process";

describe("sheet parsing rules", () => {
  it("parses formatted numbers and ignores sheet errors", () => {
    expect(toNumber("12,500")).toBe(12500);
    expect(toNumber("18%")).toBe(18);
    expect(toNumber("#DIV/0!")).toBeNull();
  });

  it("normalizes center names", () => {
    expect(normalizeCenter("مركز طهطا")).toBe("طهطا");
  });

  it("extracts the spreadsheet id from a link", () => {
    expect(spreadsheetIdFromUrl("https://docs.google.com/spreadsheets/d/19bVJwsYanaa6KHlAoKVt_1JCslDzSKHodwnGQ2glNF8/edit")).toBe(
      "19bVJwsYanaa6KHlAoKVt_1JCslDzSKHodwnGQ2glNF8",
    );
  });

  it("detects activity tabs from their columns, not their name", () => {
    expect(classifyTab("أي اسم", [["الإدارة", "نوع النشاط"]])).toBe("activities");
    expect(classifyTab("جذب", [[]])).toBe("volunteer_stage");
  });

  it("drops duplicated submissions and hides phone numbers", () => {
    const grid = [
      ["الإدارة", "نوع النشاط", "كام مستفيد من النشاط؟", "رقم تليفون المتبرع", "_uuid"],
      ["إدارة الحالة", "", "15", "0100", "a"],
      ["إدارة الحالة", "", "15", "0100", "a"],
    ];
    const rows = parseActivities(grid, "s");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.beneficiaries).toBe(15);
    expect(JSON.stringify(rows[0]!)).not.toContain("0100");
  });

  it("counts duplicate volunteers by national id", () => {
    const g = [["الرقم القومي"], ["1"], ["1"], ["2"]];
    const v = parseVolunteers({ جذب: [g] });
    expect(v.stages[0]!.count).toBe(3);
    expect(v.duplicates).toBe(1);
  });

  it("computes plan achievement against target-to-date", () => {
    const grid = [
      ["اسم المحافظة"],
      ["خطة السنة إدارة المكاتب 2025"],
      ["الاهداف والبنود"],
      ["الاهداف", "البنود", "مستهدف كلي", "مستهدف", "محقق", "نسبة"],
      ["التدريبات", "عدد تدريبات", "110", "77", "16", "21%"],
    ];
    const p = parseMasterPlan(grid, 2026, "s");
    expect(p.department).toBe("إدارة المكاتب");
    expect(p.items[0]!.pct).toBe(21);
  });
});

import { parseCenterPlan } from "./process";
import { buildVolunteerProfiles, canSeeCenter } from "./volunteers";

describe("center plans and volunteer access", () => {
  it("keeps missing-ID rows distinct instead of name-based merging",()=>{
    const rows=buildVolunteerProfiles([{stage:"جذب",sourceId:"s",grid:[["الاسم باللغة العربية"],["same"],["same"]]}]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.key).not.toBe(rows[1]?.key);
  });
  it("reads each center's quarter total and skips unused template slots", () => {
    const row0 = Array(40).fill(""); row0[0] = "اسم المحافظة"; row0[7] = "Q1"; row0[17] = "مركز طما"; row0[30] = "مركز 12";
    const row1 = Array(40).fill(""); row1[26] = "Q1 10%"; row1[39] = "Q1 10%";
    const body = Array(40).fill(""); body[0] = "التدريبات"; body[1] = "عدد تدريبات"; body[26] = "20"; body[27] = "5"; body[39] = "9";
    const out = parseCenterPlan("ماستر بلان - مراكز - Q1", [row0, row1, [], ["الاهداف", "البنود"], body], 2026);
    expect(out).toHaveLength(1);
    expect(out[0]!.center).toBe("طما");
    expect(out[0]!.items[0]!.pct).toBe(25);
  });

  it("merges a volunteer across stages by national id", () => {
    const p = buildVolunteerProfiles([
      { stage: "جذب", grid: [["الرقم القومي", "الاسم باللغة العربية (رباعي)", "المركز / المدينة"], ["30001012612315", "أحمد علي", "مركز طهطا"]] },
      { stage: "استقبال", grid: [["الرقم القومي"], ["30001012612315"]] },
    ]);
    expect(p).toHaveLength(1);
    expect(p[0]!.stages["استقبال"]).toBe(true);
    expect(p[0]!.stages["تسكين"]).toBe(false);
  });

  it("center managers only see their assigned centers; admins see all", () => {
    expect(canSeeCenter({ isAdmin: false, centers: ["طهطا"] }, "مركز طهطا")).toBe(true);
    expect(canSeeCenter({ isAdmin: false, centers: ["طهطا"] }, "طما")).toBe(false);
    expect(canSeeCenter({ isAdmin: true, centers: [] }, "طما")).toBe(true);
  });
});
