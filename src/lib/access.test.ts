import { expect, test } from "bun:test";
import { loanScopeWhere, userScopeWhere, type CurrentUser } from "./access";

const base: CurrentUser = { id: "u1", name: "U", email: null, role: "AGENT", agencyId: null, agency: null, access: [] };

test("admin sees everyone", () => {
  expect(userScopeWhere({ ...base, role: "ADMIN" })).toEqual({});
});

test("agent and field agent see only themselves", () => {
  expect(userScopeWhere(base)).toEqual({ id: "u1" });
  expect(userScopeWhere({ ...base, role: "FIELD_AGENT" })).toEqual({ id: "u1" });
});

test("manager sees self, own team and own company/branch grants only", () => {
  const where = userScopeWhere({ ...base, role: "MANAGER", access: [{ company: "AF", branch: "Balaghat" }] });
  expect(where).toEqual({
    OR: [{ id: "u1" }, { reportsToId: "u1" }, { access: { some: { company: "AF", branch: "Balaghat" } } }],
  });
});

test("agency owner sees only their agency; without an agency only themselves", () => {
  expect(userScopeWhere({ ...base, role: "AGENCY_OWNER", agencyId: "a1" })).toEqual({ OR: [{ id: "u1" }, { agencyId: "a1" }] });
  expect(userScopeWhere({ ...base, role: "AGENCY_OWNER" })).toEqual({ id: "u1" });
});

test("loan scope follows the ACTIVE allocation only", () => {
  expect(loanScopeWhere({ ...base, role: "ADMIN" })).toEqual({});
  // Agent / field agent: only active allocations to themselves, so a case reassigned away (inactive) drops out.
  expect(loanScopeWhere(base)).toEqual({ allocations: { some: { active: true, agentId: "u1" } } });
  expect(loanScopeWhere({ ...base, role: "FIELD_AGENT" })).toEqual({ allocations: { some: { active: true, agentId: "u1" } } });
});

test("loan scope for agency owner and manager", () => {
  expect(loanScopeWhere({ ...base, role: "AGENCY_OWNER", agencyId: "a1" })).toEqual({ allocations: { some: { active: true, agencyId: "a1" } } });
  expect(loanScopeWhere({ ...base, role: "AGENCY_OWNER" })).toEqual({ allocations: { some: { active: true, agentId: "u1" } } });
  expect(loanScopeWhere({ ...base, role: "MANAGER", access: [{ company: "AF", branch: "Balaghat" }] })).toEqual({
    OR: [
      { allocations: { some: { active: true, agentId: "u1" } } },
      { allocations: { some: { active: true, agent: { reportsToId: "u1" } } } },
      { company: "AF", branch: "Balaghat" },
    ],
  });
});
