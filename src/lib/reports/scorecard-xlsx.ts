import ExcelJS from "exceljs";
import { formatDuration } from "@/lib/format";
import { SCORECARD_ALERT_LABELS, type ScorecardRow } from "@/lib/scorecard";

// The monthly caller scorecard as an Excel file: one row per caller in rank order, with target vs achievement and alerts.
export const buildScorecardXlsx = async (month: string, rows: ScorecardRow[]) => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(`Performance ${month}`);
  sheet.columns = [
    { header: "Rank", key: "rank", width: 7 },
    { header: "Caller", key: "name", width: 26 },
    { header: "Cases allocated", key: "allocated", width: 16 },
    { header: "Due (₹)", key: "due", width: 14 },
    { header: "Collected (₹)", key: "collected", width: 15 },
    { header: "Recovery %", key: "recoveryPct", width: 12 },
    { header: "Target (₹)", key: "targetAmount", width: 14 },
    { header: "Target achieved %", key: "achievementPct", width: 18 },
    { header: "Cases resolved", key: "resolved", width: 15 },
    { header: "Resolve target", key: "targetResolved", width: 15 },
    { header: "Calls", key: "calls", width: 8 },
    { header: "Connected", key: "connected", width: 11 },
    { header: "Contact %", key: "contactPct", width: 11 },
    { header: "Avg talk time", key: "avgTalk", width: 14 },
    { header: "PTP taken", key: "ptpTaken", width: 11 },
    { header: "PTP kept %", key: "ptpKeptPct", width: 12 },
    { header: "Alerts", key: "alerts", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) {
    sheet.addRow({
      ...r,
      avgTalk: formatDuration(r.avgTalkSec),
      alerts: r.alerts.map((a) => SCORECARD_ALERT_LABELS[a]).join(", "),
    });
  }
  return Buffer.from(await book.xlsx.writeBuffer());
};
