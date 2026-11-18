// Settlement rules: the customer pays `requested` and the rest of the overdue amount is waived.

const round2 = (n: number) => Math.round(n * 100) / 100;

// How much of the overdue amount is waived by a settlement for `requested`.
export const waiverFor = (overdue: number, requested: number) => round2(Math.max(0, overdue - requested));

// The waiver as a percentage of the overdue amount (0 when nothing is overdue).
export const waiverPct = (overdue: number, waiver: number) => (overdue > 0 ? round2((waiver / overdue) * 100) : 0);

// Who may decide: an Admin always; a Manager only when the waiver is within the Admin's limit (project.md "ek limit tak settlement approve").
export const canDecideSettlement = (role: string, pct: number, managerLimitPct: number) => role === "ADMIN" || (role === "MANAGER" && pct <= managerLimitPct);

// Checks a settlement offer against the loan: it must be positive and below the overdue amount, otherwise there is nothing to waive.
export const settlementOfferError = (overdue: number | null, requested: number): string | null => {
  if (overdue === null || overdue <= 0) return "This loan has nothing overdue to settle";
  if (!(requested > 0)) return "Enter the amount the customer will pay";
  if (requested >= overdue) return "The offer must be less than the overdue amount, otherwise nothing is waived";
  return null;
};
