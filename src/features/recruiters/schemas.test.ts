import { expect, test } from "bun:test";
import { assignCasesSchema, MAX_ASSIGN } from "./schemas";

test("a recruiter and a case count are enough; the filters are optional", () => {
  expect(assignCasesSchema.safeParse({ recruiterId: "r1", count: 25 }).success).toBe(true);
  expect(assignCasesSchema.safeParse({ recruiterId: "r1", count: 10, company: "AF", branch: "Balaghat", minDpd: 60 }).success).toBe(true);
});

test("rejects a missing recruiter, a zero or oversized count, and a bad branch", () => {
  expect(assignCasesSchema.safeParse({ recruiterId: "", count: 5 }).success).toBe(false);
  expect(assignCasesSchema.safeParse({ recruiterId: "r1", count: 0 }).success).toBe(false);
  expect(assignCasesSchema.safeParse({ recruiterId: "r1", count: MAX_ASSIGN + 1 }).success).toBe(false);
  expect(assignCasesSchema.safeParse({ recruiterId: "r1", count: 5, branch: "Nowhere" }).success).toBe(false);
});
