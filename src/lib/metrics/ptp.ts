import { addDays } from "@/lib/dates";

export type PtpState = "upcoming" | "kept" | "broken";

// Decides what became of one promise to pay. Kept = payments from the day it was made up to `ptpDate + graceDays` add up to at least the
// promised amount; broken = that window is over and they do not; upcoming = the window is still open. All days are "yyyy-MM-dd".
export const classifyPtp = ({
  ptpDate,
  ptpAmount,
  graceDays,
  today,
  paidInWindow,
}: {
  ptpDate: string;
  ptpAmount: number | null;
  graceDays: number;
  today: string;
  // Sum of the loan's payments from the day the promise was recorded to the end of the grace window.
  paidInWindow: number;
}): PtpState => {
  if (ptpAmount !== null && paidInWindow >= ptpAmount) return "kept";
  if (ptpAmount === null && paidInWindow > 0) return "kept"; // no amount promised: any payment counts
  return today > addDays(ptpDate, graceDays) ? "broken" : "upcoming";
};
