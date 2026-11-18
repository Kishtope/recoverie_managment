import { CALLING_WINDOW, NOT_REACHABLE_LIMIT, RECRUITER_ESCALATION_DAYS, RECRUITER_REMINDER_DAYS, SETTLEMENT_MANAGER_LIMIT_PCT } from "@/lib/constants";

// Settings an Admin can change, with the value used when the database has no row for them.
export type CallingWindow = { startHour: number; endHour: number };

export type SettingValues = {
  "calling.window": CallingWindow;
  "followUp.notReachableTries": number;
  "ptp.graceDays": number;
  "recruiter.escalationDays": number;
  "recruiter.reminderDays": number;
  "settlement.managerLimitPct": number;
  "dashboard.monthlyTargetPct": number | null;
};
export type SettingKey = keyof SettingValues;

export const SETTING_KEYS = ["calling.window", "followUp.notReachableTries", "ptp.graceDays", "recruiter.escalationDays", "recruiter.reminderDays", "settlement.managerLimitPct", "dashboard.monthlyTargetPct"] as const;

// Defaults come from lib/constants.ts so there is one place that says what "normal" is.
export const SETTING_DEFAULTS: SettingValues = {
  "calling.window": { startHour: CALLING_WINDOW.startHour, endHour: CALLING_WINDOW.endHour },
  "followUp.notReachableTries": NOT_REACHABLE_LIMIT,
  "ptp.graceDays": 0,
  "recruiter.escalationDays": RECRUITER_ESCALATION_DAYS,
  "recruiter.reminderDays": RECRUITER_REMINDER_DAYS,
  "settlement.managerLimitPct": SETTLEMENT_MANAGER_LIMIT_PCT,
  "dashboard.monthlyTargetPct": null,
};
