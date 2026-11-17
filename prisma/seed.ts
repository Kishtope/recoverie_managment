import { prisma } from "../src/lib/prisma";
import { maskMobile } from "../src/lib/mask";
import { notificationKey } from "../src/lib/notifications";
import { paymentDedupeKey } from "../src/lib/imports/payments";
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
    role: "ADMIN" | "MANAGER" | "AGENCY_OWNER" | "AGENT",
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
  const agent3 = await upsert("field1@example.com", "Farah Agent", "AGENT", { hubUserId: "HUB-1003", reportsToId: manager.id, mobile: "9000000005", access: [["AF", "Khairlanji"]] });
  // Sample cases so the Cases page is not empty in dev: 12 loans, the first 9 allocated (3 each), the rest unassigned.
  const companyBranch: ["AF" | "BLD", string][] = [["AF", "Balaghat"], ["BLD", "Mandla"], ["AF", "Khairlanji"]];
  const holders = [
    { user: agent1, agencyId: null },
    { user: agent2, agencyId: agency.id },
    { user: agent3, agencyId: null },
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
  // Dummy payments (this and last month) and notifications so the manager dashboard, charts and the bell have data. Re-running is safe:
  // payments and notifications both carry a dedupe key, so duplicates are skipped.
  const seedLoan = async (n: number) => prisma.loan.findUnique({ where: { agreementNo: `SEED-${String(n).padStart(4, "0")}` } });
  const payRows: [number, number, number, string][] = [ // [loan no, days ago, amount, receipt]
    [8, 3, 20000, "R-S-1"], [2, 5, 1500, "R-S-2"], [4, 1, 2000, "R-S-3"], [1, 35, 800, "R-S-4"], [6, 2, 1200, "R-S-5"],
  ];
  for (const [n, daysAgo, amount, receiptNo] of payRows) {
    const loan = await seedLoan(n);
    if (!loan) continue;
    const paidOn = toDbDate(addDays(today, -daysAgo));
    await prisma.payment.createMany({
      data: [{ loanId: loan.id, amount, paidOn, mode: "UPI", receiptNo, dedupeKey: paymentDedupeKey(loan.id, paidOn, amount, receiptNo) }],
      skipDuplicates: true,
    });
  }
  const noteRows: [string, "FOLLOW_UP_DUE" | "PTP_DUE" | "ESCALATION", number][] = [
    [agent1.id, "PTP_DUE", 4], [agent1.id, "FOLLOW_UP_DUE", 1], [owner.id, "ESCALATION", 5],
  ];
  for (const [userId, type, n] of noteRows) {
    const loan = await seedLoan(n);
    if (!loan) continue;
    const item = { userId, type, loanId: loan.id, day: today };
    await prisma.notification.createMany({
      data: [{ userId, type, entity: "loan", entityId: loan.id, dedupeKey: notificationKey(item) }],
      skipDuplicates: true,
    });
  }

  // Dummy calls (provider MOCK) so Calls, History, Follow-ups "Missed calls" and the dashboard have data. Per agent: 2 answered and 1 missed
  // (each tied to an existing outcome, so nobody starts with a call waiting for an outcome), 1 failed, and 2 customer missed-calls (1 called back).
  for (const [h, holder] of holders.entries()) {
    const marker = `mock_seed_${h}_`;
    if ((await prisma.call.count({ where: { providerCallId: { startsWith: marker } } })) > 0) continue;
    const mine = await prisma.loan.findMany({
      where: { agreementNo: { in: [h + 1, h + 4, h + 7].map((n) => `SEED-${String(n).padStart(4, "0")}`) } },
      include: { customer: true },
      orderBy: { agreementNo: "asc" },
    });
    const [l0, l1] = mine;
    if (!l0 || !l1) continue;
    // Unlinked outcomes of this agent's cases, oldest first; NOT_REACHABLE ones are kept for the missed call.
    const pool = await prisma.disposition.findMany({ where: { agentId: holder.user.id, callId: null }, orderBy: { createdAt: "asc" } });
    const answered = pool.filter((d) => d.outcome !== "NOT_REACHABLE");
    let notReachable = pool.find((d) => d.outcome === "NOT_REACHABLE");
    // Seed-only: an agent with no "not reachable" outcome gets one history row (the loan's follow-up state is left alone).
    notReachable ??= await prisma.disposition.create({ data: { loanId: l0.id, agentId: holder.user.id, outcome: "NOT_REACHABLE", createdAt: new Date(Date.now() - 5 * 3600_000) } });
    const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000);
    const base = (k: number, loan: typeof l0, status: "CONNECTED" | "MISSED" | "FAILED", startedAt: Date, extra: object = {}) => ({
      provider: "MOCK" as const, providerCallId: `${marker}${k}`, direction: "OUTBOUND" as const, status, loanId: loan.id, agentId: holder.user.id,
      numberSlot: "primary", customerNumberMask: maskMobile(loan.customer.mobilePrimary), startedAt, ...extra,
    });
    const link = (dispositionId?: string) => (dispositionId ? { disposition: { connect: { id: dispositionId } } } : {});
    await prisma.call.create({ data: { ...base(1, l1, "CONNECTED", hoursAgo(6), { answeredAt: hoursAgo(6), endedAt: hoursAgo(6), durationSec: 45 }), ...link(answered[0]?.id) } });
    await prisma.call.create({ data: { ...base(2, l0, "CONNECTED", hoursAgo(4), { answeredAt: hoursAgo(4), endedAt: hoursAgo(4), durationSec: 180 }), ...link((answered[1] ?? pool.find((d) => d.outcome === "NOT_REACHABLE" && d.id !== notReachable.id))?.id) } });
    await prisma.call.create({ data: { ...base(3, l0, "MISSED", hoursAgo(5), { endedAt: hoursAgo(5) }), ...link(notReachable.id) } });
    await prisma.call.create({ data: base(4, l1, "FAILED", hoursAgo(3), { endedAt: hoursAgo(3), failureReason: "Agent did not pick up" }) });
    for (const [k, loan, resolved] of [[5, l0, true], [6, l1, false]] as const) {
      await prisma.call.create({
        data: {
          provider: "MOCK", providerCallId: `${marker}${k}`, direction: "INBOUND", status: "MISSED", loanId: loan.id, agentId: holder.user.id,
          customerNumberMask: maskMobile(loan.customer.mobilePrimary), startedAt: hoursAgo(k === 5 ? 8 : 2), endedAt: hoursAgo(k === 5 ? 8 : 2),
          callbackResolvedAt: resolved ? hoursAgo(7) : null,
        },
      });
    }
  }
  console.log("Seeded. Password for all users:", PASSWORD);
};

main().finally(() => prisma.$disconnect());
