import ExcelJS from "exceljs";
import { addSheet } from "@/lib/reports/daily-mis";

// One exported case; mirrors the Cases table columns (mobile numbers are already masked).
export type CaseExportRow = (string | number)[];

const HEADER = ["Customer", "Mobile", "Area", "Agreement no.", "Company", "Branch", "DPD", "Pending EMIs", "Overdue (₹)", "Status", "Last outcome", "PTP amount (₹)", "Last contacted", "Next follow-up", "Field visit", "Escalated", "Agent", "Assigned on"];
const RETAILER_HEADER = "Retailer";

// Builds the Cases workbook (one sheet). The retailer column is only added for Admins, like the table.
export const buildCasesXlsx = async (rows: CaseExportRow[], withRetailer: boolean): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const sheet = addSheet(wb, "Cases", withRetailer ? [...HEADER, RETAILER_HEADER] : HEADER, rows);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: withRetailer ? HEADER.length + 1 : HEADER.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
};
