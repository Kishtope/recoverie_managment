import { expect, test } from "bun:test";
import { checkCallRules } from "./call-rules";

test("dispute, do-not-call and the daily cap each block, in that order", () => {
  expect(checkCallRules({ disputed: true, doNotCall: true, callsToday: 9 })?.reason).toBe("DISPUTE");
  expect(checkCallRules({ disputed: false, doNotCall: true, callsToday: 9 })?.reason).toBe("DO_NOT_CALL");
  expect(checkCallRules({ disputed: false, doNotCall: false, callsToday: 3 })?.reason).toBe("DAILY_LIMIT");
  expect(checkCallRules({ disputed: false, doNotCall: false, callsToday: 2 })).toBeNull();
});
