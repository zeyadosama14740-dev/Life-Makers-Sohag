import { describe, expect, it } from "vitest";
import { matchPhoto } from "./photo-match";

const photos = [
  { url: "a", label: "قافلة طبية المراغة.jpg" },
  { url: "b", label: "ورشة تدريب المتطوعين" },
];

describe("matchPhoto", () => {
  it("picks the photo sharing words with the activity", () => {
    expect(matchPhoto("عدد القوافل الطبية", photos)?.url).toBe("a");
    expect(matchPhoto("تدريب", photos)?.url).toBe("b");
  });
  it("returns null when nothing matches", () => {
    expect(matchPhoto("الشراكات", photos)).toBeNull();
  });
});
