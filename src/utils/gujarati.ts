/**
 * Gujarati language helpers and date formatters
 */

export const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

export function toGujaratiNum(num: number | string): string {
  return num
    .toString()
    .split('')
    .map((char) => {
      const n = parseInt(char, 10);
      return !isNaN(n) ? GUJARATI_DIGITS[n] : char;
    })
    .join('');
}

export const GUJARATI_MONTHS = [
  'જાન્યુઆરી',
  'ફેબ્રુઆરી',
  'માર્ચ',
  'એપ્રિલ',
  'મે',
  'જૂન',
  'જુલાઈ',
  'ઓગસ્ટ',
  'સપ્ટેમ્બર',
  'ઓક્ટોબર',
  'નવેમ્બર',
  'ડિસેમ્બર',
];

export function getGujaratiMonthName(month: number): string {
  // month is 1-indexed (1 = January, 12 = December)
  return GUJARATI_MONTHS[(month - 1) % 12] || GUJARATI_MONTHS[0];
}

export const GUJARATI_DAYS = [
  'રવિવાર',
  'સોમવાર',
  'મંગળવાર',
  'બુધવાર',
  'ગુરુવાર',
  'શુક્રવાર',
  'શનિવાર',
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatGujaratiDate(dateString: string): string {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = GUJARATI_DAYS[dateObj.getDay()];
    const monthName = GUJARATI_MONTHS[m - 1];
    const gujDay = toGujaratiNum(d);
    const gujYear = toGujaratiNum(y);
    return `${dayName}, ${gujDay} ${monthName} ${gujYear}`;
  } catch {
    return dateString;
  }
}
