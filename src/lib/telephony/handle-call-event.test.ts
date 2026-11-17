import { expect, mock, test } from "bun:test";

// handleCallEvent imports the Prisma client for its default store; tests always pass a fake store, so the real client is never used.
mock.module("@/lib/prisma", () => ({ prisma: {} }));
const { handleCallEvent } = await import("./handle-call-event");
import type { CallEventStore, NewCall, StoredCall } from "./handle-call-event";

// In-memory stand-in for the database.
const makeStore = (numbers: Record<string, { loanId: string; agentId: string | null }> = {}) => {
  const rows: StoredCall[] = [];
  const store: CallEventStore = {
    findByProviderCallId: async (id) => rows.find((r) => r.providerCallId === id) ?? null,
    findById: async (id) => rows.find((r) => r.id === id) ?? null,
    create: async (data: NewCall) => {
      const row: StoredCall = { id: `c${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
    update: async (id, data) => {
      const row = rows.find((r) => r.id === id) as StoredCall;
      const fields: Record<string, unknown> = { ...data };
      delete fields.rawEvents;
      Object.assign(row, fields);
      return row;
    },
    findLoanByNumber: async (n) => numbers[n.replace(/\D/g, "").slice(-10)] ?? null,
  };
  return { rows, store };
};

test("the same provider event twice leaves one row and changes nothing the second time", async () => {
  const { rows, store } = makeStore();
  const event = { providerCallId: "p1", direction: "OUTBOUND" as const, status: "CONNECTED" as const, durationSec: 60 };
  expect((await handleCallEvent(event, store)).action).toBe("created");
  expect((await handleCallEvent(event, store)).action).toBe("unchanged");
  expect(rows).toHaveLength(1);
});

test("a late 'ringing' after 'connected' does not move the status back", async () => {
  const { rows, store } = makeStore();
  await handleCallEvent({ providerCallId: "p1", direction: "OUTBOUND", status: "CONNECTED", durationSec: 30 }, store);
  await handleCallEvent({ providerCallId: "p1", direction: "OUTBOUND", status: "INITIATED" }, store);
  expect(rows[0].status).toBe("CONNECTED");
  expect(rows[0].durationSec).toBe(30);
});

test("an event for our own call id fills in the row and stores the provider id", async () => {
  const { rows, store } = makeStore();
  rows.push({ id: "mine", providerCallId: null, status: "INITIATED", direction: "OUTBOUND", loanId: "L1", answeredAt: null, endedAt: null, durationSec: null, recordingUrl: null });
  const result = await handleCallEvent({ providerCallId: "p9", callId: "mine", direction: "OUTBOUND", status: "MISSED" }, store);
  expect(result.action).toBe("updated");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ providerCallId: "p9", status: "MISSED" });
});

test("an inbound missed call is matched by number to the loan and its allocated agent", async () => {
  const { rows, store } = makeStore({ "9800000001": { loanId: "L1", agentId: "A1" } });
  await handleCallEvent({ providerCallId: "in1", direction: "INBOUND", status: "MISSED", customerNumber: "+91 98000 00001" }, store);
  expect(rows[0]).toMatchObject({ loanId: "L1", direction: "INBOUND", status: "MISSED" });
  expect((rows[0] as unknown as { agentId: string }).agentId).toBe("A1");
});

test("a number matching no loan still saves the call, with no loan", async () => {
  const { rows, store } = makeStore();
  await handleCallEvent({ providerCallId: "in2", direction: "INBOUND", status: "MISSED", customerNumber: "9111111111" }, store);
  expect(rows).toHaveLength(1);
  expect(rows[0].loanId).toBeNull();
});
