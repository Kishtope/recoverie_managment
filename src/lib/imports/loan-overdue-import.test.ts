import { expect, test } from "bun:test";
import { loanRowSchema } from "@/features/imports/schemas";
import { mapColumns } from "./columns";

// The hub's Loan Overdue header and its first data row (trimmed of the ="..." text wrapper, which the file parser strips).
const HEADERS = ["Sr. No.", "Loan Account Number", "Application Number", "Agreement Date", "Disbursed Date", "Loan Status", "Brand", "Product Name", "Lock Status", "Lock Status Date Time", "Scheme Name", "Loan Amount", "Total Repayment Amount", "EMI Amount", "Tenure (Months)", "ROI (%)", "Oldest Overdue EMI Number", "Oldest Overdue Date", "DPD", "Overdue EMI Count", "Overdue Amount", "Penalty Charges", "Other Due Charges", "Total Outstanding", "Total Paid", "Last Payment Date", "Customer Name", "Customer Mobile", "Alternate Mobile", "Reference 1 Name", "Reference 1 Relation", "Reference 1 Mobile", "PAN Number", "Date of Birth", "Customer Address", "Customer State", "Landmark", "Residence Type", "Occupation", "Work Address", "Retailer Code", "Assigned Branch"];
const CELLS = ["1", "CDL0000000029", "2607000061", "29-07-2026", "30-07-2026", "DISBURSED", "Realme", "REALME REALME 16T", "In locking", "23 Nov 2026 06:11 PM", "Flexi Pay", "18000.00", "20160.00", "3360.00", "6", "24.00", "4", "21-11-2026", "4", "1", "3950.00", "590.00", "0.00", "10670.00", "10670.00", "21-10-2026", "SHYAM KUMAR", "6284947496", "7440663781", "sanjeev kumar", "Friend", "9798846363", "RBBPK3082F", "01-01-1997", "S/O Rajtilak Sahni, Muzaffarpur", "Bihar", "mushari", "Owned", "Salaried", "amardeep company Durg", "KPD646", "Raipur"];

test("the hub's Loan Overdue headers map onto the loan fields", () => {
  const { rows } = mapColumns("LOANS", HEADERS, [{ row: 2, cells: CELLS }]);
  const v = rows[0].values;
  expect(v.agreementNo).toBe("CDL0000000029");
  expect(v.applicationNo).toBe("2607000061");
  expect(v.disbursedOn).toBe("30-07-2026");
  expect(v.pendingEmis).toBe("1");
  expect(v.mobilePrimary).toBe("6284947496");
  expect(v.branch).toBe("Raipur");
  expect(v.oldestOverdueEmiNo).toBe("4");
  expect(v.pan).toBe("RBBPK3082F");
  expect(v.customerState).toBe("Bihar");
  expect(v.ref1Name).toBe("sanjeev kumar");
});

test("a Loan Overdue row validates, with DISBURSED read as an active loan", () => {
  const { rows } = mapColumns("LOANS", HEADERS, [{ row: 2, cells: CELLS }]);
  // The file has no Company / Assignment Type columns (and its branches are not all in BRANCHES), so add them and use a known branch here.
  const out = loanRowSchema.parse({ ...rows[0].values, company: "AF", assignmentType: "Retailer" });
  expect(out.status).toBe("ACTIVE");
  expect(out.loanAmount).toBe(18000);
  expect(out.roi).toBe(24);
  expect(out.tenureMonths).toBe(6);
  expect(out.agreementDate?.toISOString().slice(0, 10)).toBe("2026-07-29");
  expect(out.dob?.toISOString().slice(0, 10)).toBe("1997-01-01");
  expect(out.lockStatusAt).toBe("23 Nov 2026 06:11 PM");
});

test("a file without Company and Assignment Type columns is no longer missing required columns", () => {
  const { missing } = mapColumns("LOANS", HEADERS, [{ row: 2, cells: CELLS }]);
  expect(missing).toEqual([]);
});

test("the retailer columns map onto the retailer detail fields", () => {
  const headers = ["Loan Account Number", "Customer Name", "Assigned Branch", "Retailer Code", "Shop Name", "Retailer Name", "Retailer Mobile", "Retailer District", "Retailer State"];
  const cells = ["CDL1", "A B", "Jabalpur", "KPD531", "SHRI KRISHNA AGENCY", "PRADEEP SEN", "9584582876", "Jabalpur", "Madhya Pradesh"];
  const v = mapColumns("LOANS", headers, [{ row: 2, cells }]).rows[0].values;
  expect(v).toMatchObject({ retailerCode: "KPD531", shopName: "SHRI KRISHNA AGENCY", retailerName: "PRADEEP SEN", retailerMobile: "9584582876", retailerDistrict: "Jabalpur", retailerState: "Madhya Pradesh" });
  const out = loanRowSchema.parse({ ...v, company: "AF", assignmentType: "Retailer" });
  expect(out.branch).toBe("Jabalpur");
});

test("a blank branch is rejected", () => {
  const out = loanRowSchema.safeParse({ agreementNo: "CDL1", customerName: "A", company: "AF", branch: "", assignmentType: "Retailer" });
  expect(out.success).toBe(false);
});
