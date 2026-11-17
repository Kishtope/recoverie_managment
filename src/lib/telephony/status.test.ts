import { expect, test } from "bun:test";
import { callNeedsOutcome, mapProviderStatus, mergeCallStatus } from "./status";

test("INITIATED moves to a final status", () => {
  expect(mergeCallStatus("INITIATED", "CONNECTED")).toBe("CONNECTED");
  expect(mergeCallStatus("INITIATED", "MISSED")).toBe("MISSED");
  expect(mergeCallStatus("INITIATED", "FAILED")).toBe("FAILED");
});

test("status never goes backwards, and a final status is never replaced", () => {
  expect(mergeCallStatus("CONNECTED", "INITIATED")).toBe("CONNECTED"); // late "ringing" after "completed"
  expect(mergeCallStatus("MISSED", "MISSED")).toBe("MISSED"); // webhook retry
  expect(mergeCallStatus("MISSED", "CONNECTED")).toBe("MISSED");
  expect(mergeCallStatus("FAILED", "CONNECTED")).toBe("FAILED");
  expect(mergeCallStatus("INITIATED", "INITIATED")).toBe("INITIATED");
});

test("provider words map to our statuses; unknown words stay ringing", () => {
  expect(mapProviderStatus("Answered")).toBe("CONNECTED");
  expect(mapProviderStatus("NO ANSWER")).toBe("MISSED");
  expect(mapProviderStatus("error")).toBe("FAILED");
  expect(mapProviderStatus("something-new")).toBe("INITIATED");
});

test("only an answered/missed outbound call without an outcome is pending", () => {
  const base = { direction: "OUTBOUND" as const, hasDisposition: false };
  expect(callNeedsOutcome({ ...base, status: "CONNECTED" })).toBe(true);
  expect(callNeedsOutcome({ ...base, status: "MISSED" })).toBe(true);
  expect(callNeedsOutcome({ ...base, status: "FAILED" })).toBe(false);
  expect(callNeedsOutcome({ ...base, status: "INITIATED" })).toBe(false);
  expect(callNeedsOutcome({ ...base, status: "CONNECTED", hasDisposition: true })).toBe(false);
  expect(callNeedsOutcome({ direction: "INBOUND", status: "MISSED", hasDisposition: false })).toBe(false); // a callback, not an outcome
});
