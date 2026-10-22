/** Only local destinations are allowed after authentication. */
export function authDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/";
  const pathname = value.split(/[?#]/)[0];
  if (pathname === "/auth" || pathname === "/reset-password") return "/";
  return value;
}

export function authError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/email not confirmed/i.test(message)) return "أكّد بريدك الإلكتروني أولًا من رسالة التأكيد.";
  if (/already registered/i.test(message)) return "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.";
  if (/rate limit|too many requests/i.test(message)) return "محاولات كثيرة خلال وقت قصير؛ انتظر قليلًا ثم حاول مجددًا.";
  if (/fetch|network/i.test(message)) return "تعذر الاتصال؛ تحقق من الإنترنت وحاول مجددًا.";
  return message;
}