import ExcelJS from "exceljs";
import { OUTCOME_LABELS, type OUTCOMES } from "@/lib/constants";
import { DPD_BUCKET_LABELS, type DpdBucket } from "@/lib/dpd-bucket";
import { dpdBreakdown, outcomeBreakdown, summarizeLoans, userWiseRows, type PeriodLoanRow, type Summary, type UserRow } from "@/lib/metrics/loans";
import type { CollectedSource } from "@/features/dashboard/types";
import type { PerformanceRow } from "@/features/performance/types";

export type MisInput = {
  title: string; // e.g. "FY 2026-2027, Nov 2026"
  from: string;
  to: string;
  collectedSource: CollectedSource;
  rows: PeriodLoanRow[];
  names: Map<string, string>; // agent id -> name
  performance: PerformanceRow[];
};

// The rows of the Summary sheet (label, value) from the same Summary the dashboard cards show.
export const summaryRows = (s: Summary, source: CollectedSource): [string, string | number][] => [
  ["Total cases", s.cases],
  ["Due amount (₹)", s.dueAmount],
  ["Paid", s.paid],
  ["Part paid", s.partPaid],
  ["Promise to pay", s.ptp.total],
  ["  PTP upcoming", s.ptp.upcoming],
  ["  PTP kept", s.ptp.kept],
  ["  PTP broken", s.ptp.broken],
  ["Callback", s.callback],
  ["Not reachable / refused", s.notReachableOrRefused],
  ["Pending (no outcome)", s.pending],
  ["Spoke to", s.spoke],
  ["Not spoken to", s.notSpoke],
  ["Collected (₹)", s.collected],
  ["Collected from", source === "payments" ? "Imported payments" : "Agent-reported outcomes"],
  ["Collection %", s.collectionPct === null ? "-" : s.collectionPct],
];

// The rows of the User-wise sheet, in the dashboard table's column order.
export const userSheetRows = (users: UserRow[], names: Map<string, string>) =>
  users.map((u) => [
    u.agentId ? (names.get(u.agentId) ?? "Unknown") : "Unassigned",
    u.allocated, u.spoke, u.notSpoke, u.paid, u.partPaid, u.ptp, u.pending, u.collected, u.pendingAmount, u.collectionPct ?? "-",
  ]);

// Adds a sheet with a bold header row and sensible column widths.
const addSheet = (wb: ExcelJS.Workbook, name: string, header: string[], rows: (string | number)[][]) => {
  const sheet = wb.addWorksheet(name);
  sheet.addRow(header).font = { bold: true };
  sheet.addRows(rows);
  sheet.columns.forEach((col) => (col.width = Math.max(14, ...(col.values ?? []).map((v) => String(v ?? "").length + 2).slice(0, 50))));
  return sheet;
};

// Builds the Daily MIS workbook. Every number comes from the metric functions the dashboard uses (summarizeLoans, userWiseRows,
// outcomeBreakdown, dpdBreakdown, loadPerformance), so the Excel file and the screen cannot disagree.
export const buildDailyMis = async (input: MisInput): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const summary = summarizeLoans(input.rows);

  const first = addSheet(wb, "Summary", ["Measure", "Value"], summaryRows(summary, input.collectedSource));
  first.insertRow(1, [`Daily MIS: ${input.title} (${input.from} to ${input.to})`]).font = { bold: true };

  addSheet(
    wb,
    "User-wise",
    ["Agent", "Allocated", "Spoke to", "Not spoken", "Paid", "Part paid", "PTP", "Pending", "Collected (₹)", "Pending (₹)", "Collection %"],
    userSheetRows(userWiseRows(input.rows), input.names),
  );
  addSheet(wb, "Outcomes", ["Latest outcome", "Cases"], outcomeBreakdown(input.rows).map((o) => [o.outcome === "PENDING" ? "No outcome" : OUTCOME_LABELS[o.outcome as (typeof OUTCOMES)[number]], o.count]));
  addSheet(wb, "DPD buckets", ["DPD", "Cases", "Due (₹)"], dpdBreakdown(input.rows).map((b) => [DPD_BUCKET_LABELS[b.bucket as DpdBucket], b.cases, b.dueAmount]));
  addSheet(
    wb,
    "Team performance",
    ["Agent", "Calls", "Connected", "Missed", "Failed", "Avg talk (s)", "PTP taken", "PTP kept", "Customer missed calls", "Called back", "Callback %"],
    input.performance.map((p) => [p.name, p.calls, p.connected, p.missed, p.failed, p.avgTalkSec ?? "-", p.ptpTaken, p.ptpKept, p.inboundMissed, p.calledBack, p.callbackPct ?? "-"]),
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
};
