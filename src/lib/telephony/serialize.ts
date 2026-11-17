import type { Prisma } from "@/generated/prisma/client";
import type { CallItem } from "@/features/calls/types";
import { callNeedsOutcome } from "./status";

// Fields the browser-facing call shape needs; shared by every route that returns calls.
export const callItemSelect = {
  id: true, provider: true, direction: true, status: true, startedAt: true, answeredAt: true, endedAt: true, durationSec: true,
  numberSlot: true, customerNumberMask: true, recordingUrl: true, failureReason: true, callbackResolvedAt: true, loanId: true,
  loan: { select: { agreementNo: true, overdueAmount: true, customer: { select: { name: true } } } },
  agent: { select: { id: true, name: true } },
  disposition: { select: { id: true, outcome: true } },
} satisfies Prisma.CallSelect;

type CallRow = Prisma.CallGetPayload<{ select: typeof callItemSelect }>;

// Turns a database call row into the safe shape for the browser (masked number; the recording URL is reduced to a yes/no).
export const toCallItem = (c: CallRow): CallItem => ({
  id: c.id,
  provider: c.provider,
  direction: c.direction,
  status: c.status,
  startedAt: c.startedAt.toISOString(),
  answeredAt: c.answeredAt?.toISOString() ?? null,
  endedAt: c.endedAt?.toISOString() ?? null,
  durationSec: c.durationSec,
  numberSlot: c.numberSlot,
  numberMask: c.customerNumberMask,
  hasRecording: c.status === "CONNECTED" && !!c.recordingUrl,
  failureReason: c.failureReason,
  callbackResolvedAt: c.callbackResolvedAt?.toISOString() ?? null,
  loanId: c.loanId,
  customerName: c.loan?.customer.name ?? null,
  agreementNo: c.loan?.agreementNo ?? null,
  overdueAmount: c.loan?.overdueAmount?.toNumber() ?? null,
  agent: c.agent,
  dispositionId: c.disposition?.id ?? null,
  outcome: c.disposition?.outcome ?? null,
  needsOutcome: callNeedsOutcome({ direction: c.direction, status: c.status, hasDisposition: !!c.disposition }),
});
