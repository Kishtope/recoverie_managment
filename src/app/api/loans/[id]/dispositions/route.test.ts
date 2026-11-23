import { beforeEach, expect, mock, test } from "bun:test";

// Pending calls the fake database knows about; the route's lookup filters them by agent and (optionally) loan like Prisma would.
let pendingCalls: { id: string; loanId: string; agentId: string }[] = [];
const createdData: Record<string, unknown>[] = [];
const notified: Record<string, unknown>[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async () => ({ user: { id: "agent1", name: "Asha", role: "AGENT" } }),
  loanScopeWhere: () => ({}),
  ownCaseWhere: () => ({}),
}));
// Questions the fake database knows about (id -> text); the route only accepts active ones. Saved answers are collected here.
let activeQuestions: { id: string; text: string; category: string }[] = [];
const savedAnswers: Record<string, unknown>[] = [];
const tx = {
  customerQuestion: {
    findMany: async ({ where }: { where: { id: { in: string[] } } }) => activeQuestions.filter((q) => where.id.in.includes(q.id)),
  },
  interactionResponse: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => (savedAnswers.push(...data), { count: data.length }) },
  loan: {
    findFirst: async () => ({ status: "ACTIVE", notReachableCount: 0, fieldVisitFlag: false, escalatedAt: null, overdueAmount: { toNumber: () => 10000 } }),
    update: async () => ({}),
  },
  call: {
    findFirst: async ({ where }: { where: { agentId: string; loanId?: string } }) =>
      pendingCalls.find((c) => c.agentId === where.agentId && (!where.loanId || c.loanId === where.loanId)) ?? null,
  },
  user: { findUnique: async () => ({ reportsToId: "manager1" }) },
  notification: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => (notified.push(...data), { count: data.length }) },
  disposition: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      createdData.push(data);
      return { id: "d1", outcome: data.outcome, ptpDate: null, ptpAmount: null, paidAmount: null, nextFollowUpOn: null, remarks: null, createdAt: new Date(), callId: data.callId };
    },
  },
};
mock.module("@/lib/prisma", () => ({ prisma: { appSetting: { findUnique: async () => null }, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } }));
const { POST } = await import("./route");

const save = async (loanId: string) =>
  (await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ outcome: "WRONG_NUMBER", remarks: "Not the customer" }) }), { params: Promise.resolve({ id: loanId }) })) as Response;

beforeEach(() => {
  activeQuestions = [];
  savedAnswers.length = 0;
  pendingCalls = [];
  createdData.length = 0;
  notified.length = 0;
});

test("the agent's pending call on this case is linked to the outcome", async () => {
  pendingCalls = [{ id: "call1", loanId: "L1", agentId: "agent1" }];
  const res = await save("L1");
  expect(res.status).toBe(201);
  expect(createdData[0].callId).toBe("call1");
  expect((await res.json()).effects.callLinked).toBe(true);
});

test("a pending call on a different case is not linked", async () => {
  pendingCalls = [{ id: "call2", loanId: "L2", agentId: "agent1" }];
  const res = await save("L1");
  expect(createdData[0].callId).toBeNull();
  expect((await res.json()).effects.callLinked).toBe(false);
});

test("an outcome with no call at all still saves", async () => {
  expect((await save("L1")).status).toBe(201);
  expect(createdData[0].callId).toBeNull();
});

test("a refused / dispute outcome notifies the agent's manager in the same transaction; other outcomes notify nobody", async () => {
  const refused = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ outcome: "REFUSED_DISPUTE", remarks: "Disputes charges" }) }), { params: Promise.resolve({ id: "L1" }) });
  expect(refused?.status).toBe(201);
  expect(notified).toHaveLength(1);
  expect(notified[0]).toMatchObject({ userId: "manager1", type: "ESCALATION", entityId: "L1" });
  notified.length = 0;
  expect((await save("L1")).status).toBe(201); // WRONG_NUMBER
  expect(notified).toHaveLength(0);
});

const post = async (body: unknown) => (await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ remarks: "Spoke to the customer", ...(body as object) }) }), { params: Promise.resolve({ id: "L1" }) })) as Response;

test("customer answers are saved with the question text copied from the database, not from the client", async () => {
  activeQuestions = [{ id: "q1", text: "Why is your payment delayed?", category: "PAYMENT_DELAY_REASON" }];
  const res = await post({ outcome: "NOT_INTERESTED", questionText: "forged", responses: [{ questionId: "q1", response: "Facing financial difficulties", remarks: "Sounded sure" }] });
  expect(res.status).toBe(201);
  expect(savedAnswers).toEqual([
    { dispositionId: "d1", questionId: "q1", questionText: "Why is your payment delayed?", category: "PAYMENT_DELAY_REASON", response: "Facing financial difficulties", remarks: "Sounded sure", sortOrder: 0 },
  ]);
  expect((await res.json()).effects.answers).toBe(1);
});

test("an answer to a question that is no longer active is refused and nothing is saved", async () => {
  const res = await post({ outcome: "NOT_INTERESTED", responses: [{ questionId: "gone", response: "x" }] });
  expect(res.status).toBe(422);
  expect(createdData).toHaveLength(0);
  expect(savedAnswers).toHaveLength(0);
});

test("a part payment stores what is still unpaid and the follow-up date the agent chose", async () => {
  const res = await post({ outcome: "PART_PAID", paidAmount: 4000, paymentDate: "2020-01-01", nextFollowUpOn: "2099-01-01" });
  expect(res.status).toBe(201);
  expect(createdData[0]).toMatchObject({ outcome: "PART_PAID", paidAmount: 4000, remainingAmount: 6000 });
});

test("no outcome detail and an interaction with no answers still saves", async () => {
  const res = await post({ outcome: "NOT_REACHABLE", outcomeDetail: "BUSY" });
  expect(res.status).toBe(201);
  expect(createdData[0]).toMatchObject({ outcomeDetail: "BUSY" });
  expect(savedAnswers).toHaveLength(0);
});
