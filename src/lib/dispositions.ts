import type { OUTCOMES } from "@/lib/constants";
import { NOT_REACHABLE_LIMIT } from "@/lib/constants";

type OutcomeCode = (typeof OUTCOMES)[number];

// The follow-up state a Loan carries; dates are "yyyy-MM-dd" so this stays free of DB and timezone code.
export type LoanFollowUpState = {
  notReachableCount: number;
  fieldVisitFlag: boolean;
  escalatedAt: Date | null;
};

// What the agent submitted that matters for the loan's next state.
export type DispositionInput = {
  outcome: OutcomeCode;
  ptpDate?: string;
  nextFollowUpOn?: string;
};

// The new values to write on the Loan in the same transaction as the Disposition.
export type LoanFollowUpUpdate = LoanFollowUpState & {
  lastOutcome: OutcomeCode;
  lastContactedAt: Date;
  nextFollowUpOn: string | null;
};

// Decides how one outcome changes a loan: next follow-up date, not-reachable streak, field-visit flag and escalation.
// Pure (no DB, no clock): `now` is passed in so tests can fix it.
export const planDispositionEffects = (
  current: LoanFollowUpState,
  input: DispositionInput,
  now: Date,
  limit: number = NOT_REACHABLE_LIMIT,
): LoanFollowUpUpdate => {
  // A PTP always follows up on the promised day; PAID / WRONG_NUMBER / REFUSED_DISPUTE end the follow-up.
  const nextFollowUpOn =
    input.outcome === "PTP"
      ? (input.ptpDate ?? null)
      : input.outcome === "PAID" || input.outcome === "WRONG_NUMBER" || input.outcome === "REFUSED_DISPUTE"
        ? null
        : (input.nextFollowUpOn ?? null);

  // Streak only grows on consecutive NOT_REACHABLE; any other outcome resets it.
  const notReachableCount = input.outcome === "NOT_REACHABLE" ? current.notReachableCount + 1 : 0;

  // PAID clears both flags; otherwise a flag, once set, stays until a field visit (Phase 2B) or PAID clears it.
  const paid = input.outcome === "PAID";
  const fieldVisitFlag = paid ? false : current.fieldVisitFlag || notReachableCount >= limit;
  const escalatedAt = paid ? null : input.outcome === "REFUSED_DISPUTE" ? now : current.escalatedAt;

  return { lastOutcome: input.outcome, lastContactedAt: now, nextFollowUpOn, notReachableCount, fieldVisitFlag, escalatedAt };
};
