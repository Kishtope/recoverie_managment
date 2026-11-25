import { prisma } from "../src/lib/prisma";
import { addDays, toDbDate, todayIst } from "../src/lib/dates";

// Marks the dummy loans so a re-run removes exactly these and builds them again.
const PREFIX = "CS-";

type Outcome = "PTP" | "CALLBACK" | "NOT_REACHABLE" | "PAID" | "WRONG_NUMBER";
type Stage = "TODAY" | "OVERDUE" | "FOLLOWUP" | "CLOSED";

// [stage, customer, agent email (null = unassigned), company, branch, days to next follow-up (null = none), outcome, dpd, overdue amount]
// TODAY: due today. OVERDUE: follow-up date already passed (shows in the Today tab). FOLLOWUP: date ahead. CLOSED: loan closed.
// DPD values cover every bucket (0-30, 31-60, 61-90, 90+).
const PLAN: [Stage, string, string | null, "AF" | "BLD" | "MF" | "MMPL", string, number | null, Outcome | null, number, number][] = [
  ["TODAY", "Anita Rathore", "agent1@example.com", "AF", "Balaghat", 0, "CALLBACK", 12, 3100],
  ["TODAY", "Bhola Prasad", "agent1@example.com", "AF", "Balaghat", 0, "PTP", 45, 5600],
  ["TODAY", "Chandni Verma", "agent2@example.com", "BLD", "Mandla", 0, "PTP", 68, 8200],
  ["TODAY", "Dinesh Kori", "field1@example.com", "AF", "Khairlanji", 0, "CALLBACK", 33, 4400],
  ["TODAY", "Esha Tiwari", null, "MF", "Seoni", 0, "CALLBACK", 8, 2100],
  ["OVERDUE", "Farhan Khan", "agent1@example.com", "AF", "Balaghat", -1, "NOT_REACHABLE", 52, 6300],
  ["OVERDUE", "Gita Meshram", "agent1@example.com", "AF", "Balaghat", -3, "NOT_REACHABLE", 95, 12400],
  ["OVERDUE", "Hemant Yadav", "agent2@example.com", "BLD", "Mandla", -2, "PTP", 74, 9100],
  ["OVERDUE", "Indu Bai", "agent2@example.com", "BLD", "Mandla", -5, "NOT_REACHABLE", 120, 15800],
  ["OVERDUE", "Jitendra Soni", "field1@example.com", "AF", "Khairlanji", -4, "WRONG_NUMBER", 61, 7000],
  ["OVERDUE", "Kavita Dhurve", null, "MMPL", "Raipur", -7, "NOT_REACHABLE", 29, 3600],
  ["FOLLOWUP", "Lalit Markam", "agent1@example.com", "AF", "Balaghat", 1, "PTP", 18, 2900],
  ["FOLLOWUP", "Mamta Sen", "agent1@example.com", "AF", "Balaghat", 3, "CALLBACK", 40, 5200],
  ["FOLLOWUP", "Naveen Jain", "agent2@example.com", "BLD", "Mandla", 2, "PTP", 83, 10300],
  ["FOLLOWUP", "Omkar Patle", "agent2@example.com", "BLD", "Mandla", 6, "CALLBACK", 105, 13900],
  ["FOLLOWUP", "Pooja Uikey", "field1@example.com", "AF", "Khairlanji", 4, "PTP", 27, 3300],
  ["FOLLOWUP", "Qasim Ali", null, "MF", "Chhindwara", 5, "CALLBACK", 57, 6800],
  ["CLOSED", "Rekha Dubey", "agent1@example.com", "AF", "Balaghat", null, "PAID", 0, 0],
  ["CLOSED", "Sanjay Bhalavi", "agent1@example.com", "AF", "Balaghat", null, "PAID", 0, 0],
  ["CLOSED", "Tara Netam", "agent2@example.com", "BLD", "Mandla", null, "PAID", 0, 0],
  ["CLOSED", "Umesh Baghel", "field1@example.com", "AF", "Khairlanji", null, "PAID", 0, 0],
  ["CLOSED", "Vandana Raut", null, "MMPL", "Raipur", null, "PAID", 0, 0],
];

