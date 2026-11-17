import Link from "next/link";
import { format, parse } from "date-fns";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CollectedSource, TeamPeriod, TeamSummary } from "../types";

// One slice of the status bar: how many cases sit at this status, its colour (theme tokens only) and, where it maps to an outcome, the Cases filter it opens.
type Slice = { key: string; label: string; count: number; swatch: string; href?: string };

// "November 2026" for a month, "Financial year 2026-2027" for the whole year.
const periodLabel = (p: TeamPeriod) => (p.month === "all" ? `Financial year ${p.fy}` : format(parse(p.month, "yyyy-MM", new Date()), "MMMM yyyy"));

// The six statuses a case can be in during the period. They add up to the total number of cases, so the bar is always whole.
const slicesOf = (s: TeamSummary): Slice[] => [
  { key: "paid", label: "Paid", count: s.paid, swatch: "bg-success", href: "/cases?outcome=PAID" },
  { key: "part", label: "Part paid", count: s.partPaid, swatch: "bg-chart-2", href: "/cases?outcome=PART_PAID" },
  { key: "ptp", label: "Promised", count: s.ptp.total, swatch: "bg-chart-1", href: "/cases?outcome=PTP" },
  { key: "callback", label: "Callback", count: s.callback, swatch: "bg-chart-4", href: "/cases?outcome=CALLBACK" },
  { key: "lost", label: "Not reachable or refused", count: s.notReachableOrRefused, swatch: "bg-chart-3" },
  { key: "pending", label: "No outcome yet", count: s.pending, swatch: "bg-border" },
];

/**
 * @component CollectionHero
 * @description The lead of the team dashboard: the money collected (large), how much of the due amount that is, and one segmented bar showing
 * where every case stands (paid, part paid, promised, callback, lost, no outcome). The bar grows in once on load. The legend under it links
 * to the Cases list filtered by that outcome. A target set in Settings shows as a tick on the progress line.
 * @param summary The summary numbers from the dashboard endpoint.
 * @param source Where "collected" came from; explains the note under the number.
 * @param targetPct Optional collection target (percent of due) from Settings.
 */
export const CollectionHero = ({
  summary: s,
  period,
  source,
  targetPct,
  className,
}: {
  summary: TeamSummary;
  period: TeamPeriod;
  source: CollectedSource;
  targetPct: number | null;
  className?: string;
}) => {
  const slices = slicesOf(s);
  const done = s.collectionPct === null ? 0 : Math.min(100, s.collectionPct);
  const share = (count: number) => (s.cases > 0 ? Math.round((count / s.cases) * 100) : 0);

  return (
    <section aria-label="Collection summary" className={cn("flex flex-col gap-8 rounded-card border border-border bg-card p-5 md:p-8", className)}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground">Collected in {periodLabel(period)}</p>
          <p className="display-number truncate text-7xl md:text-8xl">{formatInr(s.collected)}</p>
          <p className="text-sm text-muted-foreground">{source === "payments" ? "From imported payments." : "From what agents recorded in outcomes, not bank data."}</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{s.collectionPct === null ? "Nothing due" : `${s.collectionPct}% of what was due`}</span>
            <span className="text-sm text-muted-foreground">{formatInr(s.dueAmount)} due</span>
          </div>
          <div
            role="progressbar"
            aria-label="Collected share of the due amount"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(done)}
            className="relative h-3 w-full rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-success" style={{ width: `${done}%` }} />
            {targetPct !== null && (
              <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground" style={{ left: `${Math.min(100, targetPct)}%` }} />
            )}
          </div>
          {targetPct !== null && <span className="text-xs text-muted-foreground">Target {targetPct}%</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl">
          Where {s.cases.toLocaleString("en-IN")} {s.cases === 1 ? "case stands" : "cases stand"}
        </h2>
        {/* Segments grow in proportion to their count; empty ones are dropped from the bar but stay in the legend. */}
        <div
          role="img"
          aria-label={slices.map((x) => `${x.label} ${x.count}`).join(", ")}
          className="flex h-5 w-full gap-0.5 overflow-hidden rounded-full motion-safe:animate-bar-grow"
        >
          {s.cases === 0 ? (
            <span className="h-full w-full bg-muted" />
          ) : (
            slices.filter((x) => x.count > 0).map((x) => <span key={x.key} className={cn("h-full min-w-1", x.swatch)} style={{ flexGrow: x.count, flexBasis: 0 }} />)
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
          {slices.map((x) => {
            const body = (
              <>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", x.swatch)} />
                  <span className="truncate">{x.label}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="display-number text-3xl">{x.count.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-muted-foreground">{share(x.count)}%</span>
                </span>
              </>
            );
            return (
              <li key={x.key} className="min-w-0">
                {x.href ? (
                  <Link href={x.href} className="flex flex-col gap-1 rounded-[14px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-1">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
