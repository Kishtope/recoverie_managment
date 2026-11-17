import { expect, test } from "bun:test";
import { addDays, monthStart, todayIst } from "./dates";

test("'today' is the Indian day: 23:59 and 00:01 IST fall on different days", () => {
  expect(todayIst(new Date("2026-11-17T18:29:00.000Z"))).toBe("2026-11-17"); // 23:59 IST
  expect(todayIst(new Date("2026-11-17T18:31:00.000Z"))).toBe("2026-11-18"); // 00:01 IST next day
});

test("addDays crosses month ends and monthStart gives the 1st", () => {
  expect(addDays("2026-11-28", 5)).toBe("2026-12-03");
  expect(monthStart("2026-11-17")).toBe("2026-11-01");
});
