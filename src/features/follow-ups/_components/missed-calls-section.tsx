"use client";

import Link from "next/link";
import { format } from "date-fns";
import { PhoneIncomingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCalls } from "@/features/calls/hooks/use-get-calls";
import type { CallItem } from "@/features/calls/types";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";

// How many callbacks show before pointing to the full Calls list.
const SECTION_SIZE = 20;

// One customer who called and got no answer: who, when, what they owe, and a button that opens the case to call back.
const MissedCallRow = ({ call }: { call: CallItem }) => (
  <li className="flex items-center gap-3 rounded-[14px] border border-border p-3">
    <PhoneIncomingIcon className="size-4 shrink-0 text-muted-foreground" />
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate font-medium">{call.customerName}</span>
      <span className="truncate text-xs text-muted-foreground">
        Called {format(new Date(call.startedAt), "dd MMM, h:mm a")} · Overdue {formatInr(call.overdueAmount)}
      </span>
    </div>
    <Button size="sm" variant="accent" nativeButton={false} render={<Link href={`/cases/${call.loanId}`} />}>
      Call back
    </Button>
  </li>
);

/**
 * @component MissedCallsSection
 * @description The agent's callback queue at the top of Follow-ups: customers who called and nobody answered, oldest first.
 * It reads the same list API as the Calls page (inbound, missed, not yet called back), so the counts always match.
 */
export const MissedCallsSection = () => {
  const { data, isPending, isError, error } = useGetCalls({
    status: "MISSED",
    direction: "INBOUND",
    callback: "pending",
    date: "",
    agentId: "",
    unmatched: "",
    q: "",
    page: 1,
    pageSize: SECTION_SIZE,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Missed calls{data ? ` (${data.total})` : ""}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't load missed calls.")}</p>
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers waiting for a callback.</p>
        ) : (
          <ul className="flex flex-col gap-2">{data.items.filter((c) => c.loanId).map((c) => <MissedCallRow key={c.id} call={c} />)}</ul>
        )}
      </CardContent>
    </Card>
  );
};
