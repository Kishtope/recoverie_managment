import { dpdBucket, DPD_BUCKETS } from "@/lib/dpd-bucket";

// How unassigned cases are split between the chosen people (project.md "Allocation engine").
export const ALLOCATION_RULES = ["EQUAL", "BUCKET", "BRANCH", "AMOUNT"] as const;
export type AllocationRule = (typeof ALLOCATION_RULES)[number];

export const ALLOCATION_RULE_LABELS: Record<AllocationRule, { label: string; hint: string }> = {
  EQUAL: { label: "Equal count", hint: "Everyone ends up with about the same number of cases." },
  BUCKET: { label: "Overdue bucket", hint: "Each person gets an equal share of every DPD bucket (0–30, 31–60, 61–90, 90+), so nobody ends up with only the hardest cases." },
  BRANCH: { label: "Branch", hint: "A case goes only to someone with access to its company and branch. Cases nobody can take stay unassigned." },
  AMOUNT: { label: "Loan amount", hint: "Everyone ends up with about the same total overdue amount." },
};

export type PlanLoan = { id: string; dpd: number | null; overdueAmount: number; company: string; branch: string };
export type PlanAgent = { id: string; load: number; branches: string[] }; // branches as "company|branch"
export type AllocationPlan = { assignments: { loanId: string; agentId: string }[]; unassigned: string[] };

// Picks who gets the next case: lowest score first, ties broken by id so a plan is repeatable.
const lowest = (agents: PlanAgent[], score: Map<string, number>) =>
  [...agents].sort((a, b) => (score.get(a.id) ?? 0) - (score.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0];

// Splits `loans` between `agents` by `rule`. Pure (no DB, no clock) so a preview and the real run always agree.
// `load` is how many active cases a person already holds: equal count and bucket rules count it, so a busy person gets fewer new ones.
export const planAllocation = (loans: PlanLoan[], agents: PlanAgent[], rule: AllocationRule): AllocationPlan => {
  const plan: AllocationPlan = { assignments: [], unassigned: [] };
  if (agents.length === 0) return { assignments: [], unassigned: loans.map((l) => l.id) };

  const count = new Map(agents.map((a) => [a.id, a.load]));
  const amount = new Map(agents.map((a) => [a.id, 0]));
  // Per-bucket counts for the bucket rule, so each bucket is dealt out evenly on its own.
  const perBucket = new Map<string, number>();
  const give = (loan: PlanLoan, agent: PlanAgent) => {
    plan.assignments.push({ loanId: loan.id, agentId: agent.id });
    count.set(agent.id, (count.get(agent.id) ?? 0) + 1);
    amount.set(agent.id, (amount.get(agent.id) ?? 0) + loan.overdueAmount);
    perBucket.set(`${agent.id}|${dpdBucket(loan.dpd)}`, (perBucket.get(`${agent.id}|${dpdBucket(loan.dpd)}`) ?? 0) + 1);
  };

  // Stable order: biggest first for the amount rule (greedy balancing), otherwise as given.
  const ordered = rule === "AMOUNT" ? [...loans].sort((a, b) => b.overdueAmount - a.overdueAmount || a.id.localeCompare(b.id)) : loans;

  for (const loan of ordered) {
    let pool = agents;
    if (rule === "BRANCH") {
      pool = agents.filter((a) => a.branches.includes(`${loan.company}|${loan.branch}`));
      if (pool.length === 0) {
        plan.unassigned.push(loan.id);
        continue;
      }
    }
    const score =
      rule === "AMOUNT"
        ? amount
        : rule === "BUCKET"
          ? new Map(pool.map((a) => [a.id, (perBucket.get(`${a.id}|${dpdBucket(loan.dpd)}`) ?? 0) * 1000 + (count.get(a.id) ?? 0)]))
          : count;
    give(loan, lowest(pool, score));
  }
  return plan;
};

// Per-person totals of a plan, for the preview table.
export const summarizePlan = (plan: AllocationPlan, loans: PlanLoan[]) => {
  const byId = new Map(loans.map((l) => [l.id, l]));
  const out = new Map<string, { cases: number; amount: number; buckets: Record<string, number> }>();
  for (const { loanId, agentId } of plan.assignments) {
    const l = byId.get(loanId);
    const row = out.get(agentId) ?? { cases: 0, amount: 0, buckets: Object.fromEntries(DPD_BUCKETS.map((b) => [b, 0])) };
    row.cases += 1;
    row.amount += l?.overdueAmount ?? 0;
    if (l) row.buckets[dpdBucket(l.dpd)] += 1;
    out.set(agentId, row);
  }
  return out;
};
