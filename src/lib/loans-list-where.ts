import type { Prisma } from "@/generated/prisma/client";
import { loanScopeWhere } from "@/lib/auth";
import type { CurrentUser } from "@/lib/access";
import { BRANCHES, COMPANIES, OUTCOMES } from "@/lib/constants";
import { todayIst } from "@/lib/dates";
import { dpdBucketWhere } from "@/lib/dpd-bucket";
import { casesTabWhere, followUpTabWhere, followUpWhere } from "@/lib/follow-up-where";

// The Prisma filter for a loans list query string (search, agent / company / branch / retailer / DPD / tab / outcome / flag), limited to the
// caller's scope. Shared by the paged list and the Excel export so the file always holds exactly the rows the filtered table shows.
export const buildLoanListWhere = (user: CurrentUser, sp: URLSearchParams): Prisma.LoanWhereInput => {
  const q = sp.get("q")?.trim();
  const agentId = sp.get("agentId");
  const company = sp.get("company");
  const branch = sp.get("branch");
  const outcome = sp.get("outcome");
  const flag = sp.get("flag");
  // Retailer filter is for Admins only (the retailer module is Admin only); "none" = customers without a retailer.
  const retailerId = user.role === "ADMIN" ? sp.get("retailerId") : null;

  return {
    AND: [
      loanScopeWhere(user),
      q
        ? {
            OR: [
              { agreementNo: { contains: q } },
              { customer: { name: { contains: q } } },
              // Digits (4+) also match the customer's real numbers; the response still only carries masked ones.
              ...(/^\d{4,}$/.test(q) ? [{ customer: { mobilePrimary: { contains: q } } }, { customer: { mobileAlt: { contains: q } } }] : []),
            ],
          }
        : {},
      // "none" = loans with no active allocation (unassigned).
      agentId === "none" ? { allocations: { none: { active: true } } } : agentId ? { allocations: { some: { active: true, agentId } } } : {},
      company && (COMPANIES as readonly string[]).includes(company) ? { company: company as (typeof COMPANIES)[number] } : {},
      branch && (BRANCHES as readonly string[]).includes(branch) ? { branch } : {},
      retailerId === "none" ? { customer: { retailerId: null } } : retailerId ? { customer: { retailerId } } : {},
      dpdBucketWhere(sp.get("dpd")),
      followUpWhere(sp.get("followUp"), todayIst()),
      // The Cases page tabs (all / today / followup / closed).
      casesTabWhere(sp.get("stage"), todayIst()),
      // The agent Follow-ups page tabs (new / today / post / closed).
      followUpTabWhere(sp.get("tab"), todayIst()),
      outcome && (OUTCOMES as readonly string[]).includes(outcome) ? { lastOutcome: outcome as (typeof OUTCOMES)[number] } : {},
      flag === "field-visit" ? { fieldVisitFlag: true } : flag === "escalated" ? { escalatedAt: { not: null } } : flag === "settlement-pending" ? { settlements: { some: { status: "PENDING" } } } : {},
    ],
  };
};
