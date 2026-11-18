import { MAX_CALLS_PER_DAY } from "@/lib/constants";

// Why a call to this case must not be placed, or null when nothing blocks it. The window and pending-outcome checks live elsewhere.
export type CallRuleBlock = { reason: "DISPUTE" | "DO_NOT_CALL" | "DAILY_LIMIT"; message: string; status: number };

// Compliance rules from project.md: no calls on a disputed case, none to a do-not-call customer, and a per-day cap per customer.
// Pure so the start-call route and the case detail screen give the same answer.
export const checkCallRules = (c: { disputed: boolean; doNotCall: boolean; callsToday: number }, max: number = MAX_CALLS_PER_DAY): CallRuleBlock | null => {
  if (c.disputed) return { reason: "DISPUTE", message: "This case is in dispute. Recovery is paused until a manager resolves it", status: 409 };
  if (c.doNotCall) return { reason: "DO_NOT_CALL", message: "This customer is marked do-not-call", status: 403 };
  if (c.callsToday >= max) return { reason: "DAILY_LIMIT", message: `Daily limit reached: ${max} calls per customer per day`, status: 429 };
  return null;
};
