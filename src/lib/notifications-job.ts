import { todayIst } from "@/lib/dates";
import { notify, type NewNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

// Which notification a loan due today produces: a promise to pay that falls due today is a PTP_DUE, anything else a FOLLOW_UP_DUE.
export const dueNotificationType = (lastOutcome: string | null) => (lastOutcome === "PTP" ? ("PTP_DUE" as const) : ("FOLLOW_UP_DUE" as const));

/**
 * The morning job: tells each agent which of their active cases are due today (follow-ups and promises to pay). Safe to run twice
 * in a day: the dedupe key makes the second run write nothing. Used by POST /api/notifications/generate and scripts/generate-notifications.ts.
 * @param day Indian calendar day "yyyy-MM-dd" (default today).
 */
export const generateDueNotifications = async (day: string = todayIst()) => {
  const loans = await prisma.loan.findMany({
    where: { status: "ACTIVE", nextFollowUpOn: new Date(`${day}T00:00:00.000Z`), allocations: { some: { active: true, agentId: { not: null } } } },
    select: { id: true, lastOutcome: true, allocations: { where: { active: true }, take: 1, select: { agentId: true } } },
  });
  const items: NewNotification[] = loans.flatMap((l) => {
    const userId = l.allocations[0]?.agentId;
    return userId ? [{ userId, type: dueNotificationType(l.lastOutcome), loanId: l.id, day }] : [];
  });
  const created = await notify(prisma, items);
  return { day, due: items.length, created };
};
