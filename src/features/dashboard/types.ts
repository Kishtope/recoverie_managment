// Numbers on the agent's home dashboard, all for the signed-in agent's own active cases.
export type AgentDashboard = {
  totalCases: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  duePtps: { count: number; amount: number }; // PTPs whose promised day is today
  dueAmount: number; // overdue ₹ across the agent's cases
  collectedThisMonth: number; // sum of paidAmount from this month's PAID / PART_PAID outcomes (agent-reported)
};
