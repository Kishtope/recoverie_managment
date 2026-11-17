export type NotificationType = "FOLLOW_UP_DUE" | "PTP_DUE" | "ESCALATION" | "REASSIGNED";

// One notification as the bell shows it; the customer and agreement come from the loan it is about.
export type NotificationItem = {
  id: string;
  type: NotificationType;
  loanId: string;
  customerName: string | null;
  agreementNo: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationsResponse = { items: NotificationItem[]; unread: number };
