import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationsResponse } from "@/features/notifications/types";

// The caller's own latest notifications (newest first, up to 30) and how many are unread. Everyone sees only their own.
export const GET = async () => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: auth.user.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 30 }),
    prisma.notification.count({ where: { userId: auth.user.id, readAt: null } }),
  ]);
  // Notifications point at a loan by id only, so the customer's name comes from one extra query.
  const loans = await prisma.loan.findMany({
    where: { id: { in: [...new Set(rows.map((n) => n.entityId))] } },
    select: { id: true, agreementNo: true, customer: { select: { name: true } } },
  });
  const byId = new Map(loans.map((l) => [l.id, l]));

  const body: NotificationsResponse = {
    unread,
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      loanId: n.entityId,
      customerName: byId.get(n.entityId)?.customer.name ?? null,
      agreementNo: byId.get(n.entityId)?.agreementNo ?? null,
      createdAt: n.createdAt.toISOString(),
      read: n.readAt !== null,
    })),
  };
  return NextResponse.json(body);
};
