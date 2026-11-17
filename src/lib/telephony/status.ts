import type { CallStatus } from "@/generated/prisma/client";

// Maps a provider's own status text to our four statuses; anything unrecognised stays INITIATED (still ringing) so it can't wrongly finish a call.
// TODO(sarv): replace the guessed words below with Sarv's real event / status names (needs a real sample payload).
export const mapProviderStatus = (raw: string): CallStatus => {
  const s = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["connected", "answered", "completed", "success", "conversation"].includes(s)) return "CONNECTED";
  if (["missed", "noanswer", "unanswered", "busy", "cancelled", "canceled", "switchedoff", "notreachable"].includes(s)) return "MISSED";
  if (["failed", "error", "rejected", "agentnotanswered"].includes(s)) return "FAILED";
  return "INITIATED";
};

// Status never moves backwards: only an INITIATED call can change, and it can change once. A retried webhook or a late "ringing" changes nothing.
export const mergeCallStatus = (current: CallStatus, next: CallStatus): CallStatus => (current === "INITIATED" ? next : current);

// An outbound call that was answered or missed needs an outcome before the agent may call again; FAILED and still-ringing calls don't.
export const callNeedsOutcome = (call: { direction: "OUTBOUND" | "INBOUND"; status: CallStatus; hasDisposition: boolean }) =>
  call.direction === "OUTBOUND" && (call.status === "CONNECTED" || call.status === "MISSED") && !call.hasDisposition;
