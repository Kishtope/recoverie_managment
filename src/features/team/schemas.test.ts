import { expect, test } from "bun:test";
import { createUserSchema } from "./schemas";

const valid = { name: "Asha", email: "a@x.com", password: "password1", role: "AGENT", access: [] };

test("non-admin without reportsToId is rejected (API returns 400)", () => {
  const r = createUserSchema.safeParse(valid);
  expect(r.success).toBe(false);
  expect(!r.success && r.error.issues[0].path).toEqual(["reportsToId"]);
});

test("admin needs no reportsToId; non-admin with one passes", () => {
  expect(createUserSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(true);
  expect(createUserSchema.safeParse({ ...valid, reportsToId: "m1" }).success).toBe(true);
});
