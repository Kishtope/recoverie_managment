import type { Prisma } from "@/generated/prisma/client";
import type { PaymentRow } from "@/features/imports/schemas";
import type { ImportRowError } from "@/features/imports/types";
import { prisma } from "@/lib/prisma";
import { applyInChunks, chunk, type ApplyResult, type Outcome } from "./shared";

export type ValidPaymentRow = { row: number; data: PaymentRow };

// Identifies one payment so the same file uploaded twice never counts it twice: loan + day + amount + receipt no.
// (two genuinely identical payments on one day with no receipt no. would collapse into one; the hub export should carry receipt nos).
export const paymentDedupeKey = (loanId: string, paidOn: Date, amount: number, receiptNo?: string) =>
  `${loanId}|${paidOn.toISOString().slice(0, 10)}|${amount.toFixed(2)}|${receiptNo ?? ""}`;

// Writes one chunk: payments whose key already exists are "unchanged"; the rest are inserted with one createMany.
const applyPaymentChunk = async (
  tx: Prisma.TransactionClient,
  items: (ValidPaymentRow & { loanId: string })[],
  importId: string,
): Promise<Outcome[]> => {
  const keyed = items.map((i) => ({ ...i, key: paymentDedupeKey(i.loanId, i.data.paidOn, i.data.amount, i.data.receiptNo) }));
  const known = new Set((await tx.payment.findMany({ where: { dedupeKey: { in: keyed.map((k) => k.key) } }, select: { dedupeKey: true } })).map((p) => p.dedupeKey));
  const outcomes: Outcome[] = [];
  const fresh: typeof keyed = [];
  for (const item of keyed) {
    // A key already stored, or repeated earlier in this same chunk, is a duplicate.
    if (known.has(item.key)) outcomes.push("unchanged");
    else {
      known.add(item.key);
      fresh.push(item);
      outcomes.push("created");
    }
  }
  if (fresh.length) {
    await tx.payment.createMany({
      data: fresh.map((i) => ({
        loanId: i.loanId,
        amount: i.data.amount,
        paidOn: i.data.paidOn,
        mode: i.data.mode ?? null,
        receiptNo: i.data.receiptNo ?? null,
        importRunId: importId,
        dedupeKey: i.key,
      })),
    });
  }
  return outcomes;
};

// Imports validated Payments rows: each row is matched to its loan by agreement no. (no match = an error row, never a silent skip),
// then written in chunks. Re-uploading a file creates nothing new.
export const applyPayments = async (rows: ValidPaymentRow[], importId: string): Promise<ApplyResult> => {
  const agreements = [...new Set(rows.map((r) => r.data.agreementNo))];
  const loans = new Map<string, string>();
  for (const part of chunk(agreements, 1000)) {
    for (const l of await prisma.loan.findMany({ where: { agreementNo: { in: part } }, select: { id: true, agreementNo: true } })) loans.set(l.agreementNo, l.id);
  }

  const errors: ImportRowError[] = [];
  const resolved: (ValidPaymentRow & { loanId: string })[] = [];
  for (const r of rows) {
    const loanId = loans.get(r.data.agreementNo);
    if (loanId) resolved.push({ ...r, loanId });
    else errors.push({ row: r.row, agreementNo: r.data.agreementNo, reason: "Loan not found; import Loans first" });
  }

  const written = await applyInChunks(resolved, (tx, items) => applyPaymentChunk(tx, items, importId), (item) => item.data.agreementNo);
  return { ...written, errors: [...errors, ...written.errors] };
};
