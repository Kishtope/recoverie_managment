import { expect, test } from "bun:test";
import { mapStaffSheet, matchStaff, summarizeReadiness, userReadiness, type ReadinessUser, type StaffUser } from "./cutover";

const agent: ReadinessUser = { role: "AGENT", email: "a@x.com", mobile: "9000000003", lastLoginAt: new Date() };
const manager: ReadinessUser = { role: "MANAGER", email: "m@x.com", mobile: null, lastLoginAt: new Date() };

test("an agent needs a mobile, an email and a first sign-in", () => {
  expect(userReadiness(agent)).toMatchObject({ ready: true, problems: [] });
  expect(userReadiness({ ...agent, mobile: null }).problems).toEqual(["No mobile number"]);
  expect(userReadiness({ ...agent, email: null }).problems).toEqual(["No email"]);
  expect(userReadiness({ ...agent, lastLoginAt: null }).problems).toEqual(["Never signed in"]);
  expect(userReadiness({ ...agent, mobile: null, lastLoginAt: null }).ready).toBe(false);
});

test("a manager needs an email and a first sign-in; mobile does not apply", () => {
  expect(userReadiness(manager)).toMatchObject({ ready: true, checks: { mobile: null, email: true, signedIn: true } });
  expect(userReadiness({ ...manager, email: null }).problems).toEqual(["No email"]);
  expect(userReadiness({ ...manager, lastLoginAt: null }).ready).toBe(false);
});

test("the summary counts every problem once per user", () => {
  const s = summarizeReadiness([userReadiness(agent), userReadiness({ ...agent, mobile: null, lastLoginAt: null }), userReadiness({ ...manager, email: null })]);
  expect(s).toEqual({ total: 3, ready: 1, notReady: 2, noMobile: 1, noEmail: 1, neverSignedIn: 1 });
});

const users: StaffUser[] = [
  { id: "u1", name: "Asha Agent", mobile: "9000000003", status: "ACTIVE" },
  { id: "u2", name: "Arun Agent", mobile: "9000000004", status: "ACTIVE" },
  { id: "u3", name: "Ravi Kumar", mobile: "9111111111", status: "ACTIVE" },
  { id: "u4", name: "Ravi Kumar", mobile: "9222222222", status: "ACTIVE" },
  { id: "u5", name: "Gone Person", mobile: "9333333333", status: "DISABLED" },
];
const staff = (name: string, mobile = "", role = "") => ({ row: 2, name, mobile, role });

test("a mobile matches even when written with +91, spaces or a leading 0", () => {
  for (const m of ["9000000003", "+91 90000 00003", "09000000003"]) expect(matchStaff([staff("Someone", m)], users)[0]).toMatchObject({ status: "matched", matchedBy: "mobile", user: { id: "u1" } });
});

test("without a mobile, a name matches only when exactly one user has it (ignoring case)", () => {
  expect(matchStaff([staff("arun agent")], users)[0]).toMatchObject({ status: "matched", matchedBy: "name", user: { id: "u2" } });
  expect(matchStaff([staff("Ravi Kumar")], users)[0]).toMatchObject({ status: "ambiguous", user: null });
  expect(matchStaff([staff("Nobody Here")], users)[0]).toMatchObject({ status: "no-account", user: null });
});

test("a disabled user is reported as disabled, and a mobile beats a conflicting name", () => {
  expect(matchStaff([staff("Gone Person", "9333333333")], users)[0].status).toBe("disabled");
  expect(matchStaff([staff("Ravi Kumar", "9000000004")], users)[0]).toMatchObject({ status: "matched", matchedBy: "mobile", user: { id: "u2" } });
});

test("the result never carries a full mobile number", () => {
  const out = matchStaff([staff("Asha", "9000000003")], users);
  expect(JSON.stringify(out)).not.toContain("9000000003");
  expect(out[0].mobile).toBe("90XXXXXX03");
});

test("the staff sheet needs a Name column; Mobile and Role are optional; blank lines are dropped", () => {
  expect(mapStaffSheet(["Mobile"], [{ row: 2, cells: ["900"] }]).missing).toBe(true);
  const ok = mapStaffSheet(["Staff Name", "Mobile No.", "Designation"], [{ row: 2, cells: [" Asha ", "9000000003", "Agent"] }, { row: 3, cells: ["", "", ""] }]);
  expect(ok.missing).toBe(false);
  expect(ok.rows).toEqual([{ row: 2, name: "Asha", mobile: "9000000003", role: "Agent" }]);
  expect(mapStaffSheet(["Name"], [{ row: 2, cells: ["Asha"] }]).rows[0]).toMatchObject({ mobile: "", role: "" });
});
