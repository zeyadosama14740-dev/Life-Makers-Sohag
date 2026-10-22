import { describe, expect, it } from "vitest";
import { ageGroup, inspectNationalId, whatsappNumber, genderConflict } from "./identity";
const today = new Date("2026-10-13T00:00:00Z");
describe("Egyptian identity demographic rules", () => {
  it("uses the thirteenth digit, odd for male", () => expect(inspectNationalId("30001012612315", today).gender).toBe("ذكر"));
  it("uses the thirteenth digit, even for female", () => expect(inspectNationalId("٣٠٠٠١٠١٢٦١٢٣٢٥", today).gender).toBe("أنثى"));
  it("rejects incomplete IDs", () => expect(inspectNationalId("123", today).valid).toBe(false));
  it("rejects invalid calendar dates instead of inferring birth date", () => expect(inspectNationalId("30002302612315", today).birthDate).toBeNull());
  it("keeps recorded gender conflicts visible", () => expect(genderConflict("أنثى", "ذكر")).toBe(true));
  it("calculates age from a valid birth date", () => expect(inspectNationalId("30001012612315", today).age).toBe(26));
  it("uses non-overlapping requested age ranges", () => expect([17,18,24,25,34,35,null].map(ageGroup)).toEqual(["أقل من 18","18 - 24","18 - 24","25 - 34","25 - 34","35 فأكثر","غير محدد"]));
  it("normalizes Egyptian mobile numbers for WhatsApp", () => expect(whatsappNumber("٠١٠١٢٣٤٥٦٧٨")).toBe("201012345678"));
  it("does not offer WhatsApp for incomplete numbers", () => expect(whatsappNumber("0100")).toBeNull());
});