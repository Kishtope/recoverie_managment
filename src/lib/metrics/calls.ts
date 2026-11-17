// One call as the performance table counts it.
export type PerfCall = {
  direction: "OUTBOUND" | "INBOUND";
  status: "INITIATED" | "CONNECTED" | "MISSED" | "FAILED";
  durationSec: number | null;
  callbackResolvedAt: Date | null;
};

export type CallPerformance = {
  calls: number; // outbound calls that finished (connected + missed + failed)
  connected: number;
  missed: number;
  failed: number;
  avgTalkSec: number | null; // average duration of connected calls
  inboundMissed: number;
  calledBack: number;
  callbackPct: number | null; // calledBack / inboundMissed
};

// Team-performance numbers for one agent's calls. Calls still ringing are not counted. Pure.
export const callPerformance = (calls: PerfCall[]): CallPerformance => {
  const outbound = calls.filter((c) => c.direction === "OUTBOUND" && c.status !== "INITIATED");
  const connectedCalls = outbound.filter((c) => c.status === "CONNECTED");
  const talk = connectedCalls.filter((c) => c.durationSec !== null);
  const missedIn = calls.filter((c) => c.direction === "INBOUND" && c.status === "MISSED");
  const calledBack = missedIn.filter((c) => c.callbackResolvedAt !== null).length;
  return {
    calls: outbound.length,
    connected: connectedCalls.length,
    missed: outbound.filter((c) => c.status === "MISSED").length,
    failed: outbound.filter((c) => c.status === "FAILED").length,
    avgTalkSec: talk.length ? Math.round(talk.reduce((sum, c) => sum + (c.durationSec ?? 0), 0) / talk.length) : null,
    inboundMissed: missedIn.length,
    calledBack,
    callbackPct: missedIn.length ? Math.round((calledBack / missedIn.length) * 1000) / 10 : null,
  };
};
