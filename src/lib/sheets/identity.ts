import { normalizeArabic } from "./normalize";

export const AGE_GROUPS = ["أقل من 18", "18 - 24", "25 - 34", "35 فأكثر", "غير محدد"];
export function cleanDigits(value: string) {
  return normalizeArabic(value).replace(/[\s()+-]/g, "");
}
export function inspectNationalId(value: string, today = new Date()) {
  const id = cleanDigits(value);
  const invalid = { valid: false, gender: "غير محدد", birthDate: null as string | null, age: null as number | null };
  if (!/^[23]\d{13}$/.test(id)) return invalid;
  const year = (id[0] === "2" ? 1900 : 2000) + Number(id.slice(1, 3));
  const month = Number(id.slice(3, 5));
  const day = Number(id.slice(5, 7));
  const birth = new Date(Date.UTC(year, month - 1, day));
  const governorate = Number(id.slice(7, 9));
  const codes = [1,2,3,4,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,88];
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day || birth > today || !codes.includes(governorate)) return invalid;
  let age = today.getUTCFullYear() - year;
  if (today.getUTCMonth() < month - 1 || (today.getUTCMonth() === month - 1 && today.getUTCDate() < day)) age--;
  return { valid: true, gender: Number(id[12]) % 2 ? "ذكر" : "أنثى", birthDate: birth.toISOString().slice(0, 10), age };
}
export function ageGroup(age: number | null) {
  if (age === null || age < 0 || age > 120) return "غير محدد";
  if (age < 18) return "أقل من 18";
  if (age < 25) return "18 - 24";
  if (age < 35) return "25 - 34";
  return "35 فأكثر";
}
export function whatsappNumber(value: string): string | null {
  let phone = cleanDigits(value);
  if (phone.startsWith("0020")) phone = phone.slice(2);
  if (/^01[0125]\d{8}$/.test(phone)) phone = `2${phone}`;
  return /^201[0125]\d{8}$/.test(phone) ? phone : null;
}
export function genderConflict(recorded: string, inferred: string) {
  const normalized = normalizeArabic(recorded);
  const gender = /^(ذكر|male)$/.test(normalized) ? "ذكر" : /^(انثي|انثى|انثه|female)$/.test(normalized) ? "أنثى" : "";
  return !!gender && inferred !== "غير محدد" && gender !== inferred;
}