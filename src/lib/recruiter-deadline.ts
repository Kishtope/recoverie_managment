import { addDays, todayIst } from "@/lib/dates";

// Where a recruiter's case stands against the escalation limit; dates are "yyyy-MM-dd" so this stays free of DB and timezone code.
export type RecruiterDeadline = { deadline: string; daysLeft: number; overdue: boolean };

// The day the recruiter's time runs out: assignment day + the Admin's limit (10 or 15 days). An open promise to pay (or a part payment
// with a follow-up) keeps the timer running until its date, so a customer who promised to pay on day 12 is not escalated on day 10.
export const recruiterDeadline = (
  assignedOn: Date,
  limitDays: number,
  today: string = todayIst(),
  promisedFor: string | null = null,
): RecruiterDeadline => {
  const base = addDays(todayIst(assignedOn), limitDays);
  const deadline = promisedFor && promisedFor > base ? promisedFor : base;
  const daysLeft = Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return { deadline, daysLeft, overdue: daysLeft < 0 };
};

// True on the one day the recruiter should get the "N days left" reminder.
export const needsDeadlineReminder = (d: RecruiterDeadline, reminderDays: number) => d.daysLeft === reminderDays;
