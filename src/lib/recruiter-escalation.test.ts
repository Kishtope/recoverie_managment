import { beforeEach, expect, mock, test } from "bun:test";

// Fakes: one recruiter (reports to manager m1) holding two cases, and two callers in m1's team with different loads.
type Alloc = { id: string; loanId: string; agentId: string; assignedOn: Date; agent: { reportsToId: string }; loan: { lastOutcome: string | null; nextFollowUpOn: Date | null } };
let owned: Alloc[] = [];
let pendingFor: string | null = null;
const writes: { ended: string[]; created: { loanId: string; agentId: string }[]; notes: { userId: string; type: string }[]; audits: string[] } = { ended: [], created: [], notes: [], audits: [] };

const tx = {
  allocation: {
    update: async ({ where }: { where: { id: string } }) => void writes.ended.push(where.id),
    create: async ({ data }: { data: { loanId: string; agentId: string } }) => void writes.created.push(data),
  },
  notification: { createMany: async ({ data }: { data: { userId: string; type: string }[] }) => (writes.notes.push(...data), { count: data.length }) },
};
mock.module("@/lib/prisma", () => ({
  prisma: {
    allocation: { findMany: async () => owned },
    user: {
      findMany: async () => [
        { id: "c1", agencyId: null, reportsToId: "m1", _count: { allocations: 5 } },
        { id: "c2", agencyId: null, reportsToId: "m1", _count: { allocations: 1 } },
        { id: "c3", agencyId: null, reportsToId: "other", _count: { allocations: 0 } },
      ],
    },
    appSetting: { findMany: async () => [] }, // defaults: 10 days, remind 2 days before
    notification: tx.notification,
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void writes.audits.push(action) }));
mock.module("@/lib/telephony/pending", () => ({ findPendingCall: async (_db: unknown, agentId: string) => (pendingFor === agentId ? { id: "x" } : null) }));
const { runRecruiterEscalation } = await import("./recruiter-escalation");

const alloc = (id: string, assignedOn: string, loan: Alloc["loan"] = { lastOutcome: null, nextFollowUpOn: null }): Alloc => ({
  id, loanId: `L-${id}`, agentId: "r1", assignedOn: new Date(assignedOn), agent: { reportsToId: "m1" }, loan,
});

beforeEach(() => {
  owned = [];
  pendingFor = null;
  writes.ended.length = writes.created.length = writes.notes.length = writes.audits.length = 0;
});

// 12 Nov noon IST.
const NOW = new Date("2026-11-12T06:30:00Z");

test("past the limit the case moves to the least-loaded caller in the recruiter's team and is audited", async () => {
  owned = [alloc("a", "2026-11-01T06:00:00Z")]; // deadline 11 Nov, so overdue
  const r = await runRecruiterEscalation(NOW);
  expect(r).toMatchObject({ escalated: 1, stranded: 0 });
  expect(writes.ended).toEqual(["a"]);
  expect(writes.created).toEqual([expect.objectContaining({ loanId: "L-a", agentId: "c2" })]); // c2 has 1 case, c1 has 5, c3 is another team
  expect(writes.audits).toContain("loan.recruiter_escalation");
});

test("two days before the limit only a reminder is sent; the case stays", async () => {
  owned = [alloc("a", "2026-11-04T06:00:00Z")]; // deadline 14 Nov, 2 days left
  const r = await runRecruiterEscalation(NOW);
  expect(r).toMatchObject({ escalated: 0, reminded: 1 });
  expect(writes.notes).toEqual([expect.objectContaining({ userId: "r1", type: "RECRUITER_DEADLINE" })]);
  expect(writes.ended).toHaveLength(0);
});

test("an open promise dated after the limit keeps the case with the recruiter", async () => {
  owned = [alloc("a", "2026-11-01T06:00:00Z", { lastOutcome: "PTP", nextFollowUpOn: new Date("2026-11-15T00:00:00Z") })];
  expect((await runRecruiterEscalation(NOW)).escalated).toBe(0);
});

test("a recruiter who still owes a call outcome is skipped until the next run", async () => {
  owned = [alloc("a", "2026-11-01T06:00:00Z")];
  pendingFor = "r1";
  expect((await runRecruiterEscalation(NOW)).escalated).toBe(0);
});

test("a recruiter with no caller in their team leaves the case in place and reports it as stranded", async () => {
  owned = [{ ...alloc("a", "2026-11-01T06:00:00Z"), agent: { reportsToId: "nobody" } }];
  expect(await runRecruiterEscalation(NOW)).toMatchObject({ escalated: 0, stranded: 1 });
});
