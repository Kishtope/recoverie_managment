import { NextResponse } from "next/server";
import { loanScopeWhere, userScopeWhere } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moveCase } from "@/lib/reassign-case";
import { assignCasesSchema } from "@/features/recruiters/schemas";
import type { AssignCasesResult } from "@/features/recruiters/types";

// Hands a recruiter up to `count` cases nobody holds yet (active, inside the caller's scope, matching the optional company / branch / DPD
// filters), most overdue first. Each case starts the recruiter's escalation timer the moment it is assigned. Admin and Manager.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const parsed = assignCasesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { recruiterId, count, company, branch, minDpd } = parsed.data;

  const recruiter = await prisma.user.findFirst({
    where: { AND: [userScopeWhere(auth.user), { id: recruiterId, role: "RECRUITER", status: "ACTIVE" }] },
    select: { id: true, name: true, agencyId: true },
  });
  if (!recruiter) return NextResponse.json({ error: "Choose a recruiter inside your team" }, { status: 400 });

  const loans = await prisma.loan.findMany({
    where: {
      AND: [
        loanScopeWhere(auth.user),
        { status: "ACTIVE" },
        { allocations: { none: { active: true } } },
        company ? { company } : {},
        branch ? { branch } : {},
        minDpd !== undefined ? { dpd: { gte: minDpd } } : {},
      ],
    },
    select: { id: true },
    orderBy: [{ overdueAmount: { sort: "desc", nulls: "last" } }, { id: "asc" }],
    take: count,
  });
  if (loans.length === 0) return NextResponse.json({ error: "No unassigned cases match these filters" }, { status: 400 });

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      for (const l of loans) await moveCase(tx, { loanId: l.id, currentAllocationId: null, agent: recruiter, actedBy: auth.user.id, now });
    });
  } catch (e) {
    // Someone else allocated one of these cases a moment ago (one active allocation per case).
    if ((e as { code?: string }).code === "P2002") return NextResponse.json({ error: "Some cases were just assigned by someone else. Try again." }, { status: 409 });
    throw e;
  }
  await logAudit(auth.user.id, "loan.recruiter_assign", "Loan", undefined, { to: recruiter.id, assigned: loans.length, company, branch, minDpd });

  return NextResponse.json({ assigned: loans.length, recruiterName: recruiter.name } satisfies AssignCasesResult);
};
