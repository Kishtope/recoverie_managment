// One agent's row in the team-performance table.
export type PerformanceRow = {
  agentId: string;
  name: string;
  calls: number; // outbound calls that finished
  connected: number;
  missed: number;
  failed: number;
  avgTalkSec: number | null;
  ptpTaken: number; // PTP outcomes recorded in the period
  ptpKept: number; // of those, promises paid in full inside their window
  inboundMissed: number;
  calledBack: number;
  callbackPct: number | null;
};

export type PerformanceResponse = { period: { fy: string; month: string; from: string; to: string }; items: PerformanceRow[] };
