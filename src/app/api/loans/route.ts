import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { BRANCHES, COMPANIES, OUTCOMES } from "@/lib/constants";
import { fromDbDate, todayIst } from "@/lib/dates";
import { followUpTabWhere, followUpWhere } from "@/lib/follow-up-where";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import type { LoanListItem } from "@/features/cases/types";

// Lists loans the caller may see (by active allocation) with search, follow-up / outcome / flag / agent / company / branch filters and paging.
// Default order: next follow-up first (no follow-up last), then higher DPD, then bigger overdue amount. Mobile numbers are masked.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const agentId = sp.get("agentId");
  const company = sp.get("company");
  const branch = sp.get("branch");
  const outcome = sp.get("outcome");
  const flag = sp.get("flag");
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where: Prisma.LoanWhereInput = {
    AND: [
      loanScopeWhere(auth.user),
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
      followUpWhere(sp.get("followUp"), todayIst()),
      // The agent Follow-ups page tabs (new / today / post / closed).
      followUpTabWhere(sp.get("tab"), todayIst()),
      outcome && (OUTCOMES as readonly string[]).includes(outcome) ? { lastOutcome: outcome as (typeof OUTCOMES)[number] } : {},
      flag === "field-visit" ? { fieldVisitFlag: true } : flag === "escalated" ? { escalatedAt: { not: null } } : flag === "settlement-pending" ? { settlements: { some: { status: "PENDING" } } } : {},
    ],
  };

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      select: {
        id: true,
        agreementNo: true,
        company: true,
        branch: true,
        dpd: true,
        pendingEmis: true,
        status: true,
        overdueAmount: true,
        lastOutcome: true,
        lastContactedAt: true,
        nextFollowUpOn: true,
        fieldVisitFlag: true,
        escalatedAt: true,
        customer: { select: { name: true, mobilePrimary: true, mobileAlt: true, area: true } },
        allocations: { where: { active: true }, take: 1, select: { assignedOn: true, agent: { select: { id: true, name: true } } } },
        dispositions: { orderBy: { createdAt: "desc" }, take: 1, select: { ptpAmount: true } },
      },
      orderBy: [{ nextFollowUpOn: { sort: "asc", nulls: "last" } }, { dpd: "desc" }, { overdueAmount: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loan.count({ where }),
  ]);

  const items: LoanListItem[] = loans.map((l) => ({
    id: l.id,
    agreementNo: l.agreementNo,
    customerName: l.customer.name,
    mobile: maskMobile(l.customer.mobilePrimary),
    mobileAlt: maskMobile(l.customer.mobileAlt),
    pendingEmis: l.pendingEmis,
    status: l.status,
    area: l.customer.area,
    company: l.company,
    branch: l.branch,
    dpd: l.dpd,
    overdueAmount: l.overdueAmount?.toNumber() ?? null,
    agent: l.allocations[0]?.agent ?? null,
    assignedOn: l.allocations[0]?.assignedOn.toISOString() ?? null,
    lastOutcome: l.lastOutcome,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    nextFollowUpOn: fromDbDate(l.nextFollowUpOn),
    lastPtpAmount: l.lastOutcome === "PTP" ? (l.dispositions[0]?.ptpAmount?.toNumber() ?? null) : null,
    fieldVisitFlag: l.fieldVisitFlag,
    escalated: l.escalatedAt !== null,
  }));
  return NextResponse.json({ items, total, page, pageSize });
};
