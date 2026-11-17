import { expect, test } from "bun:test";
import { buildListQuery, parseListParams, withFilter, type FilterConfig } from "./use-url-list-params";

const config: FilterConfig = { role: { default: "all", values: ["all", "ADMIN", "AGENT"] } };

test("a wrong filter value or page falls back to the default", () => {
  const p = parseListParams(new URLSearchParams("role=HACKER&page=-3"), config);
  expect(p).toEqual({ q: "", page: 1, filters: { role: "all" } });
});

test("valid values are read; defaults are not written back to the URL", () => {
  const p = parseListParams(new URLSearchParams("q=ann&role=AGENT&page=2"), config);
  expect(p).toEqual({ q: "ann", page: 2, filters: { role: "AGENT" } });
  expect(buildListQuery(p, config)).toBe("q=ann&role=AGENT&page=2");
  expect(buildListQuery({ q: "", page: 1, filters: { role: "all" } }, config)).toBe("");
});

test("changing a filter resets the page to 1", () => {
  const next = withFilter({ q: "", page: 4, filters: { role: "all" } }, "role", "ADMIN");
  expect(next.page).toBe(1);
  expect(next.filters.role).toBe("ADMIN");
});
