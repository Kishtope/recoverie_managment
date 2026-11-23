import type { Prisma } from "@/generated/prisma/client";
import { addDays, toDbDate } from "@/lib/dates";

export const FOLLOW_UP_TABS = ["new", "today", "post", "closed"] as const;
export type FollowUpTab = (typeof FOLLOW_UP_TABS)[number];

// Prisma `where` for the four tabs of the agent's Follow-ups page, relative to `today` ("yyyy-MM-dd"):
// new = active cases nobody has contacted yet; today = active, contacted, and due today or earlier (still to be called);
// post = active, already called, next follow-up still ahead (or none); closed = closed loans.
// Unknown values add no condition.
export const followUpTabWhere = (tab: string | null | undefined, today: string): Prisma.LoanWhereInput => {
  const t = toDbDate(today);
  switch (tab) {
    case "new":
      return { status: "ACTIVE", lastContactedAt: null, nextFollowUpOn: null };
    case "today":
      return { status: "ACTIVE", nextFollowUpOn: { lte: t } };
    case "post":
      return { status: "ACTIVE", lastContactedAt: { not: null }, OR: [{ nextFollowUpOn: null }, { nextFollowUpOn: { gt: t } }] };
    case "closed":
      return { status: "CLOSED" };
    default:
      return {};
  }
};

// Prisma `where` for the Cases page tabs, relative to `today` (IST, "yyyy-MM-dd"). A case moves between tabs by its follow-up date alone:
// today = open, follow-up due today or earlier (not yet actioned); followup = open, follow-up date after today; closed = closed loans.
// "all" / unknown add no condition. Closed loans never match today or followup.
export const casesTabWhere = (stage: string | null | undefined, today: string): Prisma.LoanWhereInput => {
  const t = toDbDate(today);
  switch (stage) {
    case "today":
      return { status: "ACTIVE", nextFollowUpOn: { lte: t } };
    case "followup":
      return { status: "ACTIVE", nextFollowUpOn: { gt: t } };
    case "closed":
      return { status: "CLOSED" };
    default:
      return {};
  }
};

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
