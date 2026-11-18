// The four tabs of the agent's Follow-ups page, in display order (mirrors FOLLOW_UP_TABS in lib/follow-up-where.ts).
export const FOLLOW_UP_TABS = ["new", "today", "post", "closed"] as const;
export type FollowUpTabValue = (typeof FOLLOW_UP_TABS)[number];

// Tab label and the one-line meaning shown under the tabs.
export const FOLLOW_UP_TAB_INFO: Record<FollowUpTabValue, { label: string; hint: string }> = {
  new: { label: "New", hint: "New customers nobody has called yet." },
  today: { label: "Today", hint: "Customers due for a call today (or earlier) that you have not called yet." },
  post: { label: "Post", hint: "Customers you have already called; the next call is still ahead." },
  closed: { label: "Closed", hint: "Closed cases." },
};
