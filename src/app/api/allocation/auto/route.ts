import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere, userScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { planAllocation, summarizePlan, type PlanLoan } from "@/lib/allocation-plan";
import { todayIst } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { autoAllocateSchema } from "@/features/cases/schemas";
import type { AutoAllocateResult } from "@/features/cases/types";

// Most unassigned cases one run handles; a larger backlog is done in several runs.
const RUN_CAP = 5000;

// Allocation engine: splits the active, unassigned cases in the caller's scope between the chosen people by a rule (equal count, DPD
// bucket, branch, amount). `dryRun` returns the same plan without saving, so the preview and the real run always agree.
// Admin and Manager only. Cases already allocated are never touched; a race with another run is safe because of the unique
// activeLoanId (the loser's rows are skipped).
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const parsed = autoAllocateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { rule, agentIds, dryRun } = parsed.data;

  const people = await prisma.user.findMany({
    where: { AND: [userScopeWhere(auth.user), { id: { in: agentIds }, status: "ACTIVE", role: { in: ["AGENT", "RECRUITER"] } }] },
    select: { id: true, name: true, agencyId: true, access: { select: { company: true, branch: true } }, _count: { select: { allocations: { where: { active: true } } } } },
  });
  if (people.length === 0) return NextResponse.json({ error: "Choose active agents inside your team" }, { status: 400 });

  const where = { AND: [{ status: "ACTIVE" as const }, { allocations: { none: { active: true } } }, loanScopeWhere(auth.user)] };
  const [rows, totalUnassigned] = await Promise.all([
    prisma.loan.findMany({ where, select: { id: true, dpd: true, overdueAmount: true, company: true, branch: true }, orderBy: [{ dpd: "desc" }, { id: "asc" }], take: RUN_CAP }),
    prisma.loan.count({ where }),
  ]);
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
      data: plan.assignments.map((a) => ({ loanId: a.loanId, activeLoanId: a.loanId, agentId: a.agentId, agencyId: agencyOf.get(a.agentId) ?? null, assignedById: auth.user.id, assignedOn: now })),
      skipDuplicates: true,
    });
    assigned = created.count;
    await notify(prisma, plan.assignments.map((a) => ({ userId: a.agentId, type: "REASSIGNED" as const, loanId: a.loanId, day: todayIst(now) })));
    await logAudit(auth.user.id, "allocation.auto", "Allocation", undefined, { rule, people: people.length, assigned, unassigned: plan.unassigned.length });
  }

  const totals = summarizePlan(plan, loans);
  const result: AutoAllocateResult = {
    dryRun,
    totalUnassigned,
    assigned,
    unassigned: totalUnassigned - assigned,
    capped: totalUnassigned > RUN_CAP,
    people: people.map((p) => ({ agentId: p.id, name: p.name, cases: totals.get(p.id)?.cases ?? 0, amount: totals.get(p.id)?.amount ?? 0, buckets: totals.get(p.id)?.buckets ?? {} })),
  };
  return NextResponse.json(result);
};
