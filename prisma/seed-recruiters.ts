import { prisma } from "../src/lib/prisma";
import { paymentDedupeKey } from "../src/lib/imports/payments";
import { hashPassword } from "../src/lib/password";
import { addDays, toDbDate, todayIst } from "../src/lib/dates";
// Same text the daily escalation job writes to Allocation.endReason (src/lib/recruiters.ts); kept local so the seed needs no path aliases.
const RECRUITER_ESCALATION_REASON = "RECRUITER_ESCALATION";

// One case a recruiter holds: [recruiter, customer, days since assigned, DPD, overdue amount, optional open promise / part payment].
// Two rows with the same customer name are two loans of one customer (a recruiter often handles several loans of the same person).
type Held = [number, string, number, number, number, ("PTP" | "PART_PAID")?];

// Time left on the default 10-day limit: 1 day ago = 9 left, 8 = 2 left (reminder window), 10 = last day, 12 = past the limit.
const HELD: Held[] = [
  [0, "Mahesh Verma", 1, 25, 12000],
  [0, "Mahesh Verma", 1, 25, 8000],
  [0, "Sunita Rao", 4, 40, 15000],
  [0, "Imran Khan", 8, 55, 22000],
  [0, "Pooja Jain", 9, 62, 18000, "PTP"], // promise dated after the limit keeps the timer running
  [1, "Deepak Sahu", 2, 18, 9000],
  [1, "Kavita Patel", 5, 33, 14000],
  [1, "Naveen Gupta", 9, 70, 26000],
  [1, "Rekha Bai", 10, 48, 11000],
  [1, "Sanjay Dubey", 12, 90, 31000], // past the limit; leaves on the next daily run
  [1, "Anil Tiwari", 3, 21, 7000, "PART_PAID"],
  [2, "Meena Kumari", 1, 15, 6000],
  [2, "Ravi Shankar", 6, 44, 17000],
  [2, "Geeta Soni", 7, 52, 19000],
];

// A case that already moved to a caller: [recruiter, customer, days the recruiter held it, days since it moved, overdue, paid while with the recruiter, paid since it moved].
type Moved = [number, string, number, number, number, number, number];
const MOVED: Moved[] = [
  [0, "Vikram Singh", 10, 4, 20000, 3000, 0],
  [0, "Lata Mishra", 11, 7, 16000, 0, 2500],
  [1, "Harish Yadav", 12, 3, 28000, 0, 0],
];

// Dev/test data for the Recruiters page: three recruiters (Rohan, Rina, Rahul) under the seeded manager, each handling several customers
// at different points of the escalation timer, plus a few cases that already moved to a caller with payments before and after the move.
// Safe to re-run: loans are looked up by agreement number and skipped when they already exist.
export const seedRecruiters = async (password: string) => {
  const today = todayIst();
  const manager = await prisma.user.findUnique({ where: { email: "manager@example.com" } });
  const caller = await prisma.user.findUnique({ where: { email: "agent1@example.com" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!manager || !caller || !admin) return;

  // The three recruiters, all in the manager's team with access to the branch the cases sit in.
  const people: [string, string, string][] = [
    ["recruiter1@example.com", "Rohan Recruiter", "9000000016"],
    ["recruiter2@example.com", "Rina Recruiter", "9000000017"],
    ["recruiter3@example.com", "Rahul Recruiter", "9000000018"],
  ];
  const recruiters = [];
  for (const [email, name, mobile] of people) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role: "RECRUITER", reportsToId: manager.id, mobile },
      create: { email, name, role: "RECRUITER", passwordHash: await hashPassword(password), reportsToId: manager.id, mobile },
    });
    await prisma.userAccess.deleteMany({ where: { userId: user.id } });
    await prisma.userAccess.create({ data: { userId: user.id, company: "AF", branch: "Balaghat" } });
    recruiters.push(user);
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  let counter = 0;
  // Creates the customer (one per name) and a loan with the next agreement number; returns null when that loan already exists.
  const makeLoan = async (name: string, dpd: number, overdueAmount: number) => {
    counter++;
    const agreementNo = `SEED-R${String(counter).padStart(3, "0")}`;
    if (await prisma.loan.findUnique({ where: { agreementNo } })) return null;
    const customer =
      (await prisma.customer.findFirst({ where: { name, area: "Balaghat", pin: "481001" } })) ??
      (await prisma.customer.create({ data: { name, mobilePrimary: `97000${String(1000 + counter)}`, area: "Balaghat", pin: "481001" } }));
    return prisma.loan.create({
      data: { agreementNo, customerId: customer.id, company: "AF", branch: "Balaghat", dpd, overdueAmount, emiAmount: 2500, pendingEmis: Math.ceil(dpd / 30) },
    });
  };
  // A payment on a loan, deduplicated so re-running never doubles it.
  const pay = async (loanId: string, amount: number, daysBack: number, receiptNo: string) => {
    const paidOn = toDbDate(addDays(today, -daysBack));
    await prisma.payment.createMany({
      data: [{ loanId, amount, paidOn, mode: "UPI", receiptNo, dedupeKey: paymentDedupeKey(loanId, paidOn, amount, receiptNo) }],
      skipDuplicates: true,
    });
  };

  // Cases each recruiter holds now.
  for (const [r, name, held, dpd, overdue, state] of HELD) {
    const loan = await makeLoan(name, dpd, overdue);
    if (!loan) continue;
    const recruiter = recruiters[r];
    await prisma.allocation.create({ data: { loanId: loan.id, activeLoanId: loan.id, agentId: recruiter.id, assignedById: admin.id, assignedOn: daysAgo(held) } });
    if (!state) continue;
    // A promise to pay in 4 days, or a part payment with a follow-up in 3 days, so the deadline stretches past the limit.
    const nextFollowUpOn = toDbDate(addDays(today, state === "PTP" ? 4 : 3));
    await prisma.disposition.create({
      data: {
        loanId: loan.id, agentId: recruiter.id, outcome: state, nextFollowUpOn, createdAt: new Date(Date.now() - 3600_000),
        ...(state === "PTP" ? { ptpDate: nextFollowUpOn, ptpAmount: Math.round(overdue / 2) } : { paidAmount: 3000 }),
      },
    });
    await prisma.loan.update({ where: { id: loan.id }, data: { lastOutcome: state, lastContactedAt: new Date(), nextFollowUpOn } });
    if (state === "PART_PAID") await pay(loan.id, 3000, 1, `R-REC-${loan.agreementNo}`);
  }

  // Cases that already moved from a recruiter to the caller: the recruiter's allocation ends with the escalation reason and the caller's starts at that instant.
  for (const [r, name, held, movedAgo, overdue, paidWhileHeld, paidSince] of MOVED) {
    const loan = await makeLoan(name, 75, overdue);
    if (!loan) continue;
    const recruiter = recruiters[r];
    const movedAt = daysAgo(movedAgo);
    await prisma.allocation.create({
      data: {
        loanId: loan.id, agentId: recruiter.id, assignedById: admin.id, assignedOn: daysAgo(movedAgo + held),
        active: false, activeLoanId: null, endedAt: movedAt, endReason: RECRUITER_ESCALATION_REASON,
      },
    });
    await prisma.allocation.create({ data: { loanId: loan.id, activeLoanId: loan.id, agentId: caller.id, assignedOn: movedAt } });
    if (paidWhileHeld) await pay(loan.id, paidWhileHeld, movedAgo + 2, `R-REC-${loan.agreementNo}-A`);
    if (paidSince) await pay(loan.id, paidSince, Math.max(0, movedAgo - 2), `R-REC-${loan.agreementNo}-B`);
  }
};
