import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { teamLoanWhere } from "@/lib/metrics/period";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import { prisma } from "@/lib/prisma";
import { buildLoanOverdueXlsx, loanOverdueFileName, type OverdueLoan } from "@/lib/reports/loan-overdue-xlsx";

// Most rows one export may hold, so a huge portfolio cannot exhaust memory.
const MAX_ROWS = 20000;

// Decimal column -> plain number (null stays null).
const num = (d: { toNumber: () => number } | null) => (d === null ? null : d.toNumber());

// "Loan Overdue" Excel file in the hub's 53-column format: every active case with an overdue amount inside the caller's scope and the dashboard's
// company / branch / agency / agent / DPD filters (loans are a current snapshot, so FY and month do not narrow it). Only Admin sees full mobile
// numbers; Manager and Agency owner get them masked like on screen. Every export is written to the audit log.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;
  const { user, q } = parsed;

  const where = { AND: [teamLoanWhere(user, q), { status: "ACTIVE" as const }, { overdueAmount: { gt: 0 } }] };
  const total = await prisma.loan.count({ where });
  // Nothing matches: the workbook still downloads, with a single row showing 0.
  if (total > MAX_ROWS) {
    return NextResponse.json({ error: `Too many cases to export (${total.toLocaleString("en-IN")}). Narrow the filters to ${MAX_ROWS.toLocaleString("en-IN")} or fewer.` }, { status: 400 });
  }

  const rows = await prisma.loan.findMany({
    where,
    orderBy: { agreementNo: "asc" },
    include: {
      customer: { include: { retailer: { select: { code: true, name: true, ownerName: true, mobile: true, city: true, state: true } } } },
      // Newest payment, used when the file never carried a last-payment date.
      payments: { orderBy: { paidOn: "desc" }, take: 1, select: { paidOn: true } },
    },
  });

  const loans: OverdueLoan[] = rows.map((l) => ({
    agreementNo: l.agreementNo,
    applicationNo: l.applicationNo,
    agreementDate: l.agreementDate,
    disbursedOn: l.disbursedOn,
    status: l.status,
    brand: l.brand,
    productName: l.productName,
    lockStatus: l.lockStatus,
    lockStatusAt: l.lockStatusAt,
    schemeName: l.schemeName,
    loanAmount: num(l.loanAmount),
    totalRepaymentAmount: num(l.totalRepaymentAmount),
    emiAmount: num(l.emiAmount),
    tenureMonths: l.tenureMonths,
    roi: num(l.roi),
    oldestOverdueEmiNo: l.oldestOverdueEmiNo,
    oldestOverdueOn: l.oldestOverdueOn,
    dpd: l.dpd,
    pendingEmis: l.pendingEmis,
    overdueAmount: num(l.overdueAmount),
    penaltyCharges: num(l.penaltyCharges),
    otherDueCharges: num(l.otherDueCharges),
    totalOutstanding: num(l.totalOutstanding),
    totalPaid: num(l.totalPaid),
    lastPaymentOn: l.lastPaymentOn ?? l.payments[0]?.paidOn ?? null,
    branch: l.branch,
    customer: l.customer,
  }));

  const now = new Date();
  const unmask = user.role === "ADMIN";
  const file = await buildLoanOverdueXlsx(loans, now, unmask);
  await logAudit(user.id, "report.export", "report", "loan-overdue", { rows: loans.length, unmasked: unmask, company: q.company ?? null, branch: q.branch ?? null, agencyId: q.agencyId ?? null, agentId: q.agentId ?? null, bucket: q.bucket ?? null });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${loanOverdueFileName(now)}"`,
      "cache-control": "private, no-store",
    },
  });
};
