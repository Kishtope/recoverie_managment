import { logAudit } from "@/lib/audit";
import { fromDbDate, todayIst } from "@/lib/dates";
import { notify, type NewNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { needsDeadlineReminder, recruiterDeadline } from "@/lib/recruiter-deadline";
import { getAllSettings } from "@/lib/settings";
import { findPendingCall } from "@/lib/telephony/pending";

// Daily recruiter job (project.md "Recruiter escalation rule"): reminds a recruiter a couple of days before their time on a case runs out,
// and when it has run out without full payment hands the case to the least-loaded active caller in the recruiter's team. The recruiter keeps
// read access, the call and outcome history moves with the case, and every move is audited. Safe to run twice in a day: reminders are
// de-duplicated and an escalated case is no longer the recruiter's.
export const runRecruiterEscalation = async (now: Date = new Date()) => {
  const today = todayIst(now);
  const settings = await getAllSettings();
  const limit = settings["recruiter.escalationDays"];
  const reminderDays = settings["recruiter.reminderDays"];

  const [owned, callers] = await Promise.all([
    prisma.allocation.findMany({
      where: { active: true, agent: { role: "RECRUITER", status: "ACTIVE" }, loan: { status: "ACTIVE" } },
      select: {
        id: true, loanId: true, agentId: true, assignedOn: true,
        agent: { select: { reportsToId: true } },
        loan: { select: { lastOutcome: true, nextFollowUpOn: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "AGENT", status: "ACTIVE" },
      select: { id: true, agencyId: true, reportsToId: true, _count: { select: { allocations: { where: { active: true } } } } },
    }),
  ]);

  // Running load per caller so a burst of escalations spreads out instead of landing on one person.
  const load = new Map(callers.map((c) => [c.id, c._count.allocations]));
  const reminders: NewNotification[] = [];
  let escalated = 0;
  let stranded = 0;

  for (const a of owned) {
    if (!a.agentId) continue;
    // An open promise keeps the timer running until its date.
    const promisedFor = a.loan.lastOutcome === "PTP" || a.loan.lastOutcome === "PART_PAID" ? fromDbDate(a.loan.nextFollowUpOn) : null;
    const d = recruiterDeadline(a.assignedOn, limit, today, promisedFor);

    if (needsDeadlineReminder(d, reminderDays)) reminders.push({ userId: a.agentId, type: "RECRUITER_DEADLINE", loanId: a.loanId, day: today });
    if (!d.overdue) continue;

    // Not while the recruiter still owes the outcome of a call on this case: they could no longer record it after the move.
    if (await findPendingCall(prisma, a.agentId, a.loanId)) continue;

    const team = callers.filter((c) => a.agent?.reportsToId && c.reportsToId === a.agent.reportsToId);
    const target = team.sort((x, y) => (load.get(x.id) ?? 0) - (load.get(y.id) ?? 0))[0];
    if (!target) {
      stranded++;
      continue;
    }
    load.set(target.id, (load.get(target.id) ?? 0) + 1);

    await prisma.$transaction(async (tx) => {
      await tx.allocation.update({ where: { id: a.id }, data: { active: false, activeLoanId: null, endedAt: now, endReason: "RECRUITER_ESCALATION" } });
      await tx.allocation.create({
        data: { loanId: a.loanId, activeLoanId: a.loanId, agentId: target.id, agencyId: target.agencyId, assignedById: null, assignedOn: now },
      });
      await notify(tx, [{ userId: target.id, type: "REASSIGNED", loanId: a.loanId, day: today }]);
    });
    await logAudit("system", "loan.recruiter_escalation", "Loan", a.loanId, { from: a.agentId, to: target.id, limitDays: limit });
    escalated++;
  }

  const reminded = await notify(prisma, reminders);
  return { day: today, escalated, stranded, reminded };
};
