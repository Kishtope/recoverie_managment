import ExcelJS from "exceljs";
import { maskMobile } from "@/lib/mask";

// One overdue loan as the sheet needs it: plain strings / numbers / dates (the route turns Prisma Decimals into numbers).
export type OverdueLoan = {
  agreementNo: string;
  applicationNo: string | null;
  agreementDate: Date | null;
  disbursedOn: Date | null;
  status: "ACTIVE" | "CLOSED";
  brand: string | null;
  productName: string | null;
  lockStatus: string | null;
  lockStatusAt: string | null;
  schemeName: string | null;
  loanAmount: number | null;
  totalRepaymentAmount: number | null;
  emiAmount: number | null;
  tenureMonths: number | null;
  roi: number | null;
  oldestOverdueEmiNo: number | null;
  oldestOverdueOn: Date | null;
  dpd: number | null;
  pendingEmis: number | null;
  overdueAmount: number | null;
  penaltyCharges: number | null;
  otherDueCharges: number | null;
  totalOutstanding: number | null;
  totalPaid: number | null;
  lastPaymentOn: Date | null;
  branch: string;
  customer: {
    name: string;
    mobilePrimary: string | null;
    mobileAlt: string | null;
    references: unknown;
    pan: string | null;
    dob: Date | null;
    address: string | null;
    state: string | null;
    landmark: string | null;
    residenceType: string | null;
    landlordName: string | null;
    landlordMobile: string | null;
    occupation: string | null;
    workAddress: string | null;
    retailer: { code: string; name: string; ownerName: string; mobile: string; city: string | null; state: string | null } | null;
  };
};

// The 53 column titles of the hub's "Loan Overdue" sheet, in its exact order.
export const LOAN_OVERDUE_HEADER = [
  "Sr. No.", "Report As Of (IST)", "Loan Account Number", "Application Number", "Agreement Date", "Disbursed Date", "Loan Status", "Brand", "Product Name",
  "Lock Status", "Lock Status Date Time", "Scheme Name", "Loan Amount", "Total Repayment Amount", "EMI Amount", "Tenure (Months)", "ROI (%)",
  "Oldest Overdue EMI Number", "Oldest Overdue Date", "DPD", "Overdue EMI Count", "Overdue Amount", "Penalty Charges", "Other Due Charges", "Total Outstanding",
  "Total Paid", "Last Payment Date", "Customer Name", "Customer Mobile", "Alternate Mobile", "Reference 1 Name", "Reference 1 Relation", "Reference 1 Mobile",
  "Reference 2 Name", "Reference 2 Relation", "Reference 2 Mobile", "PAN Number", "Date of Birth", "Customer Address", "Customer State", "Landmark",
  "Residence Type", "Landlord Name", "Landlord Mobile", "Occupation", "Work Address", "Retailer Code", "Shop Name", "Retailer Name", "Retailer Mobile",
  "Assigned Branch", "Retailer District", "Retailer State",
] as const;

// Columns the hub writes as text so ids and numbers like 0098... keep their digits: loan no., application no., every mobile and the PAN.
const TEXT_COLUMNS: readonly string[] = ["Loan Account Number", "Application Number", "Customer Mobile", "Alternate Mobile", "Reference 1 Mobile", "Reference 2 Mobile", "PAN Number", "Landlord Mobile", "Retailer Mobile"];
// Columns shown with two decimals (money and ROI), like the hub's file.
const MONEY_COLUMNS: readonly string[] = ["Loan Amount", "Total Repayment Amount", "EMI Amount", "ROI (%)", "Overdue Amount", "Penalty Charges", "Other Due Charges", "Total Outstanding", "Total Paid"];

// "dd-MM-yyyy" from a stored date-only value (those are kept at UTC midnight), or null.
const day = (d: Date | null) => {
  if (!d) return null;
  const [y, m, dd] = d.toISOString().slice(0, 10).split("-");
  return `${dd}-${m}-${y}`;
};

// IST wall-clock pieces of an instant, for the "Report As Of" cell and the file name.
const istParts = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: get("day"), month: get("month"), year: get("year"), hour: get("hour"), minute: get("minute"), second: get("second"), period: get("dayPeriod").toUpperCase() };
};

// "25 Nov 2026 12:34 PM IST", the same value on every row.
export const reportAsOf = (now: Date) => {
  const p = istParts(now);
  return `${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute} ${p.period} IST`;
};

// "KishtoPe_Loan_Overdue_20261125_123429.xlsx" from the export time (IST, 24-hour).
export const loanOverdueFileName = (now: Date) => {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => f.find((p) => p.type === type)?.value ?? "";
  return `KishtoPe_Loan_Overdue_${get("year")}${get("month")}${get("day")}_${get("hour")}${get("minute")}${get("second")}.xlsx`;
};

// The first two reference contacts stored on the customer (JSON of { name, relation, mobile }).
const referencesOf = (value: unknown) => (Array.isArray(value) ? (value as { name?: string; relation?: string; mobile?: string }[]) : []);

// One loan as a row of cell values in header order. `unmask` shows full mobile numbers (Admin); otherwise they are masked like on screen.
export const toOverdueRow = (l: OverdueLoan, index: number, asOf: string, unmask: boolean): (string | number | null)[] => {
  const c = l.customer;
  const phone = (m: string | null | undefined) => (unmask ? (m ?? null) : maskMobile(m));
  const [r1, r2] = referencesOf(c.references);
  const rt = c.retailer;
  return [
    index + 1, asOf, l.agreementNo, l.applicationNo, day(l.agreementDate), day(l.disbursedOn), l.status === "CLOSED" ? "CLOSED" : "DISBURSED", l.brand, l.productName,
    l.lockStatus, l.lockStatusAt, l.schemeName, l.loanAmount, l.totalRepaymentAmount, l.emiAmount, l.tenureMonths, l.roi,
    l.oldestOverdueEmiNo, day(l.oldestOverdueOn), l.dpd, l.pendingEmis, l.overdueAmount, l.penaltyCharges, l.otherDueCharges, l.totalOutstanding,
    l.totalPaid, day(l.lastPaymentOn), c.name, phone(c.mobilePrimary), phone(c.mobileAlt), r1?.name ?? null, r1?.relation ?? null, phone(r1?.mobile),
    r2?.name ?? null, r2?.relation ?? null, phone(r2?.mobile), c.pan, day(c.dob), c.address, c.state, c.landmark,
    c.residenceType, c.landlordName, phone(c.landlordMobile), c.occupation, c.workAddress, rt?.code ?? null, rt?.name ?? null, rt?.ownerName ?? null, phone(rt?.mobile),
    l.branch, rt?.city ?? null, rt?.state ?? null,
  ];
};

// Builds the Loan Overdue workbook: the hub's 53 columns in order, text columns kept as text, money with two decimals, header frozen and filterable.
export const buildLoanOverdueXlsx = async (loans: OverdueLoan[], now: Date, unmask: boolean): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.created = now;
  const sheet = wb.addWorksheet("Loan Overdue");
  sheet.addRow([...LOAN_OVERDUE_HEADER]).font = { bold: true };
  const asOf = reportAsOf(now);
  loans.forEach((l, i) => sheet.addRow(toOverdueRow(l, i, asOf, unmask)));

  LOAN_OVERDUE_HEADER.forEach((title, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.min(40, Math.max(12, title.length + 2));
    if (TEXT_COLUMNS.includes(title)) col.numFmt = "@";
    if (MONEY_COLUMNS.includes(title)) col.numFmt = "0.00";
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: LOAN_OVERDUE_HEADER.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
};
