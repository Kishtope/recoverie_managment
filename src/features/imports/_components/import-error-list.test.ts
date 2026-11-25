import { expect, test } from "bun:test";
import { groupErrors } from "./import-error-list";

const err = (row: number, reason: string, column?: string) => ({ row, agreementNo: `CDL${row}`, reason, column });

test("errors of one kind fall into one group, biggest first, with the per-row value kept as detail", () => {
  const groups = groupErrors([
    err(1, "Branch is blank (fill the Branch / Assigned Branch column)", "Assigned Branch (column AY)"),
    err(2, "Retailer KPD223 can take only 20 customers per upload; this customer was left out (upload it in a later file)", "Retailer Code (column AU)"),
    err(3, "Retailer KPD643 can take only 20 customers per upload; this customer was left out (upload it in a later file)", "Retailer Code (column AU)"),
    err(4, 'Branch "Atlantis" is not set up in the app (ask an Admin to add it)', "Assigned Branch (column AY)"),
    err(5, "Loan Account Number is repeated in this file (first on row 2)", "Loan Account Number (column C)"),
  ]);
  expect(groups.map((g) => g.rows.length)).toEqual([2, 1, 1, 1]);
  expect(groups[0].title).toBe("A retailer can take only 20 customers per upload; this customer was left out (upload it in a later file)");
  expect(groups[0].rows.map((r) => r.detail)).toEqual(["KPD223", "KPD643"]);
  expect(groups.find((g) => g.title.startsWith("Branch is not set up"))?.rows[0].detail).toBe("Atlantis");
  expect(groups.find((g) => g.title.startsWith("Loan Account Number"))?.rows[0].detail).toBe("first on row 2");
});
