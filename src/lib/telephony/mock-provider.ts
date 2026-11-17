import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { callEventSchema, type CallEvent, type TelephonyProvider } from "./types";

// Test provider: no network, no real calls. Same interface as the real one, so everything above it behaves identically.
export const mockProvider: TelephonyProvider = {
  name: "MOCK",

  // Pretends the provider accepted the call and hands back a fake id.
  startCall: async () => ({ providerCallId: `mock_${randomUUID()}` }),

  // Reads our own normalized JSON ({ events: [...] } or a single event), so a webhook can be tested with curl.
  parseWebhook: async (req) => {
    const body = await req.json();
    const list: unknown[] = Array.isArray(body?.events) ? body.events : [body];
    return list.map((item) => callEventSchema.parse(item));
  },

  // "Report" = our own calls for that day, so reconciling against the mock never finds anything missing.
  fetchCallReport: async (day) => {
    const from = new Date(`${day}T00:00:00+05:30`);
    const to = new Date(from.getTime() + 24 * 3600_000);
    const calls = await prisma.call.findMany({
      where: { provider: "MOCK", providerCallId: { not: null }, startedAt: { gte: from, lt: to } },
    });
    return calls.map<CallEvent>((c) => ({
      providerCallId: c.providerCallId as string,
      callId: c.id,
      direction: c.direction,
      status: c.status,
      answeredAt: c.answeredAt?.toISOString(),
      endedAt: c.endedAt?.toISOString(),
      durationSec: c.durationSec ?? undefined,
      recordingUrl: c.recordingUrl ?? undefined,
    }));
  },
};

