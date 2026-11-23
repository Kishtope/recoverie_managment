import type { Prisma, Role } from "@/generated/prisma/client";

// The signed-in user as every route sees it: always read from the DB, never trusted from the JWT.
export type CurrentUser = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  agencyId: string | null;
  agency: { id: string; name: string } | null;
  access: { company: string; branch: string }[];
};

// Prisma `where` for the User table limited to what `user` may see (server-side access rule).
// Admin: all. Manager: self + direct reports + users sharing one of their company/branch grants.
// Agency owner: their agency's members. Agent: only themselves.
export const userScopeWhere = (user: CurrentUser): Prisma.UserWhereInput => {
  switch (user.role) {
    case "ADMIN":
      return {};
    case "MANAGER":
      return {
        OR: [
          { id: user.id },
          { reportsToId: user.id },
          ...user.access.map(({ company, branch }) => ({ access: { some: { company: company as never, branch } } })),
        ],
      };
    case "AGENCY_OWNER":
      return user.agencyId ? { OR: [{ id: user.id }, { agencyId: user.agencyId }] } : { id: user.id };
    default:
      return { id: user.id };
  }
};

// Prisma `where` for the Call table limited to what `user` may see. An agent sees only their own calls; everyone else sees calls
// placed by users in their user scope or made on loans in their loan scope. Admin sees all (including inbound calls matched to no loan).
export const callScopeWhere = (user: CurrentUser): Prisma.CallWhereInput => {
  if (user.role === "ADMIN") return {};
  if (user.role === "AGENT" || user.role === "CALLER") return { agentId: user.id };
  return { OR: [{ agent: userScopeWhere(user) }, { loan: loanScopeWhere(user) }] };
};

// Prisma `where` for the Loan table limited to what `user` may see. Ownership follows the ACTIVE allocation only,
// so an agent whose case was reassigned stops seeing it. Admin: all. Manager: their team's cases + loans in their company/branch grants.
// Agency owner: their agency's cases. Agent: only cases allocated to them.
export const loanScopeWhere = (user: CurrentUser): Prisma.LoanWhereInput => {
  const active = (where: Prisma.AllocationWhereInput): Prisma.LoanWhereInput => ({ allocations: { some: { active: true, ...where } } });
  switch (user.role) {
    case "ADMIN":
      return {};
    case "MANAGER":
      return {
        OR: [
          active({ agentId: user.id }),
          active({ agent: { reportsToId: user.id } }),
          ...user.access.map(({ company, branch }) => ({ company: company as never, branch })),
        ],
      };
    case "AGENCY_OWNER":
      return active(user.agencyId ? { agencyId: user.agencyId } : { agentId: user.id });
    default:
      return active({ agentId: user.id });
  }
};

// Loans currently allocated to this user. Workers act (call, record outcomes, count on their dashboard) only on these;.
export const ownCaseWhere = (userId: string): Prisma.LoanWhereInput => ({ allocations: { some: { active: true, agentId: userId } } });
