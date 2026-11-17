import { expect, test } from "bun:test";
import ExcelJS from "exceljs";
import { summarizeLoans, type PeriodLoanRow } from "@/lib/metrics/loans";
import { buildDailyMis, summaryRows } from "./daily-mis";

const rows: PeriodLoanRow[] = [
  { loanId: "1", agentId: "a1", overdue: 1000, dpd: 10, outcomes: ["PAID"], ptp: null, collected: 1000 },
  { loanId: "2", agentId: "a1", overdue: 2000, dpd: 70, outcomes: [], ptp: null, collected: 0 },
  { loanId: "3", agentId: "a2", overdue: 3000, dpd: 120, outcomes: ["PTP"], ptp: "broken", collected: 500 },
];
const names = new Map([["a1", "Asha"], ["a2", "Arun"]]);

test("the Summary sheet carries exactly the numbers the dashboard cards show", async () => {
  const buffer = await buildDailyMis({ title: "FY 2026-2027", from: "2026-04-01", to: "2027-03-31", collectedSource: "payments", rows, names, performance: [] });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "User-wise", "Outcomes", "DPD buckets", "Team performance"]);

  const s = summarizeLoans(rows);
  const sheet = wb.getWorksheet("Summary")!;
  const value = (label: string) => {
    let found: unknown;
    sheet.eachRow((r) => void (r.getCell(1).value === label && (found = r.getCell(2).value)));
    return found;
  };
  expect(value("Total cases")).toBe(s.cases);
  expect(value("Due amount (₹)")).toBe(s.dueAmount);
  expect(value("Collected (₹)")).toBe(s.collected);
  expect(value("Paid")).toBe(s.paid);
  expect(value("  PTP broken")).toBe(s.ptp.broken);
  expect(value("Collection %")).toBe(s.collectionPct as number);
  expect(summaryRows(s, "agent").find((r) => r[0] === "Collected from")?.[1]).toBe("Agent-reported outcomes");
});

test("the User-wise sheet has one row per agent with their names", async () => {
  const buffer = await buildDailyMis({ title: "t", from: "2026-04-01", to: "2027-03-31", collectedSource: "payments", rows, names, performance: [] });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const found: unknown[] = [];
  wb.getWorksheet("User-wise")!.eachRow((r, i) => i > 1 && found.push(r.getCell(1).value));
  expect(found.sort()).toEqual(["Arun", "Asha"]);
});
