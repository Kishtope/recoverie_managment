import { expect, test } from "bun:test";
import { followUpWhere } from "./follow-up-where";

const TODAY = "2026-11-17";
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

test("today, overdue and upcoming compare against the given day", () => {
  expect(followUpWhere("today", TODAY)).toEqual({ nextFollowUpOn: day(TODAY) });
  expect(followUpWhere("overdue", TODAY)).toEqual({ nextFollowUpOn: { lt: day(TODAY) } });
  expect(followUpWhere("upcoming", TODAY)).toEqual({ nextFollowUpOn: { gt: day(TODAY) } });
});

test("next7 is after today up to and including today + 7", () => {
  expect(followUpWhere("next7", TODAY)).toEqual({ nextFollowUpOn: { gt: day(TODAY), lte: day("2026-11-24") } });
});

test("none matches loans with no follow-up; unknown or all adds no condition", () => {
  expect(followUpWhere("none", TODAY)).toEqual({ nextFollowUpOn: null });
  expect(followUpWhere("all", TODAY)).toEqual({});
  expect(followUpWhere("<script>", TODAY)).toEqual({});
  expect(followUpWhere(null, TODAY)).toEqual({});
});
