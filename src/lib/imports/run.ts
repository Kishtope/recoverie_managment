import type { ImportRun, ImportType, Prisma } from "@/generated/prisma/client";
import { allocationRowSchema, describeIssue, loanRowSchema, paymentRowSchema } from "@/features/imports/schemas";
import type { ImportPreview, ImportRowError, ImportRunItem } from "@/features/imports/types";
import type { RetailerImportSummary } from "@/features/retailers/types";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRetailerRows } from "@/lib/retailer-import";
import { applyAllocations, type ValidAllocationRow } from "./allocations";
import type { RawRow } from "./columns";
import { applyLoans, type ValidLoanRow } from "./loans";
import { applyPayments, type ValidPaymentRow } from "./payments";
import type { ApplyResult } from "./shared";

// A RUNNING run older than this is treated as dead (server crashed mid-import) and no longer blocks new imports.
const STALE_AFTER_MS = 10 * 60_000;

// True while another import is in progress.
// shortcut: check-then-create is not atomic, two uploads in the same instant could both pass; fine for one Admin, add a DB lock if imports become scheduled.
export const hasRunningImport = async () =>
  !!(await prisma.importRun.findFirst({ where: { status: "RUNNING", startedAt: { gt: new Date(Date.now() - STALE_AFTER_MS) } }, select: { id: true } }));

// Validates every row with its zod schema; rows that fail, or repeat an agreement no. already seen in the file, become errors.
export const validate = <T extends { agreementNo: string }>(
  rows: RawRow[],
  parse: (values: Record<string, string>) => { data?: T; error?: string },
  // Payments files repeat an agreement no. (one row per payment); Loans / Allocations files must not.
  allowRepeats = false,
): { valid: { row: number; data: T }[]; errors: ImportRowError[] } => {
  const valid: { row: number; data: T }[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Map<string, number>();
  for (const { row, values } of rows) {
    const agreementNo = values.agreementNo?.trim() || null;
    const result = parse(values);
    if (!result.data) {
      errors.push({ row, agreementNo, reason: result.error ?? "Invalid row" });
      continue;
    }
    const first = allowRepeats ? undefined : seen.get(result.data.agreementNo);
    if (first !== undefined) {
      errors.push({ row, agreementNo, reason: `Duplicate agreement no. in this file (first on row ${first})` });
      continue;
    }
    seen.set(result.data.agreementNo, row);
    valid.push({ row, data: result.data });
  }
  return { valid, errors };
};

// Validates a Loans file without writing anything: every row against its schema, then the retailer rules (known active code, at most 20 per retailer).
// Rows that pass carry the retailer they were mapped to. Used by both the preview and the real import so the two always agree.
export const prepareLoans = async (rows: RawRow[]) => {
  const v = validate(rows, (values) => {
    const r = loanRowSchema.safeParse(values);
    return r.success ? { data: r.data } : { error: describeIssue(r.error) };
  });
  const retailers = await prisma.retailer.findMany({ select: { id: true, code: true, name: true, status: true } });
  const check = checkRetailerRows(
    v.valid.map(({ row, data }) => ({ row, agreementNo: data.agreementNo, assignmentType: data.assignmentType, retailerCode: data.retailerCode })),
    retailers,
  );
  const rejected = new Set(check.errors.map((e) => e.row));
  const valid: ValidLoanRow[] = v.valid.filter((r) => !rejected.has(r.row)).map((r) => ({ ...r, retailerId: check.retailerIds.get(r.row) }));
  const errors = [...v.errors, ...check.errors].sort((a, b) => a.row - b.row);
  return { valid, errors, summary: check.summary };
};

// The numbers an Admin reviews before confirming a Loans upload (nothing is saved). `errors` is cut to the first 100 rows.
export const previewLoans = async (rows: RawRow[]): Promise<ImportPreview> => {
  const { valid, errors, summary } = await prepareLoans(rows);
  return { totalRows: rows.length, valid: valid.length, invalid: errors.length, retailers: summary, errors: errors.slice(0, 100) };
};

// Runs one import end to end: records an ImportRun, validates, writes, then closes the run with counts and every error.
// Never throws for bad rows (they go in `errors`); a crash marks the run FAILED and rethrows.
export const executeImport = async ({ type, fileName, userId, rows }: { type: ImportType; fileName: string; userId: string; rows: RawRow[] }) => {
  const run = await prisma.importRun.create({ data: { type, fileName, totalRows: rows.length, createdById: userId } });
  try {
    let checked: { errors: ImportRowError[] };
    let written: ApplyResult;
    let retailerSummary: RetailerImportSummary | undefined;
    if (type === "LOANS") {
      const prepared = await prepareLoans(rows);
      checked = prepared;
      retailerSummary = prepared.summary;
      written = await applyLoans(prepared.valid, run.id);
    } else if (type === "PAYMENTS") {
      const v = validate(
        rows,
        (values) => {
          const r = paymentRowSchema.safeParse(values);
          return r.success ? { data: r.data } : { error: describeIssue(r.error) };
        },
        true,
      );
      checked = v;
      written = await applyPayments(v.valid as ValidPaymentRow[], run.id);
    } else {
      const v = validate(rows, (values) => {
        const r = allocationRowSchema.safeParse(values);
        return r.success ? { data: r.data } : { error: describeIssue(r.error) };
      });
      checked = v;
      written = await applyAllocations(v.valid as ValidAllocationRow[], userId, run.id);
    }

    const errors = [...checked.errors, ...written.errors].sort((a, b) => a.row - b.row);
    const done = await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: "DONE",
        created: written.created,
        updated: written.updated,
        unchanged: written.unchanged,
        failed: errors.length,
        errors: errors as unknown as Prisma.InputJsonValue,
        ...(retailerSummary ? { retailerSummary: retailerSummary as unknown as Prisma.InputJsonValue } : {}),
        finishedAt: new Date(),
      },
    });
    await logAudit(userId, "import.run", "ImportRun", run.id, { type, totalRows: rows.length, failed: errors.length });
    return done;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Import failed";
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date(), errors: [{ row: 0, agreementNo: null, reason }] },
    });
    throw e;
  }
};

// Run record -> JSON for the API (without the errors list, which only the detail route returns).
export const toRunItem = (run: ImportRun, createdBy: { id: string; name: string } | null): ImportRunItem => ({
  id: run.id,
  type: run.type,
  status: run.status,
  fileName: run.fileName,
  totalRows: run.totalRows,
  created: run.created,
  updated: run.updated,
  unchanged: run.unchanged,
  failed: run.failed,
  startedAt: run.startedAt.toISOString(),
  finishedAt: run.finishedAt?.toISOString() ?? null,
  retailers: (run.retailerSummary as RetailerImportSummary | null) ?? null,
  createdBy,
});
