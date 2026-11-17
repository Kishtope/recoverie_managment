import { format, parse } from "date-fns";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DispositionItem } from "../types";

// "yyyy-MM-dd" as "20 Nov 2026".
const day = (d: string) => format(parse(d, "yyyy-MM-dd", new Date()), "dd MMM yyyy");

/**
 * @component DispositionHistory
 * @description A case's outcomes as a timeline, newest first: the outcome, who recorded it and when, what was promised or paid,
 * the next follow-up and the remarks. The newest entry's marker is highlighted so the current state reads at a glance.
 */
export const DispositionHistory = ({ items }: { items: DispositionItem[] }) => {
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No outcomes yet</EmptyTitle>
          <EmptyDescription>Outcomes recorded on this case will show here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ol className="ml-2 flex flex-col border-l border-border">
      {items.map((d, index) => (
        <li key={d.id} className="relative flex flex-col gap-1.5 pb-6 pl-6 last:pb-0">
          {/* Timeline marker sitting on the vertical rule. */}
          <span
            aria-hidden
            className={cn("absolute top-1.5 -left-1.25 size-2.5 rounded-full ring-4 ring-card", index === 0 ? "bg-accent" : "bg-border")}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <OutcomeBadge outcome={d.outcome} />
            <span className="text-xs text-muted-foreground">
              {format(new Date(d.createdAt), "dd MMM yyyy, h:mm a")} · {d.agent.name}
            </span>
          </div>
          {(d.ptpDate || d.paidAmount !== null || d.nextFollowUpOn) && (
            <p className="text-sm">
              {d.ptpDate && <span>Promised <strong className="font-semibold">{formatInr(d.ptpAmount)}</strong> by {day(d.ptpDate)}. </span>}
              {d.paidAmount !== null && <span>Paid <strong className="font-semibold">{formatInr(d.paidAmount)}</strong>. </span>}
              {d.nextFollowUpOn && <span className="text-muted-foreground">Next follow-up {day(d.nextFollowUpOn)}.</span>}
            </p>
          )}
          {d.remarks && <p className="rounded-[14px] bg-muted px-3 py-2 text-sm text-muted-foreground">{d.remarks}</p>}
        </li>
      ))}
    </ol>
  );
};
