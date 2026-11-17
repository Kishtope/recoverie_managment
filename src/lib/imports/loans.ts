import { randomUUID } from "node:crypto";
import type { Customer, Loan, Prisma } from "@/generated/prisma/client";
import type { LoanRow } from "@/features/imports/schemas";
import { applyInChunks, type ApplyResult, type Outcome } from "./shared";

export type ValidLoanRow = { row: number; data: LoanRow };

// Normalises a stored value for comparison (Decimal -> number, Date -> millis).
const comparable = (v: unknown) => {
  if (v instanceof Date) return v.getTime();
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
  return v ?? null;
};

// The part of `patch` that differs from `current`. Undefined (blank cell) never counts as a change.
const changes = (current: Record<string, unknown>, patch: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== undefined && comparable(v) !== comparable(current[k])));

// Splits a validated row into the customer part and the loan part.
const split = ({ agreementNo, hubCustomerId, customerName, mobilePrimary, mobileAlt, address, pin, area, ...loanFields }: LoanRow) => ({
  agreementNo,
  customer: { hubCustomerId, name: customerName, mobilePrimary, mobileAlt, address, pin, area },
  loan: loanFields,
});

// Updates a stored loan (and its customer) from a row; "unchanged" when nothing differs, with no write at all.
const updateExisting = async (tx: Prisma.TransactionClient, stored: Loan & { customer: Customer }, data: LoanRow, importId: string): Promise<Outcome> => {
  const { customer, loan } = split(data);
  const customerChanges = changes(stored.customer, customer);
  const loanChanges = changes(stored, loan);
  if (!Object.keys(customerChanges).length && !Object.keys(loanChanges).length) return "unchanged";
  if (Object.keys(customerChanges).length) await tx.customer.update({ where: { id: stored.customerId }, data: customerChanges });
  await tx.loan.update({ where: { id: stored.id }, data: { ...loanChanges, lastImportId: importId } });
  return "updated";
};

// Slow path for a new loan whose row carries a hub customer id: the customer may already exist (or appear earlier in the same chunk).
const createWithHubCustomer = async (tx: Prisma.TransactionClient, data: LoanRow, importId: string): Promise<Outcome> => {
  const { agreementNo, customer, loan } = split(data);
  const known = await tx.customer.findUnique({ where: { hubCustomerId: customer.hubCustomerId! } });
  let customerId: string;
  if (known) {
    customerId = known.id;
    // The customer already carries this hub id, so only the other fields can differ.
    const rest = changes(known, { ...customer, hubCustomerId: undefined });
    if (Object.keys(rest).length) await tx.customer.update({ where: { id: known.id }, data: rest });
  } else {
    customerId = (await tx.customer.create({ data: customer })).id;
  }
  await tx.loan.create({ data: { agreementNo, customerId, ...loan, lastImportId: importId } });
  return "created";
};

// Applies one chunk of rows: one query fetches the stored loans, unchanged rows cost no write, and new loans
// (the bulk of a first import) are inserted with two createMany calls instead of several queries each.
const applyLoanChunk = async (tx: Prisma.TransactionClient, items: ValidLoanRow[], importId: string): Promise<Outcome[]> => {
  const stored = await tx.loan.findMany({ where: { agreementNo: { in: items.map((i) => i.data.agreementNo) } }, include: { customer: true } });
  const byAgreement = new Map(stored.map((l) => [l.agreementNo, l]));

  const outcomes: Outcome[] = new Array(items.length);
  const fresh: number[] = []; // indexes of new loans that can be bulk inserted
  for (const [index, { data }] of items.entries()) {
    const loan = byAgreement.get(data.agreementNo);
    if (loan) outcomes[index] = await updateExisting(tx, loan, data, importId);
    else if (data.hubCustomerId) outcomes[index] = await createWithHubCustomer(tx, data, importId);
    else fresh.push(index);
  }

  if (fresh.length) {
    // Ids are made here (createMany does not return them on MySQL) so each loan can point at its new customer.
    const rows = fresh.map((index) => ({ customerId: randomUUID(), ...split(items[index].data) }));
    await tx.customer.createMany({ data: rows.map(({ customerId, customer }) => ({ id: customerId, ...customer })) });
    await tx.loan.createMany({ data: rows.map(({ customerId, agreementNo, loan }) => ({ agreementNo, customerId, ...loan, lastImportId: importId })) });
    fresh.forEach((index) => (outcomes[index] = "created"));
  }
  return outcomes;
};

// Upserts the validated Loans rows by agreement no. Blank cells leave stored values untouched; loans missing from the file are not touched.
export const applyLoans = (rows: ValidLoanRow[], importId: string): Promise<ApplyResult> =>
  applyInChunks(rows, (tx, items) => applyLoanChunk(tx, items, importId), (item) => item.data.agreementNo);
