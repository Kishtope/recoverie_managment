import { expect, test } from "bun:test";
import { needsDeadlineReminder, recruiterDeadline } from "./recruiter-deadline";

const assigned = new Date("2026-11-01T06:00:00Z"); // 1 Nov IST

test("the deadline is assignment day + limit and days left counts down to it", () => {
  expect(recruiterDeadline(assigned, 10, "2026-11-01")).toEqual({ deadline: "2026-11-11", daysLeft: 10, overdue: false });
  expect(recruiterDeadline(assigned, 10, "2026-11-11").daysLeft).toBe(0);
  expect(recruiterDeadline(assigned, 10, "2026-11-12")).toMatchObject({ daysLeft: -1, overdue: true });
});

test("a promise dated after the limit extends the timer; an earlier one does not", () => {
  expect(recruiterDeadline(assigned, 10, "2026-11-12", "2026-11-14")).toMatchObject({ deadline: "2026-11-14", overdue: false });
  expect(recruiterDeadline(assigned, 10, "2026-11-12", "2026-11-05").deadline).toBe("2026-11-11");
});

test("the reminder fires exactly reminderDays before the deadline", () => {
  expect(needsDeadlineReminder(recruiterDeadline(assigned, 10, "2026-11-09"), 2)).toBe(true);
  expect(needsDeadlineReminder(recruiterDeadline(assigned, 10, "2026-11-08"), 2)).toBe(false);
});
