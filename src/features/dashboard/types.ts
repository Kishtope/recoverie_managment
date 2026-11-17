// Numbers on the agent's home dashboard, all for the signed-in agent's own active cases.
export type AgentDashboard = {
  totalCases: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  duePtps: { count: number; amount: number }; // PTPs whose promised day is today
  dueAmount: number; // overdue ₹ across the agent's cases
  missedCallbacks: number; // customer missed-calls the agent has not called back yet
  callsToday: { connected: number; total: number }; // the agent's own outbound calls placed today (Indian day)
  collectedThisMonth: number; // sum of paidAmount from this month's PAID / PART_PAID outcomes (agent-reported)
};

// ---- Manager / agency owner / admin dashboards ----

// Filters of the team dashboard (kept in the URL). "all" / "" mean no filter.
export type TeamFilters = { fy: string; month: string; company: string; branch: string; agencyId: string; agentId: string; bucket: string };

export type TeamPeriod = { fy: string; month: string; from: string; to: string };

// Where "collected" came from: imported payments, or (until a payments file is imported for the period) outcomes agents reported.
export type CollectedSource = "payments" | "agent";

export type TeamSummary = {
  cases: number;
  dueAmount: number;
  paid: number;
  partPaid: number;
  callback: number;
  ptp: { total: number; upcoming: number; kept: number; broken: number };
  notReachableOrRefused: number;
  pending: number;
  spoke: number;
  notSpoke: number;
  collected: number;
  collectionPct: number | null;
};

export type TeamSummaryResponse = { period: TeamPeriod; summary: TeamSummary; collectedSource: CollectedSource; targetPct: number | null };

// One row of the user-wise table.
export type TeamUserRow = {
  agentId: string | null;
  name: string; // "Unassigned" when agentId is null
  allocated: number;
  spoke: number;
  notSpoke: number;
  paid: number;
  partPaid: number;
  ptp: number;
  pending: number;
  dueAmount: number;
  collected: number;
  pendingAmount: number;
  collectionPct: number | null;
};

export type TeamUsersResponse = { period: TeamPeriod; items: TeamUserRow[]; total: number; page: number; pageSize: number; collectedSource: CollectedSource };

export type TeamChartsResponse = {
  period: TeamPeriod;
  daily: { day: string; amount: number }[];
  dailyTarget: number | null; // the target spread evenly over the days of the period, or null when no target is set
  outcomes: { outcome: string; count: number }[];
  dpd: { bucket: string; cases: number; dueAmount: number }[];
};
