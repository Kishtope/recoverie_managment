import { describe, expect, it } from "bun:test";
import { checkRetailerRows, RETAILER_CAP, type KnownRetailer, type RetailerRowInput } from "./retailer-import";

const retailers: KnownRetailer[] = [
  { id: "r1", code: "KPD-1", name: "Retailer 1", status: "ACTIVE" },
  { id: "r2", code: "KPD-2", name: "Retailer 2", status: "ACTIVE" },
  { id: "r3", code: "KPD-3", name: "Retailer 3", status: "INACTIVE" },
];
const retailerRows = (code: string | undefined, n: number, start = 1): RetailerRowInput[] =>
  Array.from({ length: n }, (_, i) => ({ row: start + i, agreementNo: `A-${start + i}`, assignmentType: "RETAILER", retailerCode: code }));

describe("checkRetailerRows", () => {
  it("maps each retailer row to the retailer its code names and passes caller rows through", () => {
    const rows: RetailerRowInput[] = [
      { row: 2, agreementNo: "A-2", assignmentType: "CALLER" },
      { row: 3, agreementNo: "A-3", assignmentType: "RETAILER", retailerCode: "KPD-1" },
      { row: 4, agreementNo: "A-4", assignmentType: "RETAILER", retailerCode: "KPD-2" },
    ];
    const out = checkRetailerRows(rows, retailers);
    expect(out.errors).toEqual([]);
    expect(out.retailerIds.get(3)).toBe("r1");
    expect(out.retailerIds.get(4)).toBe("r2");
    expect(out.retailerIds.has(2)).toBe(false);
    expect(out.summary.caller).toBe(1);
    expect(out.summary.retailer).toBe(2);
  });

  it("matches codes ignoring case and spaces", () => {
    const out = checkRetailerRows(retailerRows(" kpd-1 ", 1), retailers);
    expect(out.retailerIds.get(1)).toBe("r1");
  });

  it("rejects the rows past the cap for one retailer, in file order, and never moves them to another retailer", () => {
    const out = checkRetailerRows(retailerRows("KPD-1", RETAILER_CAP + 3), retailers);
    expect(out.summary.perRetailer).toEqual([{ retailerId: "r1", code: "KPD-1", name: "Retailer 1", customers: RETAILER_CAP, rejected: 3 }]);
    expect(out.errors.map((e) => e.row)).toEqual([21, 22, 23]);
    expect(out.errors[0].reason).toContain("only 20");
    expect([...out.retailerIds.values()].every((id) => id === "r1")).toBe(true);
  });

  it("lets a retailer take fewer than the cap and counts retailers independently", () => {
    const out = checkRetailerRows([...retailerRows("KPD-1", 20), ...retailerRows("KPD-2", 4, 21)], retailers);
    expect(out.errors).toEqual([]);
    expect(out.summary.perRetailer.map((r) => r.customers)).toEqual([20, 4]);
  });

  it("rejects a blank, unknown or inactive retailer code", () => {
    const out = checkRetailerRows([...retailerRows(undefined, 1, 1), ...retailerRows("NOPE", 1, 2), ...retailerRows("KPD-3", 1, 3)], retailers);
    expect(out.retailerIds.size).toBe(0);
    expect(out.errors.map((e) => e.reason)).toEqual([
      "Retailer Code is blank (needed for Retailer rows)",
      'Retailer Code "NOPE" is not a known retailer',
      "Retailer KPD-3 is inactive and cannot receive customers",
    ]);
  });
});