// Dev/test data for the Cases page: 22 loans across all companies/branches, every DPD bucket and the Today (due today or overdue),
// Follow-up (future date) and Closed tabs, spread over three agents plus a few unassigned. Safe to re-run: the previous CS- loans are removed first.
export const seedCases = async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const agents = await prisma.user.findMany({ where: { email: { in: ["agent1@example.com", "agent2@example.com", "field1@example.com"] } }, select: { id: true, email: true } });
  if (!admin || agents.length === 0) {
    console.log("Cases skipped: run the main seed first (needs the admin and the agents).");
    return;
  }
  const agentByEmail = new Map(agents.map((a) => [a.email, a.id]));

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
  for (const [i, [stage, name, email, company, branch, inDays, outcome, dpd, overdue]] of PLAN.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const closed = stage === "CLOSED";
    const nextFollowUpOn = inDays === null ? null : toDbDate(addDays(today, inDays));
    const contactedAt = outcome ? new Date(Date.now() - (i + 1) * 3600_000) : null;
    const customer = await prisma.customer.create({
      data: { name, mobilePrimary: `97${String(22000000 + i * 173).padStart(8, "0")}`, mobileAlt: `80${String(5100000 + i * 97).padStart(8, "0")}`, area: branch, pin: "481001" },
    });
    const loan = await prisma.loan.create({
      data: {
        agreementNo: `${PREFIX}${stage}-${n}`,
        customerId: customer.id,
        company,
        branch,
        dpd,
        overdueAmount: overdue,
        emiAmount: 2500,
        pendingEmis: closed ? 0 : Math.max(1, Math.ceil(dpd / 30)),
        status: closed ? "CLOSED" : "ACTIVE",
        // Loan Overdue sheet fields (terms, dues and payments) so the Excel export has full rows.
        applicationNo: `APP${String(700100 + i)}`,
        agreementDate: toDbDate(addDays(today, -(dpd + 150))),
        disbursedOn: toDbDate(addDays(today, -(dpd + 145))),
        brand: ["Samsung", "Vivo", "Oppo", "Realme"][i % 4],
        productName: ["Galaxy A15", "Y28", "A58", "Narzo 60"][i % 4],
        lockStatus: closed ? "UNLOCKED" : dpd > 60 ? "LOCKED" : "UNLOCKED",
        lockStatusAt: dpd > 60 && !closed ? "23 Nov 2026 06:11 PM" : null,
        schemeName: "6 EMI Standard",
        loanAmount: 15000,
        totalRepaymentAmount: 16500,
        tenureMonths: 6,
        roi: 12,
        oldestOverdueEmiNo: closed ? null : Math.max(1, 6 - Math.ceil(dpd / 30)),
        oldestOverdueOn: closed ? null : toDbDate(addDays(today, -dpd)),
        penaltyCharges: closed ? 0 : Math.round(overdue * 0.05),
        otherDueCharges: 0,
        totalOutstanding: closed ? 0 : overdue + Math.round(overdue * 0.05),
        totalPaid: closed ? 16500 : 2500,
        lastPaymentOn: closed ? toDbDate(addDays(today, -10)) : toDbDate(addDays(today, -(dpd + 20))),
        lastOutcome: outcome,
        lastContactedAt: contactedAt,
        nextFollowUpOn,
      },
    });
    const agentId = email ? agentByEmail.get(email) : undefined;
    if (agentId) {
      await prisma.allocation.create({ data: { loanId: loan.id, activeLoanId: loan.id, agentId, assignedById: admin.id, assignedOn: new Date() } });
    }
    // One recorded outcome per contacted loan so its case page shows a history (needs an agent to attribute it to).
    if (outcome && contactedAt && agentId) {
      await prisma.disposition.create({
        data: {
          loanId: loan.id, agentId, outcome, createdAt: contactedAt, nextFollowUpOn,
          ptpDate: outcome === "PTP" ? nextFollowUpOn : null, ptpAmount: outcome === "PTP" ? 3000 : null,
          paidAmount: outcome === "PAID" ? 8000 : null, remarks: "Dummy cases data",
        },
      });
    }
  }
  console.log(`Seeded ${PLAN.length} dummy cases (5 due today, 6 overdue, 6 follow-up, 5 closed).`);
};
