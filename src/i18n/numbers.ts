// Vietnamese number words, 0–100, as read in grade 1 textbooks:
// 15 "mười lăm", 21 "hai mươi mốt", 24 "hai mươi tư", 25 "hai mươi lăm".

const UNITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"] as const;

export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error(`numberWords: unsupported ${n}`);
  if (n < 10) return UNITS[n]!;
  if (n === 10) return "mười";
  if (n === 100) return "một trăm";
  const tens = Math.floor(n / 10), unit = n % 10;
  const head = tens === 1 ? "mười" : `${UNITS[tens]} mươi`;
  if (unit === 0) return head;
  if (unit === 5) return `${head} lăm`;
  if (unit === 1 && tens > 1) return `${head} mốt`;
  if (unit === 4 && tens > 1) return `${head} tư`;
  return `${head} ${UNITS[unit]}`;
}

/** "một" → "Một" (first letter only; Vietnamese diacritics are kept). */
export function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
