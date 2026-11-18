import { todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

// Outbound calls placed to this case since midnight IST. Failed attempts never reached the customer, so they do not count against the daily cap.
export const countCallsToday = (loanId: string, now: Date = new Date()) =>
  prisma.call.count({
    where: { loanId, direction: "OUTBOUND", status: { not: "FAILED" }, startedAt: { gte: new Date(`${todayIst(now)}T00:00:00+05:30`) } },
  });
