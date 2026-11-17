import type { OutcomeCode } from "@/features/cases/types";

export type CallStatus = "INITIATED" | "CONNECTED" | "MISSED" | "FAILED";
export type CallDirection = "OUTBOUND" | "INBOUND";

// One call as the browser sees it. The customer's number is only ever the masked form.
export type CallItem = {
  id: string;
  provider: "MOCK" | "SARV";
  direction: CallDirection;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  numberSlot: string | null;
  numberMask: string | null;
  hasRecording: boolean;
  failureReason: string | null;
  callbackResolvedAt: string | null;
  loanId: string | null;
  customerName: string | null;
  agreementNo: string | null;
  overdueAmount: number | null;
  agent: { id: string; name: string } | null;
  // The outcome recorded for this call, and whether an outbound call is still waiting for one.
  dispositionId: string | null;
  outcome: OutcomeCode | null;
  needsOutcome: boolean;
};

export type CallListResponse = { items: CallItem[]; total: number; page: number; pageSize: number };

export type CallListQuery = {
  status: string;
  direction: string;
  date: string;
  agentId: string;
  callback: string;
  unmatched: string;
  q: string;
  page: number;
  pageSize: number;
};

// The agent's call that is waiting for an outcome (for the banner).
export type PendingCall = { id: string; loanId: string; customerName: string; status: CallStatus; startedAt: string };

export type StartCallInput = { loanId: string; numberSlot: "primary" | "alt" };
export type SimulateInput = { callId: string; result: "CONNECTED" | "MISSED" | "FAILED"; durationSec?: number };
