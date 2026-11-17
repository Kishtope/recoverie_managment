// "Today" for recovery work is always the Indian calendar day, whatever timezone the server or browser runs in.
const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

// Today's date in India as "yyyy-MM-dd" (en-CA formats dates in that order).
export const todayIst = (now: Date = new Date()) => IST_DAY.format(now);

// Converts "yyyy-MM-dd" to the UTC-midnight Date Prisma stores in a @db.Date column.
export const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

// Converts a @db.Date value back to "yyyy-MM-dd" (UTC date part, the inverse of toDbDate).
export const fromDbDate = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);

// Adds whole days to a "yyyy-MM-dd" string (used for "next 7 days" and the "tomorrow" prefill).
export const addDays = (day: string, days: number) => {
  const d = toDbDate(day);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// First day ("yyyy-MM-dd") of the month that contains `day`.
export const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
