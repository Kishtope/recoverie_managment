import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { addDays, toDbDate, todayIst } from "../src/lib/dates";
import { planDispositionEffects, type DispositionInput } from "../src/lib/dispositions";

// Dev/test data: one user of each role, one agency, branches spread out. Safe to re-run (upserts by email).
const PASSWORD = process.env.SEED_USER_PASSWORD || "ChangeMe123!";

const main = async () => {
  const passwordHash = await hashPassword(PASSWORD);
  const upsert = async (
    email: string,
    name: string,
    role: "ADMIN" | "MANAGER" | "AGENCY_OWNER" | "AGENT" | "FIELD_AGENT",
    extra: { reportsToId?: string; agencyId?: string; mobile?: string; hubUserId?: string; access: [("AF" | "BLD" | "MF" | "MMPL"), string][] },
  ) => {
    const { access, ...rest } = extra;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role, ...rest },
      create: { email, name, role, passwordHash, ...rest },
    });
    await prisma.userAccess.deleteMany({ where: { userId: user.id } });
    await prisma.userAccess.createMany({ data: access.map(([company, branch]) => ({ userId: user.id, company, branch })) });
    return user;
  };

  const admin = await upsert(process.env.SEED_USER_EMAIL || "admin@example.com", process.env.SEED_USER_NAME || "Admin", "ADMIN", { access: [] });
  const manager = await upsert("manager@example.com", "Meera Manager", "MANAGER", {
    reportsToId: admin.id, mobile: "9000000001", access: [["AF", "Balaghat"], ["AF", "Khairlanji"]],
  });
  const owner = await upsert("ajay@example.com", "Ajay (Agency owner)", "AGENCY_OWNER", {
    reportsToId: manager.id, mobile: "9000000002", access: [["BLD", "Mandla"]],
  });
  const agency = await prisma.agency.upsert({
    where: { name: "Ajay Agency" },
    update: { ownerUserId: owner.id },
    create: { name: "Ajay Agency", ownerUserId: owner.id },
  });
  await prisma.user.update({ where: { id: owner.id }, data: { agencyId: agency.id } });
  const agent1 = await upsert("agent1@example.com", "Asha Agent", "AGENT", { hubUserId: "HUB-1001", reportsToId: manager.id, mobile: "9000000003", access: [["AF", "Balaghat"]] });
  const agent2 = await upsert("agent2@example.com", "Arun Agent", "AGENT", { hubUserId: "HUB-1002", reportsToId: owner.id, agencyId: agency.id, mobile: "9000000004", access: [["BLD", "Mandla"]] });
  const field1 = await upsert("field1@example.com", "Farah Field", "FIELD_AGENT", { hubUserId: "HUB-1003", reportsToId: manager.id, mobile: "9000000005", access: [["AF", "Khairlanji"]] });
  // Sample cases so the Cases page is not empty in dev: 12 loans, the first 9 allocated (3 each), the rest unassigned.
  const companyBranch: ["AF" | "BLD", string][] = [["AF", "Balaghat"], ["BLD", "Mandla"], ["AF", "Khairlanji"]];
  const holders = [
    { user: agent1, agencyId: null },
    { user: agent2, agencyId: agency.id },
    { user: field1, agencyId: null },
  ];
  for (let i = 1; i <= 12; i++) {
    const [company, branch] = companyBranch[i % 3];
    const agreementNo = `SEED-${String(i).padStart(4, "0")}`;
    let loan = await prisma.loan.findUnique({ where: { agreementNo } });
    if (!loan) {
      const customer = await prisma.customer.create({
        data: { name: `Customer ${i}`, mobilePrimary: `98000000${String(i).padStart(2, "0")}`, area: branch, pin: "481001" },
      });
      loan = await prisma.loan.create({
        data: { agreementNo, customerId: customer.id, company, branch, dpd: i * 9, overdueAmount: i * 2500, emiAmount: 2500, pendingEmis: i },
      });
    }
    if (i <= 9) {
      const holder = holders[(i - 1) % 3];
      const hasActive = await prisma.allocation.findFirst({ where: { loanId: loan.id, active: true } });
      if (!hasActive) {
        await prisma.allocation.create({
          data: { loanId: loan.id, activeLoanId: loan.id, agentId: holder.user.id, agencyId: holder.agencyId, assignedById: admin.id, assignedOn: new Date() },
        });
      }
    }
  }

  // Sample outcomes so My cases, Follow-ups and the agent dashboard show something in dev. Runs only for loans with no outcomes yet.
  // Each step goes through the same planDispositionEffects the API uses, so the loan's follow-up state matches its history.
  const today = todayIst();
  type Step = DispositionInput & { ptpAmount?: number; paidAmount?: number; remarks?: string };
  const scripted: { n: number; holder: number; steps: Step[] }[] = [
    { n: 1, holder: 0, steps: [{ outcome: "NOT_REACHABLE", nextFollowUpOn: addDays(today, -2) }, { outcome: "NOT_REACHABLE", nextFollowUpOn: addDays(today, -1) }] }, // overdue
    { n: 4, holder: 0, steps: [{ outcome: "PTP", ptpDate: today, ptpAmount: 5000 }] }, // PTP due today
    { n: 7, holder: 0, steps: [{ outcome: "CALLBACK", nextFollowUpOn: addDays(today, 3) }] }, // upcoming
    { n: 2, holder: 1, steps: [{ outcome: "PART_PAID", paidAmount: 1500, nextFollowUpOn: addDays(today, 1) }] },
    { n: 5, holder: 1, steps: [{ outcome: "REFUSED_DISPUTE", remarks: "Customer disputes the charges" }] }, // escalated
    { n: 8, holder: 1, steps: [{ outcome: "PAID", paidAmount: 20000 }] },
    { n: 3, holder: 2, steps: [{ outcome: "NOT_REACHABLE" }, { outcome: "NOT_REACHABLE" }, { outcome: "NOT_REACHABLE" }] }, // field visit flag
    { n: 6, holder: 2, steps: [{ outcome: "WRONG_NUMBER", remarks: "Number belongs to someone else" }] },
  ];
  for (const { n, holder, steps } of scripted) {
    const loan = await prisma.loan.findUnique({ where: { agreementNo: `SEED-${String(n).padStart(4, "0")}` } });
    if (!loan || (await prisma.disposition.count({ where: { loanId: loan.id } })) > 0) continue;
    let state = { notReachableCount: loan.notReachableCount, fieldVisitFlag: loan.fieldVisitFlag, escalatedAt: loan.escalatedAt };
    for (const [i, step] of steps.entries()) {
      const at = new Date(Date.now() - (steps.length - i) * 3600_000);
      const next = planDispositionEffects(state, step, at);
      await prisma.disposition.create({
        data: {
          loanId: loan.id, agentId: holders[holder].user.id, outcome: step.outcome, createdAt: at,
          ptpDate: step.ptpDate ? toDbDate(step.ptpDate) : null, ptpAmount: step.ptpAmount ?? null, paidAmount: step.paidAmount ?? null,
          nextFollowUpOn: next.nextFollowUpOn ? toDbDate(next.nextFollowUpOn) : null, remarks: step.remarks ?? null,
        },
      });
      await prisma.loan.update({
        where: { id: loan.id },
        data: { ...next, nextFollowUpOn: next.nextFollowUpOn ? toDbDate(next.nextFollowUpOn) : null },
      });
      state = next;
    }
  }
  console.log("Seeded. Password for all users:", PASSWORD);
};

main().finally(() => prisma.$disconnect());
