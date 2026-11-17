import { z } from "zod";

// What every provider's webhook / call report is turned into, so the rest of the app never sees a provider's own field names.
// Dates are ISO strings; `customerNumber` is the real number and is only used server-side to match an inbound call to a loan.
export const callEventSchema = z.object({
  providerCallId: z.string().min(1),
  callId: z.string().optional(), // our own Call id, when the provider echoes it back
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  status: z.enum(["INITIATED", "CONNECTED", "MISSED", "FAILED"]),
  answeredAt: z.string().optional(),
  endedAt: z.string().optional(),
  durationSec: z.number().int().min(0).optional(),
  recordingUrl: z.string().optional(),
  customerNumber: z.string().optional(),
  failureReason: z.string().optional(),
});
export type CallEvent = z.infer<typeof callEventSchema>;

// The one thing the app needs from a telephony vendor. Swap the implementation (mock -> Sarv) without touching the rest of the app.
export type TelephonyProvider = {
  name: "MOCK" | "SARV";
  // Rings the agent first, then the customer; returns the provider's own id for the call.
  startCall: (args: { callId: string; agentNumber: string; customerNumber: string }) => Promise<{ providerCallId: string }>;
  // Turns an incoming webhook request into normalized events (a single request may carry several).
  parseWebhook: (req: Request) => Promise<CallEvent[]>;
  // Every call the provider has for one Indian calendar day ("yyyy-MM-dd"), used by the reconciliation job.
  fetchCallReport: (day: string) => Promise<CallEvent[]>;
};
