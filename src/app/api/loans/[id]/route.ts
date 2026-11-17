import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { fromDbDate } from "@/lib/dates";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import type { LoanDetail } from "@/features/cases/types";

// Reads the customer's reference contacts (stored as JSON) into a safe, masked list.
const maskReferences = (value: unknown) =>
  (Array.isArray(value) ? value : []).map((r: { name?: string; relation?: string; mobile?: string }) => ({
    name: String(r?.name ?? ""),
    relation: String(r?.relation ?? ""),
    mobile: maskMobile(r?.mobile),
  }));

// One case with its customer and full outcome history. A case outside the caller's scope is a 404 (not 403) so its existence is not leaked.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const l = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    include: {
      customer: true,
      allocations: { where: { active: true }, take: 1, select: { agent: { select: { id: true, name: true } } } },
      dispositions: { orderBy: { createdAt: "desc" }, include: { agent: { select: { id: true, name: true } } } },
    },
  });
  if (!l) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const agent = l.allocations[0]?.agent ?? null;
  const loan: LoanDetail = {
    id: l.id,
    agreementNo: l.agreementNo,
    company: l.company,
    branch: l.branch,
    status: l.status,
    disbursedOn: fromDbDate(l.disbursedOn),
    emiAmount: l.emiAmount?.toNumber() ?? null,
    pendingEmis: l.pendingEmis,
    dpd: l.dpd,
    overdueAmount: l.overdueAmount?.toNumber() ?? null,
    nextFollowUpOn: fromDbDate(l.nextFollowUpOn),
    lastOutcome: l.lastOutcome,
    fieldVisitFlag: l.fieldVisitFlag,
    escalatedAt: l.escalatedAt?.toISOString() ?? null,
    customer: {
      name: l.customer.name,
      mobilePrimary: maskMobile(l.customer.mobilePrimary),
      mobileAlt: maskMobile(l.customer.mobileAlt),
      references: maskReferences(l.customer.references),
      address: l.customer.address,
      pin: l.customer.pin,
      area: l.customer.area,
    },
    agent,
    canAddOutcome: auth.user.role === "AGENT" && agent?.id === auth.user.id && l.status === "ACTIVE",
    dispositions: l.dispositions.map((d) => ({
      id: d.id,
      outcome: d.outcome,
      ptpDate: fromDbDate(d.ptpDate),
      ptpAmount: d.ptpAmount?.toNumber() ?? null,
      paidAmount: d.paidAmount?.toNumber() ?? null,
      nextFollowUpOn: fromDbDate(d.nextFollowUpOn),
      remarks: d.remarks,
      createdAt: d.createdAt.toISOString(),
      agent: d.agent,
    })),
  };
  return NextResponse.json({ loan });
};
