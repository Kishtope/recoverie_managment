import { expect, test } from "bun:test";
import { planAllocation, summarizePlan, type PlanAgent, type PlanLoan } from "./allocation-plan";

const loan = (id: string, dpd: number | null, overdueAmount = 1000, branch = "Balaghat"): PlanLoan => ({ id, dpd, overdueAmount, company: "AF", branch });
const agent = (id: string, load = 0, branches: string[] = ["AF|Balaghat"]): PlanAgent => ({ id, load, branches });

test("equal count deals cases out evenly and counts what people already hold", () => {
  const loans = Array.from({ length: 6 }, (_, i) => loan(`L${i}`, 10));
  const plan = planAllocation(loans, [agent("a", 0), agent("b", 2)], "EQUAL");
  const per = (id: string) => plan.assignments.filter((x) => x.agentId === id).length;
  expect(per("a")).toBe(4); // a starts at 0, b at 2: both end at 4 and 4
  expect(per("b")).toBe(2);
});

test("bucket rule gives each person an equal share of every bucket", () => {
  const loans = [...["L1", "L2", "L3", "L4"].map((id) => loan(id, 100)), ...["M1", "M2", "M3", "M4"].map((id) => loan(id, 5))];
  const plan = planAllocation(loans, [agent("a"), agent("b")], "BUCKET");
  const s = summarizePlan(plan, loans);
  expect(s.get("a")?.buckets["90+"]).toBe(2);
  expect(s.get("b")?.buckets["90+"]).toBe(2);
  expect(s.get("a")?.buckets["0-30"]).toBe(2);
});

test("branch rule only uses people with access and leaves the rest unassigned", () => {
  const loans = [loan("L1", 10, 1000, "Balaghat"), loan("L2", 10, 1000, "Mandla")];
  const plan = planAllocation(loans, [agent("a", 0, ["AF|Balaghat"]), agent("b", 0, ["AF|Balaghat"])], "BRANCH");
  expect(plan.assignments).toHaveLength(1);
  expect(plan.unassigned).toEqual(["L2"]);
});

test("amount rule balances the total overdue, biggest cases first", () => {
  const loans = [loan("L1", 10, 9000), loan("L2", 10, 5000), loan("L3", 10, 4000)];
  const plan = planAllocation(loans, [agent("a"), agent("b")], "AMOUNT");
  const s = summarizePlan(plan, loans);
  expect(s.get("a")?.amount).toBe(9000);
  expect(s.get("b")?.amount).toBe(9000);
});

test("with nobody to allocate to everything stays unassigned; the plan is repeatable", () => {
  expect(planAllocation([loan("L1", 1)], [], "EQUAL").unassigned).toEqual(["L1"]);
  const loans = [loan("L1", 1), loan("L2", 2), loan("L3", 3)];
  expect(planAllocation(loans, [agent("a"), agent("b")], "EQUAL")).toEqual(planAllocation(loans, [agent("a"), agent("b")], "EQUAL"));
});
