import { loanScopeWhere, userScopeWhere } from "@/lib/auth";
import type { CurrentUser } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { planAllocation, summarizePlan, type PlanLoan } from "@/lib/allocation-plan";
import { todayIst } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { AutoAllocateInput } from "@/features/cases/schemas";
import type { AutoAllocateResult } from "@/features/cases/types";

// Most unassigned cases one run handles; a larger backlog is done in several runs.
const RUN_CAP = 5000;
// Agreement numbers looked up per query when a run is limited to one uploaded file.
const LOOKUP_CHUNK = 1000;

export type AllocationRunOutcome = { ok: true; result: AutoAllocateResult } | { ok: false; error: string };

// Splits the active, unassigned cases in `user`'s scope between the chosen people by a rule (equal count, DPD bucket, branch, amount).
// `dryRun` returns the same plan without saving, so a preview and the real run always agree. With `agreementNos` only the cases from
// that list (an uploaded file) are considered. Cases that already have an owner are never touched; a race with another run is safe
// because of the unique activeLoanId (the loser's rows are skipped). Shared by POST /api/allocation/auto and the import upload.
export const runAutoAllocation = async ({
  user,
  rule,
  agentIds,
  dryRun = false,
  agreementNos,
}: Pick<AutoAllocateInput, "rule" | "agentIds" | "dryRun"> & { user: CurrentUser; agreementNos?: string[] }): Promise<AllocationRunOutcome> => {
  const people = await prisma.user.findMany({
    where: { AND: [userScopeWhere(user), { id: { in: agentIds }, status: "ACTIVE", role: { in: ["AGENT", "RECRUITER"] } }] },
    select: { id: true, name: true, agencyId: true, access: { select: { company: true, branch: true } }, _count: { select: { allocations: { where: { active: true } } } } },
  });
  if (people.length === 0) return { ok: false, error: "Choose active agents inside your team" };

  const open = [{ status: "ACTIVE" as const }, { allocations: { none: { active: true } } }, loanScopeWhere(user)];
  let rows;
  let totalUnassigned: number;
  if (agreementNos) {
    // Limited to one file: find which of its cases are still open, a chunk of agreement numbers at a time.
    const ids: string[] = [];
    for (let i = 0; i < agreementNos.length; i += LOOKUP_CHUNK) {
      const found = await prisma.loan.findMany({ where: { AND: [...open, { agreementNo: { in: agreementNos.slice(i, i + LOOKUP_CHUNK) } }] }, select: { id: true } });
      ids.push(...found.map((l) => l.id));
    }
    totalUnassigned = ids.length;
    rows = ids.length
      ? await prisma.loan.findMany({ where: { id: { in: ids.slice(0, RUN_CAP) } }, select: { id: true, dpd: true, overdueAmount: true, company: true, branch: true }, orderBy: [{ dpd: "desc" }, { id: "asc" }] })
      : [];
  } else {
    const where = { AND: open };
    [rows, totalUnassigned] = await Promise.all([
      prisma.loan.findMany({ where, select: { id: true, dpd: true, overdueAmount: true, company: true, branch: true }, orderBy: [{ dpd: "desc" }, { id: "asc" }], take: RUN_CAP }),
      prisma.loan.count({ where }),
    ]);
  }
  const loans: PlanLoan[] = rows.map((l) => ({ id: l.id, dpd: l.dpd, overdueAmount: l.overdueAmount?.toNumber() ?? 0, company: l.company, branch: l.branch }));

  const plan = planAllocation(
    loans,
    people.map((p) => ({ id: p.id, load: p._count.allocations, branches: p.access.map((a) => `${a.company}|${a.branch}`) })),
    rule,
  );

  let assigned = plan.assignments.length;
  if (!dryRun && assigned > 0) {
    const now = new Date();
    const agencyOf = new Map(people.map((p) => [p.id, p.agencyId]));
    const created = await prisma.allocation.createMany({
      data: plan.assignments.map((a) => ({ loanId: a.loanId, activeLoanId: a.loanId, agentId: a.agentId, agencyId: agencyOf.get(a.agentId) ?? null, assignedById: user.id, assignedOn: now })),
      skipDuplicates: true,
    });
    assigned = created.count;
    await notify(prisma, plan.assignments.map((a) => ({ userId: a.agentId, type: "REASSIGNED" as const, loanId: a.loanId, day: todayIst(now) })));
    await logAudit(user.id, "allocation.auto", "Allocation", undefined, { rule, people: people.length, assigned, unassigned: plan.unassigned.length, fromFile: !!agreementNos });
  }

  const totals = summarizePlan(plan, loans);
  return {
    ok: true,
    result: {
      dryRun: !!dryRun,
      totalUnassigned,
      assigned,
      unassigned: totalUnassigned - assigned,
      capped: totalUnassigned > RUN_CAP,
      people: people.map((p) => ({ agentId: p.id, name: p.name, cases: totals.get(p.id)?.cases ?? 0, amount: totals.get(p.id)?.amount ?? 0, buckets: totals.get(p.id)?.buckets ?? {} })),
    },
  };
};
