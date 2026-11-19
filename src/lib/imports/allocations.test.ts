import { expect, test } from "bun:test";
import { planAllocationChanges, type PlanInput } from "./allocations";

const now = new Date("2026-11-17T00:00:00Z");
const row = (n: number, agreementNo: string, agentEmail?: string, extra = {}) => ({ row: n, data: { agreementNo, agentEmail, ...extra } });

// Loans L1..L3; agents h1@x.com (u1), h2@x.com (u2, agency a1), hd@x.com (disabled), hm@x.com (manager). L2 is active with u1.
const input = (rows: PlanInput["rows"]): PlanInput => ({
  rows,
  now,
  loans: new Map([["L1", "l1"], ["L2", "l2"], ["L3", "l3"]]),
  users: new Map([
    ["h1@x.com", { id: "u1", role: "AGENT", status: "ACTIVE", agencyId: null }],
    ["h2@x.com", { id: "u2", role: "AGENT", status: "ACTIVE", agencyId: "a1" }],
    ["hd@x.com", { id: "u3", role: "AGENT", status: "DISABLED", agencyId: null }],
    ["hm@x.com", { id: "u4", role: "MANAGER", status: "ACTIVE", agencyId: null }],
  ]),
  agencies: new Map([["ajay agency", "a1"]]),
  active: new Map([["l2", { id: "al2", agentId: "u1", validTill: null }]]),
});

test("new case is created; same agent is unchanged; other agent reassigns (old one closed)", () => {
  const plan = planAllocationChanges(input([row(2, "L1", "h1@x.com"), row(3, "L2", "h1@x.com"), row(4, "L2", "h2@x.com")]));
  expect(plan.actions.map((a) => a.kind)).toEqual(["create", "reassign"]);
  expect(plan.unchanged).toBe(1);
  expect(plan.actions[1]).toMatchObject({ kind: "reassign", closeId: "al2", agentId: "u2", agencyId: "a1", loanId: "l2" });
});

test("blank agent email closes an active allocation; nothing to close is unchanged", () => {
  const plan = planAllocationChanges(input([row(2, "L2"), row(3, "L3")]));
  expect(plan.actions).toEqual([{ kind: "close", row: 2, agreementNo: "L2", allocationId: "al2" }]);
  expect(plan.unchanged).toBe(1);
});

test("same agent with a new valid-till date updates it", () => {
  const plan = planAllocationChanges(input([row(2, "L2", "h1@x.com", { validTill: new Date("2026-12-31T00:00:00Z") })]));
  expect(plan.actions[0]).toMatchObject({ kind: "set-valid-till", allocationId: "al2" });
});

test("unmatched rows become errors with a reason, never silent skips", () => {
  const plan = planAllocationChanges(
    input([row(2, "NOPE", "h1@x.com"), row(3, "L1", "h9@x.com"), row(4, "L1", "hd@x.com"), row(5, "L1", "hm@x.com"), row(6, "L1", "h1@x.com", { agency: "Ghost" })]),
  );
  expect(plan.actions).toEqual([]);
  expect(plan.errors.map((e) => e.reason)).toEqual([
    "Loan not found; import Loans first",
    "No app user with email h9@x.com",
    "User hd@x.com is disabled",
    "User hm@x.com has a role that cannot hold cases",
    'Agency "Ghost" not found',
  ]);
  expect(plan.errors[1].agentEmail).toBe("h9@x.com"); // lets the Imports page list agent emails that need an account
});
