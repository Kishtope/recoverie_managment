import { expect, mock, test } from "bun:test";

// getSetting imports the Prisma client for its default argument; these tests always pass a fake, so the real client is never used.
mock.module("@/lib/prisma", () => ({ prisma: {} }));
const { getSetting } = await import("./settings");
const { isWithinCallingWindow, callingWindowMessage } = await import("./calling-window");

test("with no row in the database a setting is its default", async () => {
  const db = { appSetting: { findUnique: async () => null } };
  expect(await getSetting("followUp.notReachableTries", db)).toBe(3);
  expect(await getSetting("calling.window", db)).toEqual({ startHour: 9, endHour: 19 });
  expect(await getSetting("dashboard.monthlyTargetPct", db)).toBeNull();
});

test("a stored row wins over the default", async () => {
  const db = { appSetting: { findUnique: async () => ({ value: 5 }) } };
  expect(await getSetting("followUp.notReachableTries", db)).toBe(5);
});

test("the calling window follows a custom setting", () => {
  const window = { startHour: 10, endHour: 18 };
  expect(isWithinCallingWindow(new Date("2026-11-17T03:30:00Z"), window)).toBe(false); // 09:00 IST, before 10
  expect(isWithinCallingWindow(new Date("2026-11-17T04:30:00Z"), window)).toBe(true); // 10:00 IST
  expect(isWithinCallingWindow(new Date("2026-11-17T12:30:00Z"), window)).toBe(false); // 18:00 IST
  expect(callingWindowMessage(window)).toBe("Calls are allowed between 10 AM and 6 PM");
  expect(callingWindowMessage()).toBe("Calls are allowed between 9 AM and 7 PM");
});
