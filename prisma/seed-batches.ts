import { prisma } from "../src/lib/prisma";
import { addDays, todayIst } from "../src/lib/dates";

// Names of the dummy batches; re-running removes exactly these (their case links go with them) and creates them again, so it is safe to repeat.
const NAMES = [
  "Batch - 2260 (draft)",
  "Batch - 2261 (ready)",
  "Batch - 2262 (ready)",
  "Batch - 2268 (allocation)",
  "Batch - 2269 (agency)",
  "Batch - 2250 (done)",
  "FR Batch - 301 (draft)",
  "FR Batch - 302 (ready)",
  "FR Batch - 303 (visits)",
  "FR Batch - 290 (done)",
];

// Dev/test data: a few Call and FR batches in every stage, built from the loans already in the database. Closed batches may reuse cases that
// later batches also hold (a closed batch frees its cases). Needs the main seed (users, agency, loans) to have run first.
export const seedBatches = async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const agency = await prisma.agency.findFirst({ select: { id: true } });
  const loans = await prisma.loan.findMany({ orderBy: { id: "asc" }, select: { id: true, fieldVisitFlag: true } });
  if (!admin || loans.length === 0) {
    console.log("Batches skipped: run the main seed first (needs an admin and loans).");
    return;
  }

  const ids = loans.map((l) => l.id);
  const flagged = loans.filter((l) => l.fieldVisitFlag).map((l) => l.id);
  const daysAgo = (n: number) => new Date(`${addDays(todayIst(), -n)}T10:00:00+05:30`);
  const pick = (from: string[], start: number, count: number) => from.slice(start, start + count);

  // [name, type, status, agency?, assignedOn?, closedAt?, cases]. Call cases never overlap between unfinished batches (same rule as the API);
  // FR batches draw from the flagged loans only. The last loans (3 Call, 2 flagged FR) stay in no unfinished batch so "New batch" has cases to pick.
  const plan: [string, "CALL" | "FR", "DRAFT" | "OPEN" | "IN_PROGRESS" | "CLOSED", string | null, Date | null, Date | null, string[]][] = [
    [NAMES[0], "CALL", "DRAFT", null, null, null, pick(ids, 0, 2)],
    [NAMES[1], "CALL", "OPEN", null, null, null, pick(ids, 2, 2)],
    [NAMES[2], "CALL", "OPEN", null, null, null, pick(ids, 4, 2)],
    [NAMES[3], "CALL", "IN_PROGRESS", null, daysAgo(1), null, pick(ids, 6, 2)],
    [NAMES[4], "CALL", "IN_PROGRESS", agency?.id ?? null, daysAgo(5), null, pick(ids, 8, 1)],
    [NAMES[5], "CALL", "CLOSED", null, daysAgo(20), daysAgo(3), pick(ids, 0, 5)],
    [NAMES[6], "FR", "DRAFT", null, null, null, pick(flagged, 0, 1)],
    [NAMES[7], "FR", "OPEN", null, null, null, pick(flagged, 1, 1)],
    [NAMES[8], "FR", "IN_PROGRESS", null, daysAgo(2), null, pick(flagged, 2, 1)],
    [NAMES[9], "FR", "CLOSED", agency?.id ?? null, daysAgo(25), daysAgo(6), pick(flagged, 0, 2)],
  ];

  await prisma.batch.deleteMany({ where: { name: { in: NAMES } } });
  for (const [name, type, status, agencyId, assignedOn, closedAt, cases] of plan) {
    if (cases.length === 0) continue;
    const batch = await prisma.batch.create({ data: { name, type, status, agencyId, assignedOn, closedAt, createdById: admin.id } });
    await prisma.batchLoan.createMany({ data: cases.map((loanId) => ({ batchId: batch.id, loanId })) });
  }
  console.log(`Seeded ${plan.length} batches (Call and FR, every stage).`);
};
