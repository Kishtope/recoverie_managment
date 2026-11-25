import type { ImportType } from "@/generated/prisma/client";

// Hub export headers per app field. Matching ignores case, spaces and punctuation, so "Agreement No." == "agreementno".
// When the hub team sends the real export format, this file is the only thing that changes.
const LOAN_COLUMNS = {
  agreementNo: ["agreementno", "agreementnumber", "agreement", "loanno", "loanaccountno", "loanaccountnumber"],
  hubCustomerId: ["hubcustomerid", "customerid", "custid"],
  customerName: ["customername", "customer", "name", "borrower", "borrowername"],
  mobilePrimary: ["mobile", "mobileno", "mobilenumber", "phone", "primarymobile", "mobileprimary", "customermobile"],
  mobileAlt: ["altmobile", "alternatemobile", "mobilealt", "mobile2", "secondarymobile"],
  address: ["address", "customeraddress"],
  pin: ["pin", "pincode", "zip", "postalcode"],
  area: ["area", "locality", "village"],
  company: ["company", "companycode"],
  branch: ["branch", "branchname", "assignedbranch"],
  disbursedOn: ["disbursedon", "disbursaldate", "disbursementdate", "disbursedate", "disburseddate"],
  emiAmount: ["emiamount", "emi"],
  pendingEmis: ["pendingemis", "pendingemi", "emispending", "overdueemicount"],
  dpd: ["dpd", "dayspastdue"],
  overdueAmount: ["overdueamount", "overdue", "overduerupees", "totaloverdue"],
  status: ["status", "loanstatus"],
  assignmentType: ["assignmenttype", "assigntype", "assignedtype", "customertype"],
  retailerCode: ["retailercode", "retailerid", "retailer"],
  // Retailer details from the same file; used to create a retailer whose code is not known yet.
  shopName: ["shopname"],
  retailerName: ["retailername"],
  retailerMobile: ["retailermobile"],
  retailerDistrict: ["retailerdistrict"],
  retailerState: ["retailerstate"],
  // Loan terms and dues from the hub's Loan Overdue file (kept for the Loan Overdue Excel download).
  applicationNo: ["applicationnumber", "applicationno"],
  agreementDate: ["agreementdate"],
  brand: ["brand"],
  productName: ["productname"],
  lockStatus: ["lockstatus"],
  lockStatusAt: ["lockstatusdatetime"],
  schemeName: ["schemename"],
  loanAmount: ["loanamount"],
  totalRepaymentAmount: ["totalrepaymentamount"],
  tenureMonths: ["tenuremonths", "tenure"],
  roi: ["roi"],
  oldestOverdueEmiNo: ["oldestoverdueeminumber"],
  oldestOverdueOn: ["oldestoverduedate"],
  penaltyCharges: ["penaltycharges"],
  otherDueCharges: ["otherduecharges"],
  totalOutstanding: ["totaloutstanding"],
  totalPaid: ["totalpaid"],
  lastPaymentOn: ["lastpaymentdate"],
  // Customer details from the same file.
  pan: ["pannumber", "pan"],
  dob: ["dateofbirth", "dob"],
  customerState: ["customerstate"],
  landmark: ["landmark"],
  residenceType: ["residencetype"],
  landlordName: ["landlordname"],
  landlordMobile: ["landlordmobile"],
  occupation: ["occupation"],
  workAddress: ["workaddress"],
  ref1Name: ["reference1name"],
  ref1Relation: ["reference1relation"],
  ref1Mobile: ["reference1mobile"],
  ref2Name: ["reference2name"],
  ref2Relation: ["reference2relation"],
  ref2Mobile: ["reference2mobile"],
} as const;

const ALLOCATION_COLUMNS = {
  agreementNo: LOAN_COLUMNS.agreementNo,
  agentEmail: ["agentemail", "email", "useremail", "emailid", "assignedto", "assignedtoemail", "agent"],
  agency: ["agency", "agencyname"],
  assignedOn: ["assignedon", "allocatedon", "allocationdate", "assigneddate"],
  validTill: ["validtill", "validuntil", "expireson"],
} as const;

const PAYMENT_COLUMNS = {
  agreementNo: LOAN_COLUMNS.agreementNo,
  amount: ["amount", "paidamount", "paymentamount", "collectedamount", "collection"],
  paidOn: ["paidon", "paymentdate", "paiddate", "receiptdate", "collectiondate", "date"],
  mode: ["mode", "paymentmode", "paymenttype"],
  receiptNo: ["receiptno", "receiptnumber", "receipt", "transactionid", "utr"],
} as const;

// Fields a file must have a column for; the rest are optional and a blank cell leaves the stored value untouched.
const REQUIRED: Record<ImportType, string[]> = {
  // Company and Assignment Type are optional columns: the upload form supplies the company and a file without Assignment Type is all Retailer.
  LOANS: ["agreementNo", "customerName", "branch"],
  ALLOCATIONS: ["agreementNo", "agentEmail"],
  PAYMENTS: ["agreementNo", "amount", "paidOn"],
};

const COLUMNS: Record<ImportType, Record<string, readonly string[]>> = { LOANS: LOAN_COLUMNS, ALLOCATIONS: ALLOCATION_COLUMNS, PAYMENTS: PAYMENT_COLUMNS };

// Lowercases a header and strips everything but letters and digits for alias matching.
const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

// Raw cells keyed by app field (not yet validated); `row` is the spreadsheet row number for error messages.
// `columns` names, per field, the file column it was read from (e.g. "Assigned Branch (column AX)"); one object shared by every row of the file.
export type RawRow = { row: number; values: Record<string, string>; columns?: Record<string, string> };

// Spreadsheet column letter of a 0-based column index (0 -> A, 26 -> AA).
const columnLetter = (index: number) => {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

// Maps a parsed sheet's columns onto app fields. Returns the rows, or `missing` (required fields with no matching column).
export const mapColumns = (
  type: ImportType,
  headers: string[],
  rows: { row: number; cells: string[] }[],
): { rows: RawRow[]; missing: string[] } => {
  const aliases = COLUMNS[type];
  const normalized = headers.map(normalizeHeader);
  // field -> column index of the first header matching one of its aliases
  const index: Record<string, number> = {};
  for (const [field, names] of Object.entries(aliases)) {
    const at = normalized.findIndex((h) => (names as readonly string[]).includes(h));
    if (at >= 0) index[field] = at;
  }
  const missing = REQUIRED[type].filter((f) => !(f in index));
  const columns = Object.fromEntries(Object.entries(index).map(([field, at]) => [field, `${headers[at]} (column ${columnLetter(at)})`]));
  const mapped = rows.map(({ row, cells }) => ({
    row,
    columns,
    values: Object.fromEntries(Object.entries(index).map(([field, at]) => [field, cells[at] ?? ""])),
  }));
  return { rows: mapped, missing };
};

// Header the Admin should add for a missing required field, as written in the templates.
const REQUIRED_LABELS: Record<string, string> = {
  agreementNo: "Agreement No",
  customerName: "Customer Name",
  company: "Company",
  branch: "Branch",
  assignmentType: "Assignment Type",
  agentEmail: "Agent Email",
  amount: "Amount",
  paidOn: "Paid On",
};
export const columnLabel = (field: string) => REQUIRED_LABELS[field] ?? field;
