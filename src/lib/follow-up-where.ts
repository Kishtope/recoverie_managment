import type { Prisma } from "@/generated/prisma/client";
import { addDays, toDbDate } from "@/lib/dates";

// Prisma `where` on Loan.nextFollowUpOn for a follow-up filter ("today", "overdue", ...), relative to `today` ("yyyy-MM-dd").
// Unknown / "all" values add no condition. Shared by the cases list and the agent dashboard so their numbers always agree.
export const followUpWhere = (kind: string | null | undefined, today: string): Prisma.LoanWhereInput => {
  const t = toDbDate(today);
  switch (kind) {
    case "today":
      return { nextFollowUpOn: t };
    case "overdue":
      return { nextFollowUpOn: { lt: t } };
    case "upcoming":
      return { nextFollowUpOn: { gt: t } };
    case "next7":
      return { nextFollowUpOn: { gt: t, lte: toDbDate(addDays(today, 7)) } };
    case "none":
      return { nextFollowUpOn: null };
    default:
      return {};
  }
};
