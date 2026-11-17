import { expect, test } from "bun:test";
import { isWithinCallingWindow, nextWindowStart } from "./calling-window";

// IST is UTC+05:30, so 08:59 IST = 03:29 UTC. All times below are written in UTC with the IST wall time in the name.
const at = (utc: string) => new Date(utc);

test("window edges in IST: 08:59 closed, 09:00 open, 18:59 open, 19:00 closed", () => {
  expect(isWithinCallingWindow(at("2026-11-17T03:29:00Z"))).toBe(false); // 08:59 IST
  expect(isWithinCallingWindow(at("2026-11-17T03:30:00Z"))).toBe(true); // 09:00 IST
  expect(isWithinCallingWindow(at("2026-11-17T13:29:00Z"))).toBe(true); // 18:59 IST
  expect(isWithinCallingWindow(at("2026-11-17T13:30:00Z"))).toBe(false); // 19:00 IST
});

test("uses Indian time even when the UTC date differs (late night IST is the next UTC day's morning)", () => {
  expect(isWithinCallingWindow(at("2026-11-16T20:00:00Z"))).toBe(false); // 01:30 IST
  expect(isWithinCallingWindow(at("2026-11-17T05:00:00Z"))).toBe(true); // 10:30 IST
});

test("nextWindowStart: now when open, 09:00 IST today before opening, tomorrow 09:00 IST after closing", () => {
  const open = at("2026-11-17T06:00:00Z");
  expect(nextWindowStart(open)).toEqual(open);
  expect(nextWindowStart(at("2026-11-17T01:00:00Z")).toISOString()).toBe("2026-11-17T03:30:00.000Z"); // 06:30 IST -> 09:00 IST
  expect(nextWindowStart(at("2026-11-17T14:00:00Z")).toISOString()).toBe("2026-11-18T03:30:00.000Z"); // 19:30 IST -> tomorrow 09:00 IST
});
