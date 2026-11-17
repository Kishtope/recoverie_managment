import type { ReactNode } from "react";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamSummary } from "../types";

// One figure in the strip: a plain label, the number, and a muted line that explains it.
const Cell = ({ label, value, note }: { label: string; value: ReactNode; note: string }) => (
  <div className="flex min-w-0 flex-col gap-1 bg-card p-4 md:p-5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="display-number truncate text-4xl">{value}</span>
    <span className="text-xs text-muted-foreground">{note}</span>
  </div>
);

/**
 * @component SummaryStrip
 * @description The four supporting numbers under the hero (cases, due, conversations, promises) as one divided panel instead of separate cards.
 * Same pattern as the stat strip on the case page.
 */
export const SummaryStrip = ({ summary: s, className }: { summary: TeamSummary; className?: string }) => {
  const spokePct = s.cases > 0 ? Math.round((s.spoke / s.cases) * 100) : 0;
  return (
    <section aria-label="Key numbers" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-4", className)}>
      <Cell label="Cases" value={s.cases.toLocaleString("en-IN")} note="Allocated and active" />
      <Cell label="Due" value={formatInr(s.dueAmount)} note="Overdue across these cases" />
      <Cell label="Spoke to" value={s.spoke.toLocaleString("en-IN")} note={`${spokePct}% had a real conversation`} />
      <Cell label="Promises" value={s.ptp.total.toLocaleString("en-IN")} note={`${s.ptp.kept} kept, ${s.ptp.upcoming} upcoming, ${s.ptp.broken} broken`} />
    </section>
  );
};
