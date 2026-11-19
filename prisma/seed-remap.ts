import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { addDays, todayIst } from "../src/lib/dates";

// Dev/test data for the remap features: settlement requests (one inside a Manager's
// limit, one above it), a payment recorded in the app with a receipt, monthly targets, and a do-not-call customer.
// Safe to re-run: every step checks whether its data already exists. Needs the base seed's users and SEED-xxxx loans.
export const seedRemap = async (password: string) => {
  const today = todayIst();
  const loanOf = (n: number) => prisma.loan.findUnique({ where: { agreementNo: `SEED-${String(n).padStart(4, "0")}` }, include: { customer: true } });
  const manager = await prisma.user.findUnique({ where: { email: "manager@example.com" } });
  const agent1 = await prisma.user.findUnique({ where: { email: "agent1@example.com" } });
  const agent2 = await prisma.user.findUnique({ where: { email: "agent2@example.com" } });
  const agent3 = await prisma.user.findUnique({ where: { email: "field1@example.com" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!manager || !agent1 || !agent2 || !agent3 || !admin) return;

  // Settlement requests by agent1: SEED-0004 waives 30% (only an Admin can approve), SEED-0007 waives 10% (a Manager can).
  for (const [n, requestedFraction] of [[4, 0.7], [7, 0.9]] as const) {
    const loan = await loanOf(n);
    const overdue = loan?.overdueAmount?.toNumber();
    if (!loan || !overdue || (await prisma.settlement.count({ where: { loanId: loan.id } })) > 0) continue;
    const requestedAmount = Math.round(overdue * requestedFraction);
    await prisma.settlement.create({
      data: { loanId: loan.id, requestedById: agent1.id, requestedAmount, waiverAmount: overdue - requestedAmount, remarks: "Customer lost his job, can pay once." },
    });
  }

  // A payment recorded in the app, with its receipt number, by agent2 on SEED-0002.
  const paid = await loanOf(2);
  if (paid) {
    await prisma.payment.createMany({
      data: [{ loanId: paid.id, amount: 1000, paidOn: new Date(`${addDays(today, -1)}T00:00:00.000Z`), mode: "CASH", receiptNo: "RCP-SEED-0001", source: "MANUAL", collectedById: agent2.id, dedupeKey: "manual|RCP-SEED-0001" }],
      skipDuplicates: true,
    });
  }

  // A customer who asked not to be called (SEED-0009, held by agent3): the Call button is off for that case.
  const dnc = await loanOf(9);
  if (dnc) await prisma.customer.update({ where: { id: dnc.customerId }, data: { doNotCall: true } });

  // Monthly targets for this month: money and cases to resolve.
  const month = today.slice(0, 7);
  for (const [user, collectionAmount, casesResolved] of [[agent1, 50000, 5], [agent2, 40000, 4], [agent3, 30000, 3]] as const) {
    await prisma.agentTarget.upsert({
      where: { userId_month: { userId: user.id, month } },
      update: { collectionAmount, casesResolved },
      create: { userId: user.id, month, collectionAmount, casesResolved, updatedById: admin.id },
    });
  }
};
