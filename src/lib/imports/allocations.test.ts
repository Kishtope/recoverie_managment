import { expect, test } from "bun:test";
import { planAllocationChanges, type PlanInput } from "./allocations";

const now = new Date("2026-11-17T00:00:00Z");
const row = (n: number, agreementNo: string, hubUserId?: string, extra = {}) => ({ row: n, data: { agreementNo, hubUserId, ...extra } });

// Loans L1..L3; hub users H1 (u1), H2 (u2, agency a1), HD (disabled), HM (manager). L2 is active with u1.
const input = (rows: PlanInput["rows"]): PlanInput => ({
  rows,
  now,
  loans: new Map([["L1", "l1"], ["L2", "l2"], ["L3", "l3"]]),
  users: new Map([
    ["H1", { id: "u1", role: "AGENT", status: "ACTIVE", agencyId: null }],
    ["H2", { id: "u2", role: "AGENT", status: "ACTIVE", agencyId: "a1" }],
    ["HD", { id: "u3", role: "AGENT", status: "DISABLED", agencyId: null }],
    ["HM", { id: "u4", role: "MANAGER", status: "ACTIVE", agencyId: null }],
  ]),
  agencies: new Map([["ajay agency", "a1"]]),
  active: new Map([["l2", { id: "al2", agentId: "u1", validTill: null }]]),
});

test("new case is created; same agent is unchanged; other agent reassigns (old one closed)", () => {
  const plan = planAllocationChanges(input([row(2, "L1", "H1"), row(3, "L2", "H1"), row(4, "L2", "H2")]));
  expect(plan.actions.map((a) => a.kind)).toEqual(["create", "reassign"]);
  expect(plan.unchanged).toBe(1);
  expect(plan.actions[1]).toMatchObject({ kind: "reassign", closeId: "al2", agentId: "u2", agencyId: "a1", loanId: "l2" });
});

test("blank hub user closes an active allocation; nothing to close is unchanged", () => {
  const plan = planAllocationChanges(input([row(2, "L2"), row(3, "L3")]));
  expect(plan.actions).toEqual([{ kind: "close", row: 2, agreementNo: "L2", allocationId: "al2" }]);
  expect(plan.unchanged).toBe(1);
});

test("same agent with a new valid-till date updates it", () => {
  const plan = planAllocationChanges(input([row(2, "L2", "H1", { validTill: new Date("2026-12-31T00:00:00Z") })]));
  expect(plan.actions[0]).toMatchObject({ kind: "set-valid-till", allocationId: "al2" });
});

test("unmatched rows become errors with a reason, never silent skips", () => {
  const plan = planAllocationChanges(
    input([row(2, "NOPE", "H1"), row(3, "L1", "H9"), row(4, "L1", "HD"), row(5, "L1", "HM"), row(6, "L1", "H1", { agency: "Ghost" })]),
  );
  expect(plan.actions).toEqual([]);
  expect(plan.errors.map((e) => e.reason)).toEqual([
    "Loan not found; import Loans first",
    "Hub user H9 has no app account",
    "Hub user HD is disabled",
    "Hub user HM has a role that cannot hold cases",
    'Agency "Ghost" not found',
  ]);
  expect(plan.errors[1].hubUserId).toBe("H9"); // lets the Imports page list hub users that need an account
});
