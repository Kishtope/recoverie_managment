import { todayIst } from "@/lib/dates";

export type DayRange = { from: string; to: string }; // both "yyyy-MM-dd", inclusive

// Financial year (1 April to 31 March) that contains a day, written "2026-2027". `day` is "yyyy-MM-dd".
export const getFy = (day: string) => {
  const year = Number(day.slice(0, 4));
  const start = Number(day.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}-${start + 1}`;
};

// True for a well-formed financial year such as "2026-2027" (the second year must follow the first).
export const isFy = (fy: string) => /^\d{4}-\d{4}$/.test(fy) && Number(fy.slice(5)) === Number(fy.slice(0, 4)) + 1;

// First and last day of a financial year; null when `fy` is malformed.
export const fyRange = (fy: string): DayRange | null => (isFy(fy) ? { from: `${fy.slice(0, 4)}-04-01`, to: `${fy.slice(5)}-03-31` } : null);

// Last day of the month "yyyy-MM".
const lastDayOfMonth = (month: string) => {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  return d.toISOString().slice(0, 10);
};

// The day range a dashboard filter means: the whole FY for month "all", or one month that must lie inside that FY (else null).
export const monthRange = (fy: string, month: string): DayRange | null => {
  const year = fyRange(fy);
  if (!year) return null;
  if (month === "all") return year;
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const range = { from: `${month}-01`, to: lastDayOfMonth(month) };
  return range.from >= year.from && range.to <= year.to ? range : null;
};

// The 12 months of a financial year as "yyyy-MM", April first.
export const fyMonths = (fy: string) => {
  const start = Number(fy.slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => (i < 9 ? `${start}-${String(i + 4).padStart(2, "0")}` : `${start + 1}-${String(i - 8).padStart(2, "0")}`));
};

// The current FY and the two before it, newest first, for the filter dropdown.
export const recentFys = (today: string = todayIst()) => {
  const start = Number(getFy(today).slice(0, 4));
  return [0, 1, 2].map((back) => `${start - back}-${start - back + 1}`);
};
