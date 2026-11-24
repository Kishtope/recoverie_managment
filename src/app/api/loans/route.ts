import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fromDbDate } from "@/lib/dates";
import { buildLoanListWhere } from "@/lib/loans-list-where";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import type { LoanListItem } from "@/features/cases/types";

// Lists loans the caller may see (by active allocation) with search, follow-up / outcome / flag / agent / company / branch filters and paging.
// Default order: next follow-up first (no follow-up last), then higher DPD, then bigger overdue amount. Mobile numbers are masked. Admins also get
// each customer's retailer and can filter by it.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  // The retailer field is for Admins only (the retailer module is Admin only).
  const isAdmin = auth.user.role === "ADMIN";
  // "recent" = newest uploaded first (Customers page); the default order is by follow-up.
  const recent = sp.get("sort") === "recent";
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where = buildLoanListWhere(auth.user, sp);

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
        customer: { select: { name: true, mobilePrimary: true, mobileAlt: true, area: true, retailer: { select: { id: true, code: true, name: true } } } },
        allocations: { where: { active: true }, take: 1, select: { assignedOn: true, agent: { select: { id: true, name: true } } } },
        dispositions: { orderBy: { createdAt: "desc" }, take: 1, select: { ptpAmount: true } },
      },
      orderBy: recent ? [{ createdAt: "desc" }, { id: "asc" }] : [{ nextFollowUpOn: { sort: "asc", nulls: "last" } }, { dpd: "desc" }, { overdueAmount: "desc" }, { id: "asc" }],
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
    retailer: isAdmin ? l.customer.retailer : null,
  }));
  return NextResponse.json({ items, total, page, pageSize });
};
