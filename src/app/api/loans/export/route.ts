import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { OUTCOME_LABELS } from "@/lib/constants";
import { fromDbDate } from "@/lib/dates";
import { buildLoanListWhere } from "@/lib/loans-list-where";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import { buildCasesXlsx } from "@/lib/reports/cases-xlsx";

// Most rows one export may hold, so a huge portfolio cannot exhaust memory.
const MAX_ROWS = 20000;

// Excel file of every case matching the Cases page filters (not just the visible page), in the same order as the table. Mobile numbers stay
// masked, like on screen. Admin, Manager and Agency owner only; every export is written to the audit log.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const isAdmin = auth.user.role === "ADMIN";
  const where = buildLoanListWhere(auth.user, sp);

  const total = await prisma.loan.count({ where });
  // Nothing matches: say so instead of handing over a header-only workbook that looks like a broken export.
  if (total === 0) return NextResponse.json({ error: "No cases match the current filters, so there is nothing to export." }, { status: 404 });
  if (total > MAX_ROWS) {
    return NextResponse.json({ error: `Too many cases to export (${total.toLocaleString("en-IN")}). Narrow the filters to ${MAX_ROWS.toLocaleString("en-IN")} or fewer.` }, { status: 400 });
  }

  const loans = await prisma.loan.findMany({
    where,
    select: {
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
      customer: { select: { name: true, mobilePrimary: true, area: true, retailer: { select: { name: true } } } },
      allocations: { where: { active: true }, take: 1, select: { assignedOn: true, agent: { select: { name: true } } } },
      dispositions: { orderBy: { createdAt: "desc" }, take: 1, select: { ptpAmount: true } },
    },
    orderBy: [{ nextFollowUpOn: { sort: "asc", nulls: "last" } }, { dpd: "desc" }, { overdueAmount: "desc" }, { id: "asc" }],
  });

  const rows = loans.map((l) => {
    const row: (string | number)[] = [
      l.customer.name,
      maskMobile(l.customer.mobilePrimary) ?? "-",
      l.customer.area ?? "-",
      l.agreementNo,
      l.company,
      l.branch,
      l.dpd ?? "-",
      l.pendingEmis ?? "-",
      l.overdueAmount?.toNumber() ?? "-",
      l.status === "CLOSED" ? "Closed" : "Active",
      l.lastOutcome ? OUTCOME_LABELS[l.lastOutcome] : "No outcome",
      l.lastOutcome === "PTP" ? (l.dispositions[0]?.ptpAmount?.toNumber() ?? "-") : "-",
      l.lastContactedAt ? l.lastContactedAt.toISOString().slice(0, 10) : "-",
      fromDbDate(l.nextFollowUpOn) ?? "-",
      l.fieldVisitFlag ? "Yes" : "No",
      l.escalatedAt ? "Yes" : "No",
      l.allocations[0]?.agent?.name ?? "Unassigned",
      l.allocations[0]?.assignedOn.toISOString().slice(0, 10) ?? "-",
    ];
    if (isAdmin) row.push(l.customer.retailer?.name ?? "No retailer");
    return row;
  });

  const file = await buildCasesXlsx(rows, isAdmin);
  await logAudit(auth.user.id, "report.export", "report", "cases", { rows: rows.length, filters: Object.fromEntries(sp) });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="cases-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
};
