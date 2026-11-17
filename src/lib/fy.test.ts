import { expect, test } from "bun:test";
import { dpdBucket } from "./dpd-bucket";
import { fyMonths, fyRange, getFy, monthRange, recentFys } from "./fy";

test("financial year flips on 1 April, not 31 March", () => {
  expect(getFy("2027-03-31")).toBe("2026-2027");
  expect(getFy("2027-04-01")).toBe("2027-2028");
  expect(getFy("2026-04-01")).toBe("2026-2027");
  expect(getFy("2026-01-15")).toBe("2025-2026");
});

test("fyRange covers 1 April to 31 March and rejects junk", () => {
  expect(fyRange("2026-2027")).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  expect(fyRange("2026-2028")).toBeNull();
  expect(fyRange("nope")).toBeNull();
});

test("monthRange: whole FY, one month inside it, and months outside it are rejected", () => {
  expect(monthRange("2026-2027", "all")).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  expect(monthRange("2026-2027", "2027-02")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  expect(monthRange("2026-2027", "2027-03")).toEqual({ from: "2027-03-01", to: "2027-03-31" });
  expect(monthRange("2026-2027", "2027-04")).toBeNull(); // belongs to the next FY
  expect(monthRange("2026-2027", "2026-03")).toBeNull(); // belongs to the previous FY
  expect(monthRange("2026-2027", "2028-02")).toBeNull();
  expect(monthRange("2026-2027", "garbage")).toBeNull();
});

test("a leap-year February ends on the 29th", () => {
  expect(monthRange("2027-2028", "2028-02")?.to).toBe("2028-02-29");
});

test("fyMonths lists April to March; recentFys lists three years newest first", () => {
  const months = fyMonths("2026-2027");
  expect(months[0]).toBe("2026-04");
  expect(months[8]).toBe("2026-12");
  expect(months[9]).toBe("2027-01");
  expect(months[11]).toBe("2027-03");
  expect(recentFys("2026-11-17")).toEqual(["2026-2027", "2025-2026", "2024-2025"]);
});

test("DPD buckets at every boundary; a missing DPD is its own bucket", () => {
  expect([0, 30, 31, 60, 61, 90, 91].map(dpdBucket)).toEqual(["0-30", "0-30", "31-60", "31-60", "61-90", "61-90", "90+"]);
  expect(dpdBucket(null)).toBe("none");
  expect(dpdBucket(undefined)).toBe("none");
});
