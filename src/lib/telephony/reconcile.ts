import { STALE_CALL_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { handleCallEvent } from "./handle-call-event";
import { getTelephonyProvider } from "./index";

export type ReconcileSummary = { day: string; reported: number; created: number; updated: number; unchanged: number; staleFailed: number };

/**
 * Nightly safety net: pulls the provider's report for one day, feeds every call through handleCallEvent (filling calls we missed or
 * left half-finished) and marks INITIATED calls older than STALE_CALL_HOURS as FAILED so no agent stays blocked forever.
 * Used by POST /api/calls/reconcile and scripts/reconcile-calls.ts.
 * @param day Indian calendar day, "yyyy-MM-dd".
 */
export const reconcileCalls = async (day: string): Promise<ReconcileSummary> => {
  const provider = getTelephonyProvider();
  const events = await provider.fetchCallReport(day);
  const summary: ReconcileSummary = { day, reported: events.length, created: 0, updated: 0, unchanged: 0, staleFailed: 0 };
  for (const event of events) {
    const { action } = await handleCallEvent(event, undefined, provider.name);
    summary[action] += 1;
  }
  const cutoff = new Date(Date.now() - STALE_CALL_HOURS * 3600_000);
  const stale = await prisma.call.updateMany({
    where: { status: "INITIATED", startedAt: { lt: cutoff } },
    data: { status: "FAILED", failureReason: "No result from the provider (timed out)", endedAt: new Date() },
  });
  summary.staleFailed = stale.count;
  return summary;
};
