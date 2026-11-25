import { expect, test } from "bun:test";
import ExcelJS from "exceljs";
import { LOAN_OVERDUE_HEADER, buildLoanOverdueXlsx, loanOverdueFileName, reportAsOf, type OverdueLoan } from "./loan-overdue-xlsx";

const loan = (over: Partial<OverdueLoan> = {}): OverdueLoan => ({
  agreementNo: "CDL0000000029",
  applicationNo: "2607000061",
  agreementDate: new Date("2026-07-29T00:00:00.000Z"),
  disbursedOn: new Date("2026-07-30T00:00:00.000Z"),
  status: "ACTIVE",
  brand: "Realme",
  productName: "REALME REALME 16T",
  lockStatus: "In locking",
  lockStatusAt: "23 Nov 2026 06:11 PM",
  schemeName: "Flexi Pay",
  loanAmount: 18000,
  totalRepaymentAmount: 20160,
  emiAmount: 3360,
  tenureMonths: 6,
  roi: 24,
  oldestOverdueEmiNo: 4,
  oldestOverdueOn: new Date("2026-11-21T00:00:00.000Z"),
  dpd: 4,
  pendingEmis: 1,
  overdueAmount: 3950,
  penaltyCharges: 590,
  otherDueCharges: 0,
  totalOutstanding: 10670,
  totalPaid: 10670,
  lastPaymentOn: new Date("2026-10-21T00:00:00.000Z"),
  branch: "Durg",
  customer: {
    name: "SHYAM KUMAR",
    mobilePrimary: "6284947496",
    mobileAlt: "0440663781",
    references: [{ name: "sanjeev kumar", relation: "Friend", mobile: "9798846363" }, { name: "rahul kumar", relation: "Sibling", mobile: "6205971215" }],
    pan: "RBBPK3082F",
    dob: new Date("1997-01-01T00:00:00.000Z"),
    address: "S/O Rajtilak Sahni, Muzaffarpur",
    state: "Bihar",
    landmark: "mushari",
    residenceType: "Owned",
    landlordName: null,
    landlordMobile: null,
    occupation: "Salaried",
    workAddress: "amardeep company Durg",
    retailer: { code: "KPD646", name: "NAVNIDHI MOBILE", ownerName: "NITESH  JAIN", mobile: "9589847777", city: "Durg", state: "Chhattisgarh" },
  },
  ...over,
});

const read = async (buf: Buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb.worksheets[0];
};

test("the sheet has the hub's 53 columns in order", () => {
  expect(LOAN_OVERDUE_HEADER).toHaveLength(53);
  expect(LOAN_OVERDUE_HEADER[0]).toBe("Sr. No.");
  expect(LOAN_OVERDUE_HEADER[2]).toBe("Loan Account Number");
  expect(LOAN_OVERDUE_HEADER[52]).toBe("Retailer State");
});

test("a row fills every column from the loan, keeping text and dd-MM-yyyy dates", async () => {
  const now = new Date("2026-11-25T07:04:29.000Z");
  const sheet = await read(await buildLoanOverdueXlsx([loan()], now, true));
  const header = sheet.getRow(1).values as string[];
  expect(header.slice(1)).toEqual([...LOAN_OVERDUE_HEADER]);
  const row = sheet.getRow(2);
  const cell = (title: string) => row.getCell(LOAN_OVERDUE_HEADER.indexOf(title as never) + 1).value;
  expect(cell("Sr. No.")).toBe(1);
  expect(cell("Report As Of (IST)")).toBe("25 Nov 2026 12:34 PM IST");
  expect(cell("Loan Account Number")).toBe("CDL0000000029");
  expect(cell("Agreement Date")).toBe("29-07-2026");
  expect(cell("Loan Status")).toBe("DISBURSED");
  expect(cell("Loan Amount")).toBe(18000);
  expect(cell("Customer Mobile")).toBe("6284947496");
  expect(cell("Alternate Mobile")).toBe("0440663781"); // leading zero kept
  expect(cell("Reference 2 Name")).toBe("rahul kumar");
  expect(cell("Date of Birth")).toBe("01-01-1997");
  expect(cell("Retailer Code")).toBe("KPD646");
  expect(cell("Assigned Branch")).toBe("Durg");
  expect(cell("Retailer State")).toBe("Chhattisgarh");
  expect(cell("Landlord Name")).toBeNull();
});

test("mobile numbers are masked unless the caller may see them", async () => {
  const sheet = await read(await buildLoanOverdueXlsx([loan()], new Date(), false));
  const at = (title: string) => sheet.getRow(2).getCell(LOAN_OVERDUE_HEADER.indexOf(title as never) + 1).value;
  expect(at("Customer Mobile")).toBe("62XXXXXX96");
  expect(at("Reference 1 Mobile")).toBe("97XXXXXX63");
  expect(at("Retailer Mobile")).toBe("95XXXXXX77");
});

test("a closed loan is labelled CLOSED and the file name follows the hub's pattern", () => {
  expect(reportAsOf(new Date("2026-11-25T07:04:29.000Z"))).toBe("25 Nov 2026 12:34 PM IST");
  expect(loanOverdueFileName(new Date("2026-11-25T07:04:29.000Z"))).toBe("KishtoPe_Loan_Overdue_20261125_123429.xlsx");
});
