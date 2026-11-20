import { expect, test } from "bun:test";
import { mapColumns } from "@/lib/imports/columns";
import { validate } from "@/lib/imports/run";
import { describeIssue, loanRowSchema } from "./schemas";

const good = { agreementNo: "AF-1", customerName: "Ramesh", company: "af", branch: "balaghat", emiAmount: "1,200", disbursedOn: "15-03-2024", dpd: "42", assignmentType: "caller" };

test("a valid loan row is normalised (company, branch, amounts, dates)", () => {
  const r = loanRowSchema.parse(good);
  expect(r.company).toBe("AF");
  expect(r.branch).toBe("Balaghat");
  expect(r.emiAmount).toBe(1200);
  expect(r.dpd).toBe(42);
  expect(r.mobilePrimary).toBeUndefined(); // blank/missing = leave the stored value alone
  expect(r.assignmentType).toBe("CALLER");
});

test("assignment type must be Caller or Retailer; the retailer code stays optional here (checked against the retailers later)", () => {
  expect(loanRowSchema.parse({ ...good, assignmentType: " Retailer ", retailerCode: " KPD-1 " })).toMatchObject({ assignmentType: "RETAILER", retailerCode: "KPD-1" });
  const blank = loanRowSchema.safeParse({ ...good, assignmentType: "" });
  expect(blank.success).toBe(false);
  if (!blank.success) expect(describeIssue(blank.error)).toContain("Assignment type is blank");
  const bad = loanRowSchema.safeParse({ ...good, assignmentType: "Agent" });
  expect(bad.success).toBe(false);
  if (!bad.success) expect(describeIssue(bad.error)).toContain("must be Caller or Retailer");
});

test("unknown branch and bad date are row errors", () => {
  const branch = loanRowSchema.safeParse({ ...good, branch: "Atlantis" });
  expect(branch.success).toBe(false);
  if (!branch.success) expect(describeIssue(branch.error)).toContain("Unknown branch");
  expect(loanRowSchema.safeParse({ ...good, disbursedOn: "31/02/2024" }).success).toBe(false);
});

test("header aliases map to fields; missing required columns are reported", () => {
  const ok = mapColumns("LOANS", ["Agreement No.", "Customer Name", "Company", "Branch", "Assignment Type", "Retailer Code", "Overdue"], [{ row: 2, cells: ["A1", "X", "AF", "Mandla", "Retailer", "KPD-1", "500"] }]);
  expect(ok.missing).toEqual([]);
  expect(ok.rows[0].values).toMatchObject({ agreementNo: "A1", overdueAmount: "500", assignmentType: "Retailer", retailerCode: "KPD-1" });
  expect(mapColumns("LOANS", ["Agreement No", "Customer Name", "Company", "Branch"], []).missing).toEqual(["assignmentType"]);
  expect(mapColumns("ALLOCATIONS", ["Agreement No"], []).missing).toEqual(["agentEmail"]);
});

test("a repeated agreement no. in one file becomes an error on the later row", () => {
  const rows = [
    { row: 2, values: good },
    { row: 3, values: { ...good, customerName: "Other" } },
  ];
  const { valid, errors } = validate(rows, (values) => {
    const r = loanRowSchema.safeParse(values);
    return r.success ? { data: r.data } : { error: describeIssue(r.error) };
  });
  expect(valid).toHaveLength(1);
  expect(errors).toEqual([{ row: 3, agreementNo: "AF-1", reason: "Duplicate agreement no. in this file (first on row 2)" }]);
});
