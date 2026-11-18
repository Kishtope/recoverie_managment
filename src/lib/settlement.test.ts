import { expect, test } from "bun:test";
import { canDecideSettlement, settlementOfferError, waiverFor, waiverPct } from "./settlement";

test("waiver is the overdue minus the offer, as a percentage of the overdue", () => {
  expect(waiverFor(10000, 7000)).toBe(3000);
  expect(waiverPct(10000, 3000)).toBe(30);
  expect(waiverPct(0, 0)).toBe(0);
  expect(waiverFor(1000, 1500)).toBe(0);
});

test("a Manager decides only within the limit; an Admin always; nobody else", () => {
  expect(canDecideSettlement("MANAGER", 20, 20)).toBe(true);
  expect(canDecideSettlement("MANAGER", 20.01, 20)).toBe(false);
  expect(canDecideSettlement("ADMIN", 90, 20)).toBe(true);
  expect(canDecideSettlement("AGENCY_OWNER", 1, 20)).toBe(false);
  expect(canDecideSettlement("AGENT", 1, 20)).toBe(false);
});

test("an offer must be positive and below the overdue amount", () => {
  expect(settlementOfferError(null, 100)).toContain("nothing overdue");
  expect(settlementOfferError(5000, 0)).toContain("Enter the amount");
  expect(settlementOfferError(5000, 5000)).toContain("less than");
  expect(settlementOfferError(5000, 4000)).toBeNull();
});
