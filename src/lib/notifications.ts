import type { NotificationType, Prisma } from "@/generated/prisma/client";

// Anything with a `notification` delegate: the Prisma client or a transaction client (so a notification can be written in the same
// transaction as the change it announces).
type NotifyDb = { notification: Prisma.TransactionClient["notification"] };

export type NewNotification = { userId: string; type: NotificationType; loanId: string; day: string };

// One notification per user, type, loan and day: the same event twice in a day (a job run twice, a double click) writes it once.
export const notificationKey = ({ userId, type, loanId, day }: NewNotification) => `${type}|${loanId}|${userId}|${day}`;

// Writes notifications, silently skipping any that already exist (same dedupe key). `day` is the Indian calendar day "yyyy-MM-dd".
// Returns how many were really new.
export const notify = async (db: NotifyDb, items: NewNotification[]) => {
  if (items.length === 0) return 0;
  const result = await db.notification.createMany({
    data: items.map((i) => ({ userId: i.userId, type: i.type, entity: "loan", entityId: i.loanId, dedupeKey: notificationKey(i) })),
    skipDuplicates: true,
  });
  return result.count;
};
