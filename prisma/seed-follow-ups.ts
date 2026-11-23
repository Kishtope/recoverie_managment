import { prisma } from "../src/lib/prisma";
import { addDays, toDbDate, todayIst } from "../src/lib/dates";

// Marks the dummy loans so a re-run removes exactly these and builds them again.
const PREFIX = "FU-";

type Outcome = "PTP" | "CALLBACK" | "NOT_REACHABLE" | "WRONG_NUMBER" | "PAID";

// [tab, customer name, days until next follow-up (null = none), last outcome (null = never contacted), closed?, dues, overdue amount]
// New: never contacted. Today: due today or overdue. Post: contacted, next call still ahead. Closed: loan closed.
const PLAN: [string, string, number | null, Outcome | null, boolean, number, number][] = [
  ["new", "Shivam Barik", null, null, false, 1, 3200],
  ["new", "Mancha Yadav", null, null, false, 1, 4100],
  ["new", "Dani Kumar", null, null, false, 2, 6800],
  ["new", "Tashaveer Singh", null, null, false, 1, 2500],
  ["today", "Prins Dakha", 0, "CALLBACK", false, 1, 5200],
  ["today", "Ravi Sahu", 0, "PTP", false, 2, 7400],
  ["today", "Kiran Chandravanshi", -1, "NOT_REACHABLE", false, 1, 3900],
  ["today", "Pravindra Ramteke", -3, "NOT_REACHABLE", false, 3, 9100],
  ["post", "Govind Sharma", 2, "PTP", false, 1, 4500],
  ["post", "Rahul Prathyani", 4, "CALLBACK", false, 2, 6000],
  ["post", "Aakash Gupta", null, "WRONG_NUMBER", false, 1, 2800],
  ["closed", "Meena Patel", null, "PAID", true, 0, 0],
  ["closed", "Sunil Verma", null, "PAID", true, 0, 0],
  ["closed", "Deepa Nair", null, "PAID", true, 0, 0],
];

// Dev/test data for the four Follow-ups tabs (New, Today, Post, Closed): 14 loans allocated to the first agent (Asha, AF Balaghat).
// Safe to re-run: the previous FU- loans, their customers, outcomes and allocations are removed first.
export const seedFollowUps = async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const agent = await prisma.user.findUnique({ where: { email: "agent1@example.com" }, select: { id: true } });
  if (!admin || !agent) {
    console.log("Follow-ups skipped: run the main seed first (needs the admin and agent1@example.com).");
    return;
  }

  const old = await prisma.loan.findMany({ where: { agreementNo: { startsWith: PREFIX } }, select: { id: true, customerId: true } });
  if (old.length) {
    const loanIds = old.map((l) => l.id);
    await prisma.call.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.interactionResponse.deleteMany({ where: { disposition: { loanId: { in: loanIds } } } });
    await prisma.disposition.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.allocation.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.loan.deleteMany({ where: { id: { in: loanIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: old.map((l) => l.customerId) } } });
  }

  const today = todayIst();
  for (const [i, [tab, name, inDays, outcome, closed, dues, overdue]] of PLAN.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const nextFollowUpOn = inDays === null ? null : toDbDate(addDays(today, inDays));
    const contactedAt = outcome ? new Date(Date.now() - (i + 1) * 3600_000) : null;
    const customer = await prisma.customer.create({
      data: { name, mobilePrimary: `98${String(11000000 + i * 137).padStart(8, "0")}`, mobileAlt: `81${String(3400000 + i * 211).padStart(8, "0")}`, area: "Balaghat", pin: "481001" },
    });
    const loan = await prisma.loan.create({
      data: {
        agreementNo: `${PREFIX}${tab.toUpperCase()}-${n}`,
        customerId: customer.id,
        company: "AF",
        branch: "Balaghat",
        dpd: closed ? 0 : 20 + i * 7,
        overdueAmount: overdue,
        emiAmount: 2500,
        pendingEmis: dues,
        status: closed ? "CLOSED" : "ACTIVE",
        lastOutcome: outcome,
        lastContactedAt: contactedAt,
        nextFollowUpOn,
      },
    });
    await prisma.allocation.create({
      data: { loanId: loan.id, activeLoanId: loan.id, agentId: agent.id, assignedById: admin.id, assignedOn: new Date() },
    });
    // One recorded outcome for every loan that was contacted, so its case page shows a history.
    if (outcome && contactedAt) {
      await prisma.disposition.create({
        data: {
          loanId: loan.id, agentId: agent.id, outcome, createdAt: contactedAt, nextFollowUpOn,
          ptpDate: outcome === "PTP" ? nextFollowUpOn : null, ptpAmount: outcome === "PTP" ? 3000 : null,
          paidAmount: outcome === "PAID" ? 8000 : null, remarks: "Dummy follow-up data",
        },
      });
    }
  }
  console.log(`Seeded ${PLAN.length} follow-up loans for agent1@example.com (4 New, 4 Today, 3 Post, 3 Closed).`);
};
