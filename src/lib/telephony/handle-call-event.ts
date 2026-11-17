import type { CallDirection, CallProvider, CallStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { maskMobile } from "@/lib/mask";
import { mergeCallStatus } from "./status";
import type { CallEvent } from "./types";

// The call fields handleCallEvent reads and writes.
export type StoredCall = {
  id: string;
  providerCallId: string | null;
  status: CallStatus;
  direction: CallDirection;
  loanId: string | null;
  answeredAt: Date | null;
  endedAt: Date | null;
  durationSec: number | null;
  recordingUrl: string | null;
};

export type CallUpdate = Partial<Omit<StoredCall, "id" | "direction">> & { rawEvents?: unknown };
export type NewCall = {
  provider: CallProvider;
  providerCallId: string;
  direction: CallDirection;
  status: CallStatus;
  loanId: string | null;
  agentId: string | null;
  customerNumberMask: string | null;
  answeredAt: Date | null;
  endedAt: Date | null;
  durationSec: number | null;
  recordingUrl: string | null;
  startedAt: Date;
};

// What handleCallEvent needs from the database. A small interface so tests can use an in-memory fake.
export type CallEventStore = {
  findByProviderCallId: (providerCallId: string) => Promise<StoredCall | null>;
  findById: (id: string) => Promise<StoredCall | null>;
  create: (data: NewCall) => Promise<StoredCall>;
  update: (id: string, data: CallUpdate) => Promise<StoredCall>;
  // The loan (and its currently allocated agent) a customer number belongs to, or null when no loan matches.
  findLoanByNumber: (number: string) => Promise<{ loanId: string; agentId: string | null } | null>;
};

// Parses an optional ISO string; a bad value is ignored rather than failing the whole event.
const toDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export type CallEventResult = { action: "created" | "updated" | "unchanged"; call: StoredCall };

/**
 * Applies one normalized provider event to our Call table. The webhook, the dev Simulate panel and the nightly reconciliation all
 * come through here, so they behave the same. Safe to repeat: the same event twice changes nothing, and a final status is never overwritten.
 * @param event Normalized event (see CallEvent).
 * @param store Database access (defaults to Prisma; tests pass a fake).
 * @param provider Which provider this event came from, recorded on rows created here.
 */
export const handleCallEvent = async (
  event: CallEvent,
  store: CallEventStore = prismaCallStore,
  provider: CallProvider = "MOCK",
): Promise<CallEventResult> => {
  // Our own row is found by the provider id, or by our call id (the webhook can arrive before startCall has saved the provider id).
  const existing = (await store.findByProviderCallId(event.providerCallId)) ?? (event.callId ? await store.findById(event.callId) : null);

  const answeredAt = toDate(event.answeredAt);
  const endedAt = toDate(event.endedAt);

  if (existing) {
    const status = mergeCallStatus(existing.status, event.status);
    const update: CallUpdate = {};
    if (!existing.providerCallId) update.providerCallId = event.providerCallId;
    if (status !== existing.status) update.status = status;
    // Details are filled in only once and only for the status the call really ended in (a late event must not rewrite them).
    if (status === event.status) {
      if (answeredAt && !existing.answeredAt) update.answeredAt = answeredAt;
      if (endedAt && !existing.endedAt) update.endedAt = endedAt;
      if (event.durationSec !== undefined && existing.durationSec === null) update.durationSec = event.durationSec;
      // Only an answered call has a recording.
      if (event.recordingUrl && status === "CONNECTED" && !existing.recordingUrl) update.recordingUrl = event.recordingUrl;
    }
    if (Object.keys(update).length === 0) return { action: "unchanged", call: existing };
    update.rawEvents = event;
    return { action: "updated", call: await store.update(existing.id, update) };
  }

  // Unknown call: an inbound call (customer calling the company number) or one the provider has but we never recorded.
  // TODO(sarv): confirm the company number (DID) customers call back on, and whether Sarv sends a webhook for inbound missed calls.
  const match = event.customerNumber ? await store.findLoanByNumber(event.customerNumber) : null;
  const call = await store.create({
    provider,
    providerCallId: event.providerCallId,
    direction: event.direction,
    status: event.status,
    loanId: match?.loanId ?? null,
    agentId: match?.agentId ?? null,
    customerNumberMask: maskMobile(event.customerNumber ?? null),
    answeredAt,
    endedAt,
    durationSec: event.durationSec ?? null,
    recordingUrl: event.status === "CONNECTED" ? (event.recordingUrl ?? null) : null,
    startedAt: answeredAt ?? new Date(),
  });
  return { action: "created", call };
};

// Last 10 digits, so "+91 98000 00001", "09800000001" and "9800000001" all compare equal.
export const normalizeNumber = (number: string) => number.replace(/\D/g, "").slice(-10);

const callSelect = {
  id: true, providerCallId: true, status: true, direction: true, loanId: true,
  answeredAt: true, endedAt: true, durationSec: true, recordingUrl: true,
} as const;

// The real store, backed by Prisma.
export const prismaCallStore: CallEventStore = {
  findByProviderCallId: (providerCallId) => prisma.call.findUnique({ where: { providerCallId }, select: callSelect }),
  findById: (id) => prisma.call.findUnique({ where: { id }, select: callSelect }),
  create: (data) => prisma.call.create({ data, select: callSelect }),
  update: (id, { rawEvents, ...data }) =>
    prisma.call.update({ where: { id }, data: { ...data, ...(rawEvents === undefined ? {} : { rawEvents: rawEvents as Prisma.InputJsonValue }) }, select: callSelect }),
  findLoanByNumber: async (number) => {
    const digits = normalizeNumber(number);
    if (digits.length < 10) return null;
    const customer = { OR: [{ mobilePrimary: { endsWith: digits } }, { mobileAlt: { endsWith: digits } }] };
    const select = { id: true, allocations: { where: { active: true }, take: 1, select: { agentId: true } } } as const;
    // Prefer a loan that is currently allocated to someone (that agent gets the callback), else any loan of that customer.
    const loan =
      (await prisma.loan.findFirst({ where: { customer, allocations: { some: { active: true } } }, orderBy: { updatedAt: "desc" }, select })) ??
      (await prisma.loan.findFirst({ where: { customer }, orderBy: { updatedAt: "desc" }, select }));
    return loan ? { loanId: loan.id, agentId: loan.allocations[0]?.agentId ?? null } : null;
  },
};
