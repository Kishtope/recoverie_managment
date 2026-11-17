import { format, parse } from "date-fns";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CallLine } from "@/features/calls/_components/call-line";
import type { CallItem } from "@/features/calls/types";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DispositionItem } from "../types";

// "yyyy-MM-dd" as "20 Nov 2026".
const day = (d: string) => format(parse(d, "yyyy-MM-dd", new Date()), "dd MMM yyyy");

// One timeline entry: an outcome (with the call it was recorded for, if any) or a call that has no outcome.
type Entry = { at: string; key: string; outcome?: DispositionItem; call?: CallItem };

/**
 * @component DispositionHistory
 * @description A case's calls and outcomes as one timeline, newest first. An outcome shows who recorded it, what was promised or paid, the
 * next follow-up and remarks, with its call (talk time, recording) underneath. Calls without an outcome (failed, ringing, missed callbacks
 * from the customer) are short entries of their own. The newest entry's marker is highlighted.
 */
export const DispositionHistory = ({ items, calls }: { items: DispositionItem[]; calls: CallItem[] }) => {
  const callById = new Map(calls.map((c) => [c.id, c]));
  const entries: Entry[] = [
    ...items.map((d) => ({ at: d.createdAt, key: d.id, outcome: d, call: d.callId ? callById.get(d.callId) : undefined })),
    ...calls.filter((c) => !c.dispositionId).map((c) => ({ at: c.startedAt, key: c.id, call: c })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No calls or outcomes yet</EmptyTitle>
          <EmptyDescription>Calls and outcomes on this case will show here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ol className="ml-2 flex flex-col border-l border-border">
      {entries.map(({ key, outcome: d, call }, index) => (
        <li key={key} className="relative flex flex-col gap-1.5 pb-6 pl-6 last:pb-0">
          {/* Timeline marker sitting on the vertical rule. */}
          <span
            aria-hidden
            className={cn("absolute top-1.5 -left-1.25 size-2.5 rounded-full ring-4 ring-card", index === 0 ? "bg-accent" : "bg-border")}
          />
          {!d && call && <CallLine call={call} withTime />}
          {d && (
          <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <OutcomeBadge outcome={d.outcome} />
            <span className="text-xs text-muted-foreground">
              {format(new Date(d.createdAt), "dd MMM yyyy, h:mm a")} · {d.agent.name}
            </span>
          </div>
          {call && <CallLine call={call} />}
          {(d.ptpDate || d.paidAmount !== null || d.nextFollowUpOn) && (
            <p className="text-sm">
              {d.ptpDate && <span>Promised <strong className="font-semibold">{formatInr(d.ptpAmount)}</strong> by {day(d.ptpDate)}. </span>}
              {d.paidAmount !== null && <span>Paid <strong className="font-semibold">{formatInr(d.paidAmount)}</strong>. </span>}
              {d.nextFollowUpOn && <span className="text-muted-foreground">Next follow-up {day(d.nextFollowUpOn)}.</span>}
            </p>
          )}
          {d.remarks && <p className="rounded-[14px] bg-muted px-3 py-2 text-sm text-muted-foreground">{d.remarks}</p>}
          </>
          )}
        </li>
      ))}
    </ol>
  );
};
