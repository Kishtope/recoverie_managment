import { z } from "zod";
import { autoAllocateSchema } from "@/features/cases/schemas";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { parseAmount, parseHubDate, parseMobile } from "@/lib/imports/values";

// Optional text cell: a blank cell becomes undefined, which means "leave the stored value as it is".
const text = z
  .string()
  .trim()
  .transform((v) => v || undefined)
  .optional();

// Optional typed cell: blank -> undefined; otherwise `parse` must return a value (null = invalid, reported as `message`).
const parsed = <T>(parse: (v: string) => T | null, message: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return undefined;
      const out = parse(v);
      if (out === null) {
        ctx.issues.push({ code: "custom", message, input: v });
        return z.NEVER;
      }
      return out;
    })
    .optional();

// A whole number >= 0 (pending EMIs, DPD).
const parseCount = (v: string) => {
  const n = Number(v.replace(/,/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : null;
};

// Matches a value against a fixed list ignoring case; returns the canonical spelling or null.
const matchList = (list: readonly string[]) => (v: string) => list.find((x) => x.toLowerCase() === v.toLowerCase()) ?? null;

// Optional "allocate the uploaded cases right away" choice sent with a Customers upload: the rule and the people to split them between.
export const importAutoAllocateSchema = autoAllocateSchema.omit({ dryRun: true });
export type ImportAutoAllocateInput = z.input<typeof importAutoAllocateSchema>;

// Company chosen in the upload form for a file that has no Company column.
export const importCompanySchema = z.enum(COMPANIES);

// One row of the Loans file (customer + loan). Branch/company must be known so access filters never break.
export const loanRowSchema = z.object({
  agreementNo: z.string().trim().min(1, "is blank (every row needs one)"),
  hubCustomerId: text,
  customerName: z.string().trim().min(1, "is blank (every row needs one)"),
  mobilePrimary: parsed(parseMobile, "must be a 10-digit number"),
  mobileAlt: parsed(parseMobile, "must be a 10-digit number"),
  address: text,
  pin: text,
  area: text,
  company: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const hit = matchList(COMPANIES)(v);
      if (!hit) ctx.issues.push({ code: "custom", message: `"${v}" is not recognised (use AF, BLD, MF or MMPL)`, input: v });
      return (hit ?? z.NEVER) as (typeof COMPANIES)[number];
    }),
  branch: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const hit = matchList(BRANCHES)(v);
      if (!hit) ctx.issues.push({ code: "custom", message: v ? `"${v}" is not set up in the app (ask an Admin to add it)` : "is blank (fill the Branch / Assigned Branch column)", input: v });
      return hit ?? z.NEVER;
    }),
  disbursedOn: parsed(parseHubDate, "is not a valid date (use dd-mm-yyyy)"),
  emiAmount: parsed(parseAmount, "must be a number"),
  pendingEmis: parsed(parseCount, "must be a whole number"),
  dpd: parsed(parseCount, "must be a whole number"),
  overdueAmount: parsed(parseAmount, "must be a number"),
  // The hub calls a running loan "DISBURSED"; that is an ACTIVE loan here.
  status: parsed((v) => (matchList(["ACTIVE", "CLOSED"])(v === v.toUpperCase() && v.toLowerCase() === "disbursed" ? "ACTIVE" : v) as "ACTIVE" | "CLOSED" | null), "must be Active or Closed"),
  applicationNo: text,
  agreementDate: parsed(parseHubDate, "is not a valid date (use dd-mm-yyyy)"),
  brand: text,
  productName: text,
  lockStatus: text,
  lockStatusAt: text,
  schemeName: text,
  loanAmount: parsed(parseAmount, "must be a number"),
  totalRepaymentAmount: parsed(parseAmount, "must be a number"),
  tenureMonths: parsed(parseCount, "must be a whole number"),
  roi: parsed(parseAmount, "must be a number"),
  oldestOverdueEmiNo: parsed(parseCount, "must be a whole number"),
  oldestOverdueOn: parsed(parseHubDate, "is not a valid date (use dd-mm-yyyy)"),
  penaltyCharges: parsed(parseAmount, "must be a number"),
  otherDueCharges: parsed(parseAmount, "must be a number"),
  totalOutstanding: parsed(parseAmount, "must be a number"),
  totalPaid: parsed(parseAmount, "must be a number"),
  lastPaymentOn: parsed(parseHubDate, "is not a valid date (use dd-mm-yyyy)"),
  // Customer details (stored on the customer, not the loan).
  pan: text,
  dob: parsed(parseHubDate, "is not a valid date (use dd-mm-yyyy)"),
  customerState: text,
  landmark: text,
  residenceType: text,
  landlordName: text,
  landlordMobile: text,
  occupation: text,
  workAddress: text,
  ref1Name: text,
  ref1Relation: text,
  ref1Mobile: text,
  ref2Name: text,
  ref2Relation: text,
  ref2Mobile: text,
  // Caller or Retailer decides which workflow the customer follows; a Retailer row also needs a retailer code (checked against the retailers later).
  // Caller or Retailer decides which workflow the customer follows; a Retailer row also needs a retailer code (checked against the retailers later).
  assignmentType: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) {
        ctx.issues.push({ code: "custom", message: "is blank (use Caller or Retailer)", input: v });
        return z.NEVER;
      }
      const hit = matchList(["CALLER", "RETAILER"])(v) as "CALLER" | "RETAILER" | null;
      if (!hit) ctx.issues.push({ code: "custom", message: `"${v}" is not valid (use Caller or Retailer)`, input: v });
      return hit ?? z.NEVER;
    }),
  retailerCode: text,
  // Retailer details, used only to create a retailer that does not exist yet.
  shopName: text,
  retailerName: text,
  retailerMobile: text,
  retailerDistrict: text,
  retailerState: text,
});
export type LoanRow = z.infer<typeof loanRowSchema>;

