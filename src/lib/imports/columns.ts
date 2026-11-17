import type { ImportType } from "@/generated/prisma/client";

// Hub export headers per app field. Matching ignores case, spaces and punctuation, so "Agreement No." == "agreementno".
// When the hub team sends the real export format, this file is the only thing that changes.
const LOAN_COLUMNS = {
  agreementNo: ["agreementno", "agreementnumber", "agreement", "loanno", "loanaccountno"],
  hubCustomerId: ["hubcustomerid", "customerid", "custid"],
  customerName: ["customername", "customer", "name", "borrower", "borrowername"],
  mobilePrimary: ["mobile", "mobileno", "mobilenumber", "phone", "primarymobile", "mobileprimary"],
  mobileAlt: ["altmobile", "alternatemobile", "mobilealt", "mobile2", "secondarymobile"],
  address: ["address", "customeraddress"],
  pin: ["pin", "pincode", "zip", "postalcode"],
  area: ["area", "locality", "village"],
  company: ["company", "companycode"],
  branch: ["branch", "branchname"],
  disbursedOn: ["disbursedon", "disbursaldate", "disbursementdate", "disbursedate"],
  emiAmount: ["emiamount", "emi"],
  pendingEmis: ["pendingemis", "pendingemi", "emispending"],
  dpd: ["dpd", "dayspastdue"],
  overdueAmount: ["overdueamount", "overdue", "overduerupees", "totaloverdue"],
  status: ["status", "loanstatus"],
} as const;

const ALLOCATION_COLUMNS = {
  agreementNo: LOAN_COLUMNS.agreementNo,
  hubUserId: ["hubuserid", "userid", "agentid", "hubagentid", "assignedtoid"],
  agency: ["agency", "agencyname"],
  assignedOn: ["assignedon", "allocatedon", "allocationdate", "assigneddate"],
  validTill: ["validtill", "validuntil", "expireson"],
} as const;

// Fields a file must have a column for; the rest are optional and a blank cell leaves the stored value untouched.
const REQUIRED: Record<ImportType, string[]> = {
  LOANS: ["agreementNo", "customerName", "company", "branch"],
  ALLOCATIONS: ["agreementNo", "hubUserId"],
};

const COLUMNS: Record<ImportType, Record<string, readonly string[]>> = { LOANS: LOAN_COLUMNS, ALLOCATIONS: ALLOCATION_COLUMNS };

// Lowercases a header and strips everything but letters and digits for alias matching.
const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

// Raw cells keyed by app field (not yet validated); `row` is the spreadsheet row number for error messages.
export type RawRow = { row: number; values: Record<string, string> };

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
  const mapped = rows.map(({ row, cells }) => ({
    row,
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
  hubUserId: "Hub User ID",
};
export const columnLabel = (field: string) => REQUIRED_LABELS[field] ?? field;
