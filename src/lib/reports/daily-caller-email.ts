import type { CurrentUser } from "@/lib/access";
import { todayIst } from "@/lib/dates";
import { formatInr } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { loadScorecards } from "@/lib/metrics/scorecard";
import { prisma } from "@/lib/prisma";
import { SCORECARD_ALERT_LABELS, type ScorecardRow } from "@/lib/scorecard";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Escapes text that came from users (names) before it goes into the email's HTML.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
const pct = (v: number | null) => (v === null ? "-" : `${v}%`);

// The daily caller-wise report as HTML and plain text: one row per caller in rank order with money, recovery %, target %, calls and alerts.
export const renderCallerReport = (month: string, today: string, rows: ScorecardRow[]) => {
  const subject = `Caller-wise collection report, ${today}`;
  const alerting = rows.filter((r) => r.alerts.length);
  const total = rows.reduce((s, r) => s + r.collected, 0);

  const head = ["#", "Caller", "Collected", "Recovery", "Target", "Calls", "Contact", "PTP kept", "Alerts"];
  const cells = (r: ScorecardRow) => [
    String(r.rank),
    r.name,
    formatInr(r.collected),
    pct(r.recoveryPct),
    r.targetAmount ? `${pct(r.achievementPct)} of ${formatInr(r.targetAmount)}` : "-",
    String(r.calls),
    pct(r.contactPct),
    pct(r.ptpKeptPct),
    r.alerts.map((a) => SCORECARD_ALERT_LABELS[a]).join(", ") || "-",
  ];
  const cellStyle = 'style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:left"';

  const html = [
    `<p>Month to date (${esc(month)}): <strong>${formatInr(total)}</strong> collected by ${rows.length} callers. ${alerting.length ? `${alerting.length} need attention.` : "No alerts."}</p>`,
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px"><thead><tr>${head.map((h) => `<th ${cellStyle}>${h}</th>`).join("")}</tr></thead><tbody>`,
    ...rows.map((r) => `<tr>${cells(r).map((c) => `<td ${cellStyle}>${esc(c)}</td>`).join("")}</tr>`),
    "</tbody></table>",
  ].join("");
  const text = [`Month to date (${month}): ${formatInr(total)} collected by ${rows.length} callers.`, ...rows.map((r) => cells(r).join(" | "))].join("\n");
  return { subject, html, text };
};

// Sends today's caller-wise report to every active Admin and Manager with an email, each limited to their own scope. One failed send does
// not stop the others. Run once each morning from POST /api/reports/daily-email or scripts/send-daily-report.ts.
export const sendDailyCallerReports = async (now: Date = new Date()) => {
  const today = todayIst(now);
  const month = today.slice(0, 7);
  const recipients = await prisma.user.findMany({
    where: { status: "ACTIVE", role: { in: ["ADMIN", "MANAGER"] }, email: { not: null } },
    select: { id: true, name: true, email: true, role: true, agencyId: true, agency: { select: { id: true, name: true } }, access: { select: { company: true, branch: true } } },
  });

  let sent = 0;
  let logged = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      const user: CurrentUser = { id: r.id, name: r.name, email: r.email, role: r.role, agencyId: r.agencyId, agency: r.agency, access: r.access };
      const { items } = await loadScorecards(user, month, today);
      if (items.length === 0) continue;
      const { subject, html, text } = renderCallerReport(month, today, items);
      const result = await sendMail({ to: r.email as string, subject, html, text });
      if (result.sent) sent++;
      else logged++;
    } catch (error) {
      failed++;
      console.error("Daily caller report failed for a recipient", error);
    }
  }
  return { day: today, recipients: recipients.length, sent, logged, failed };
};
