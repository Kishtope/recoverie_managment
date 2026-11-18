import { expect, mock, test } from "bun:test";
import { buildScorecards } from "../scorecard";

// The module imports the Prisma client and mailer at load time; these tests only use the pure renderer.
mock.module("@/lib/prisma", () => ({ prisma: {} }));
const { renderCallerReport } = await import("./daily-caller-email");

const rows = buildScorecards(
  [
    { agentId: "a", name: "Asha <script>", allocated: 10, due: 100000, collected: 40000, resolved: 2, calls: 300, connected: 90, missed: 0, failed: 0, inboundMissed: 0, callbackPct: null, ptpTaken: 4, ptpKept: 3, avgTalkSec: 90, targetAmount: 100000, targetResolved: null },
    { agentId: "b", name: "Ravi", allocated: 10, due: 100000, collected: 10000, resolved: 0, calls: 10, connected: 1, missed: 0, failed: 0, inboundMissed: 0, callbackPct: null, ptpTaken: 0, ptpKept: 0, avgTalkSec: null, targetAmount: null, targetResolved: null },
  ],
  { elapsedDays: 15, fraction: 0.5 },
);

test("the report lists callers in rank order with totals, and escapes names", () => {
  const { subject, html, text } = renderCallerReport("2026-11", "2026-11-15", rows);
  expect(subject).toBe("Caller-wise collection report, 2026-11-15");
  expect(html).toContain("₹50,000");
  expect(html).toContain("Asha &lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html.indexOf("Asha")).toBeLessThan(html.indexOf("Ravi"));
  expect(text.split("\n")[1]).toContain("Asha <script>");
});

test("callers with alerts are counted in the opening line", () => {
  const { html } = renderCallerReport("2026-11", "2026-11-15", rows);
  expect(html).toContain("1 need attention"); // Ravi: 10 calls over 15 days
  expect(html).toContain("Low calls");
});