// One row of the Allocations file. A blank agent email means "unallocate this loan".
export const allocationRowSchema = z.object({
  agreementNo: z.string().trim().min(1, "Agreement no. is blank"),
  agentEmail: text,
  agency: text,
  assignedOn: parsed(parseHubDate, "Invalid assigned date"),
  validTill: parsed(parseHubDate, "Invalid valid-till date"),
});
export type AllocationRow = z.infer<typeof allocationRowSchema>;

// One row of the Payments file: a payment received on a loan (a loan can appear on many rows). Amount and date are required.
export const paymentRowSchema = z.object({
  agreementNo: z.string().trim().min(1, "Agreement no. is blank"),
  amount: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = parseAmount(v);
      if (n === null || n <= 0) {
        ctx.issues.push({ code: "custom", message: "Amount must be more than 0", input: v });
        return z.NEVER;
      }
      return n;
    }),
  paidOn: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = parseHubDate(v);
      if (!d) {
        ctx.issues.push({ code: "custom", message: "Invalid paid-on date", input: v });
        return z.NEVER;
      }
      return d;
    }),
  mode: text,
  receiptNo: text,
});
export type PaymentRow = z.infer<typeof paymentRowSchema>;

// The upload form: which kind of file this is.
export const importTypeSchema = z.enum(["LOANS", "ALLOCATIONS", "PAYMENTS"], { error: "Choose Loans, Allocations or Payments" });

// First problem of a failed row as "field: message" for the error report.
// Column names as the Admin sees them in the hub file, used to point at the cell a row error is about.
const COLUMN_LABELS: Record<string, string> = {
  agreementNo: "Loan Account Number", customerName: "Customer Name", mobilePrimary: "Customer Mobile", mobileAlt: "Alternate Mobile", company: "Company", branch: "Branch",
  assignmentType: "Assignment Type", disbursedOn: "Disbursed Date", agreementDate: "Agreement Date", emiAmount: "EMI Amount", pendingEmis: "Overdue EMI Count", dpd: "DPD",
  overdueAmount: "Overdue Amount", status: "Loan Status", loanAmount: "Loan Amount", totalRepaymentAmount: "Total Repayment Amount", tenureMonths: "Tenure (Months)",
  roi: "ROI (%)", oldestOverdueEmiNo: "Oldest Overdue EMI Number", oldestOverdueOn: "Oldest Overdue Date", penaltyCharges: "Penalty Charges",
  otherDueCharges: "Other Due Charges", totalOutstanding: "Total Outstanding", totalPaid: "Total Paid", lastPaymentOn: "Last Payment Date", dob: "Date of Birth",
};

// Turns the first problem of a row into a plain sentence naming the column, e.g. "Branch is blank (fill the Branch column)".
export const describeIssue = (error: z.ZodError) => {
  const issue = error.issues[0];
  const field = issue.path.join(".");
  const label = COLUMN_LABELS[field];
  return label ? `${label} ${issue.message}` : field ? `${field}: ${issue.message}` : issue.message;
};
