import { format, parse } from "date-fns";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import type { DispositionItem } from "../types";

// "yyyy-MM-dd" as "20 Nov 2026".
const day = (d: string) => format(parse(d, "yyyy-MM-dd", new Date()), "dd MMM yyyy");

/**
 * @component DispositionHistory
 * @description A case's outcomes, newest first: when, who, what was promised or paid, the next follow-up and the remarks.
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
    <ol className="flex flex-col gap-3">
      {items.map((d) => (
        <li key={d.id} className="flex flex-col gap-1 rounded-[14px] border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <OutcomeBadge outcome={d.outcome} />
            <span className="text-sm text-muted-foreground">
              {format(new Date(d.createdAt), "dd MMM yyyy, h:mm a")} · {d.agent.name}
            </span>
          </div>
          <div className="text-sm">
            {d.ptpDate && <span>Promised {formatInr(d.ptpAmount)} by {day(d.ptpDate)}. </span>}
            {d.paidAmount !== null && <span>Paid {formatInr(d.paidAmount)}. </span>}
            {d.nextFollowUpOn && <span>Next follow-up {day(d.nextFollowUpOn)}.</span>}
          </div>
          {d.remarks && <p className="text-sm text-muted-foreground">{d.remarks}</p>}
        </li>
      ))}
    </ol>
  );
};
