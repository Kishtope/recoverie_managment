import type { ReactNode } from "react";
import { format, parse } from "date-fns";
import { PtpStatusBadge } from "@/components/case-status-badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CallLine } from "@/features/calls/_components/call-line";
import type { CallItem } from "@/features/calls/types";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DispositionItem } from "../types";

// "yyyy-MM-dd" as "20 Nov 2026".
const day = (d: string) => format(parse(d, "yyyy-MM-dd", new Date()), "dd MMM yyyy");

// "HH:mm" as "3:30 PM".
const clock = (t: string) => format(parse(t, "HH:mm", new Date()), "h:mm a");

// One timeline entry: an interaction (with the call it was recorded for, if any) or a call that has no outcome.
type Entry = { at: string; key: string; outcome?: DispositionItem; call?: CallItem };

// One labelled fact of an interaction ("Promised amount ₹25,000"); rendered only when it has a value.
const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col">
    <dt className="kicker text-muted-foreground">{label}</dt>
    <dd className="wrap-break-word">{children}</dd>
  </div>
);

/**
 * @component DispositionHistory
 * @description A case's interactions and calls as one timeline, newest first. An interaction shows when, who, the outcome, what was promised or
 * paid, the next follow-up, the questions asked with the customer's answers (as they were asked, even if Admin has since changed the question) and
 * remarks, with its call underneath. Calls without an outcome (failed, ringing, missed callbacks from the customer) are short entries of their own.
 * Nothing here is ever overwritten: every save adds a new entry. The newest entry's marker is highlighted.
 */
export const DispositionHistory = ({ items, calls }: { items: DispositionItem[]; calls: CallItem[] }) => {
  const callById = new Map(calls.map((c) => [c.id, c]));
  // Interactions are numbered from the first one (items arrive newest first).
  const numberOf = new Map(items.map((d, i) => [d.id, items.length - i]));
  const entries: Entry[] = [
    ...items.map((d) => ({ at: d.createdAt, key: d.id, outcome: d, call: d.callId ? callById.get(d.callId) : undefined })),
    ...calls.filter((c) => !c.dispositionId).map((c) => ({ at: c.startedAt, key: c.id, call: c })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No interactions yet</EmptyTitle>
          <EmptyDescription>Calls, outcomes and customer answers on this case will show here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ol className="ml-2 flex flex-col border-l border-border">
      {entries.map(({ key, outcome: d, call }, index) => (
        <li key={key} className="relative flex flex-col gap-2 pb-6 pl-6 last:pb-0">
          {/* Timeline marker sitting on the vertical rule. */}
          <span aria-hidden className={cn("absolute top-1.5 -left-1.25 size-2.5 rounded-full ring-4 ring-card", index === 0 ? "bg-accent" : "bg-border")} />
          {!d && call && <CallLine call={call} withTime />}
          {d && (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">Interaction {numberOf.get(d.id)}</span>
                <OutcomeBadge outcome={d.outcome} detail={d.outcomeDetail} />
                {d.ptpStatus && <PtpStatusBadge status={d.ptpStatus} />}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(d.createdAt), "dd MMM yyyy, h:mm a")} · {d.agent.name}
                </span>
              </div>
              {call && <CallLine call={call} />}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {d.ptpAmount !== null && <Fact label="Promised amount">{formatInr(d.ptpAmount)}</Fact>}
                {d.ptpDate && <Fact label="Promise date">{day(d.ptpDate)}</Fact>}
                {d.paidAmount !== null && <Fact label="Paid amount">{formatInr(d.paidAmount)}</Fact>}
                {d.paymentDate && <Fact label="Payment date">{day(d.paymentDate)}</Fact>}
                {d.remainingAmount !== null && <Fact label="Remaining">{formatInr(d.remainingAmount)}</Fact>}
                {d.transactionRef && <Fact label="Transaction ref">{d.transactionRef}</Fact>}
                {d.outcome === "CALLBACK" && d.nextFollowUpOn && <Fact label="Callback">{`${day(d.nextFollowUpOn)}${d.callbackTime ? `, ${clock(d.callbackTime)}` : ""}`}</Fact>}
                {d.category && <Fact label="Dispute category">{d.category}</Fact>}
                {d.reason && <Fact label="Reason">{d.reason}</Fact>}
                {d.outcome !== "CALLBACK" && d.nextFollowUpOn && <Fact label="Follow-up">{day(d.nextFollowUpOn)}</Fact>}
              </dl>

              {d.responses.length > 0 && (
                <ul className="flex flex-col gap-2 rounded-[14px] border border-border p-3 text-sm">
                  {d.responses.map((r) => (
                    <li key={r.id} className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">{r.questionText}</span>
                      <span className="wrap-break-word font-medium">{r.response}</span>
                      {r.remarks && <span className="wrap-break-word text-xs text-muted-foreground">Remark: {r.remarks}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {d.remarks && <p className="rounded-[14px] bg-muted px-3 py-2 text-sm text-muted-foreground">{d.remarks}</p>}
            </>
          )}
        </li>
      ))}
    </ol>
  );
};
