import { describe, expect, it } from "vitest";
import { presentationPhotoKey } from "./presentation-photos";

describe("presentation photo identity", () => {
  it("keeps the same item under different goals separate", () => {
    expect(presentationPhotoKey(2026, "الصحة", "عدد المستفيدين")).not.toBe(presentationPhotoKey(2026, "البيئة", "عدد المستفيدين"));
  });
  it("keeps plan years separate", () => {
    expect(presentationPhotoKey(2026, "الصحة", "قوافل")).not.toBe(presentationPhotoKey(2027, "الصحة", "قوافل"));
  });
});