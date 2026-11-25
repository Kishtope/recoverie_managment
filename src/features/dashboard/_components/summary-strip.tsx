import type { ReactNode } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamFilters, TeamSummary } from "../types";

// One figure in the strip: a plain label, the number, and a muted line that explains it. With `href` the whole cell is a link to the matching cases.
const Cell = ({ label, value, note, href }: { label: string; value: ReactNode; note: string; href?: string }) => {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="display-number truncate text-4xl">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </>
  );
  const base = "flex min-w-0 flex-col gap-1 bg-card p-4 md:p-5";
  return href ? (
    <Link href={href} className={cn(base, "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset")}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
};

// Cases page URL that carries the dashboard's company, branch and agent filters (plus any extra, e.g. outcome). "all" / empty values are left out.
const casesHref = (filters: Pick<TeamFilters, "company" | "branch" | "agentId">, extra: Record<string, string> = {}) => {
  const sp = new URLSearchParams();
  const pairs: [string, string][] = [["company", filters.company], ["branch", filters.branch], ["agent", filters.agentId], ...Object.entries(extra)];
  for (const [key, value] of pairs) if (value && value !== "all") sp.set(key, value);
  const qs = sp.toString();
  return qs ? `/cases?${qs}` : "/cases";
};

/**
 * @component SummaryStrip
 * @description The five supporting numbers under the hero (cases, due ₹, due cases, conversations, promises) as one divided panel instead of separate cards.
 * Same pattern as the stat strip on the case page. "Spoke to" and "Promises" link to the Cases page with the dashboard's filters.
 * @param filters The dashboard's current filters, carried over to the Cases link.
 */
export const SummaryStrip = ({ summary: s, filters, className }: { summary: TeamSummary; filters: Pick<TeamFilters, "company" | "branch" | "agentId">; className?: string }) => {
  const spokePct = s.cases > 0 ? Math.round((s.spoke / s.cases) * 100) : 0;
  return (
    <section aria-label="Key numbers" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-5", className)}>
      <Cell label="Cases" value={s.cases.toLocaleString("en-IN")} note="Allocated and active" />
      <Cell label="Due" value={formatInr(s.dueAmount)} note="Overdue across these cases" />
      <Cell label="Due cases" value={s.dueCases.toLocaleString("en-IN")} note={`${s.cases > 0 ? Math.round((s.dueCases / s.cases) * 100) : 0}% of cases have an overdue amount`} />
      <Cell label="Spoke to" value={s.spoke.toLocaleString("en-IN")} note={`${spokePct}% had a real conversation`} href={casesHref(filters)} />
      <Cell label="Promises" value={s.ptp.total.toLocaleString("en-IN")} note={`${s.ptp.kept} kept, ${s.ptp.upcoming} upcoming, ${s.ptp.broken} broken`} href={casesHref(filters, { outcome: "PTP" })} />
    </section>
  );
};
