import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/access";
import { userScopeWhere } from "@/lib/access";

// Why an allocation ended when the daily job moved it from a recruiter to a caller (same text recruiter-escalation.ts writes).
export const RECRUITER_ESCALATION_REASON = "RECRUITER_ESCALATION";

// Prisma `where` for the allocations a recruiter holds right now: active, on an active case, by an active recruiter inside the caller's
// scope (a Manager sees their own team's recruiters, an Admin all). `recruiterId` narrows to one recruiter.
export const heldByRecruiterWhere = (user: CurrentUser, recruiterId?: string): Prisma.AllocationWhereInput => ({
  active: true,
  loan: { status: "ACTIVE" },
  agent: { AND: [{ role: "RECRUITER", status: "ACTIVE" }, userScopeWhere(user)] },
  ...(recruiterId ? { agentId: recruiterId } : {}),
});

// Prisma `where` for the allocations that ended in an escalation, for recruiters inside the caller's scope.
export const escalatedFromRecruiterWhere = (user: CurrentUser, recruiterId?: string): Prisma.AllocationWhereInput => ({
  endReason: RECRUITER_ESCALATION_REASON,
  agent: { AND: [{ role: "RECRUITER" }, userScopeWhere(user)] },
  ...(recruiterId ? { agentId: recruiterId } : {}),
});

// Search box text matched against a case's agreement number or the customer's name.
export const loanSearchWhere = (q: string | undefined): Prisma.AllocationWhereInput =>
  q ? { loan: { OR: [{ agreementNo: { contains: q } }, { customer: { name: { contains: q } } }] } } : {};

// Whole days from one "yyyy-MM-dd" day to another (negative when `to` is earlier).
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
