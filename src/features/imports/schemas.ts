import { z } from "zod";
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

// One row of the Loans file (customer + loan). Branch/company must be known so access filters never break.
export const loanRowSchema = z.object({
  agreementNo: z.string().trim().min(1, "Agreement no. is blank"),
  hubCustomerId: text,
  customerName: z.string().trim().min(1, "Customer name is blank"),
  mobilePrimary: parsed(parseMobile, "Invalid mobile (need 10 digits)"),
  mobileAlt: parsed(parseMobile, "Invalid alternate mobile (need 10 digits)"),
  address: text,
  pin: text,
  area: text,
  company: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const hit = matchList(COMPANIES)(v);
      if (!hit) ctx.issues.push({ code: "custom", message: `Unknown company "${v}"`, input: v });
      return (hit ?? z.NEVER) as (typeof COMPANIES)[number];
    }),
  branch: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const hit = matchList(BRANCHES)(v);
      if (!hit) ctx.issues.push({ code: "custom", message: `Unknown branch "${v}" (add it to BRANCHES first)`, input: v });
      return hit ?? z.NEVER;
    }),
  disbursedOn: parsed(parseHubDate, "Invalid disbursed date"),
  emiAmount: parsed(parseAmount, "Invalid EMI amount"),
  pendingEmis: parsed(parseCount, "Pending EMIs must be a whole number"),
  dpd: parsed(parseCount, "DPD must be a whole number"),
  overdueAmount: parsed(parseAmount, "Invalid overdue amount"),
  status: parsed((v) => (matchList(["ACTIVE", "CLOSED"])(v) as "ACTIVE" | "CLOSED" | null), "Status must be Active or Closed"),
});
export type LoanRow = z.infer<typeof loanRowSchema>;

// One row of the Allocations file. A blank hub user id means "unallocate this loan".
export const allocationRowSchema = z.object({
  agreementNo: z.string().trim().min(1, "Agreement no. is blank"),
  hubUserId: text,
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
export const describeIssue = (error: z.ZodError) => {
  const issue = error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
};
