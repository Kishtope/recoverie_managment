"use client";

import Link from "next/link";
import { format, parse } from "date-fns";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OutcomeBadge } from "@/components/outcome-badge";
import { useGetLoans } from "@/features/cases/hooks/use-get-loans";
import type { LoanListItem } from "@/features/cases/types";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";

// How many rows each section shows before pointing to the full "My cases" list.
const SECTION_SIZE = 20;

// One tappable follow-up row: customer, agreement, what is overdue and the last outcome (with the promised amount for a PTP).
const FollowUpRow = ({ loan }: { loan: LoanListItem }) => (
  <li>
    <Link href={`/cases/${loan.id}`} className="flex items-center gap-3 rounded-[14px] border border-border p-3 hover:bg-muted/50">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{loan.customerName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {loan.agreementNo} · Overdue {formatInr(loan.overdueAmount)}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <OutcomeBadge outcome={loan.lastOutcome} />
          {loan.lastPtpAmount !== null && <span className="text-xs text-muted-foreground">{formatInr(loan.lastPtpAmount)}</span>}
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  </li>
);

// "yyyy-MM-dd" as "Wed 19 Nov" for the day headings.
const dayHeading = (d: string) => format(parse(d, "yyyy-MM-dd", new Date()), "EEE dd MMM");

/**
 * @component FollowUpSection
 * @description One bucket of the agent's follow-ups (Overdue, Today, Upcoming) read from the same list API as My cases, so counts match.
 * @param followUp The API filter for this bucket ("overdue", "today", "next7").
 * @param viewAllFilter The My cases filter the "View all" link opens.
 * @param groupByDay Groups rows under day headings (used for the upcoming week).
 */
export const FollowUpSection = ({
  title,
  followUp,
  viewAllFilter,
  groupByDay,
}: {
  title: string;
  followUp: string;
  viewAllFilter: string;
  groupByDay?: boolean;
}) => {
  const { data, isPending, isError, error } = useGetLoans({
    q: "",
    agentId: "",
    company: "",
    branch: "",
    followUp,
    outcome: "",
    flag: "",
    page: 1,
    pageSize: SECTION_SIZE,
  });

  // Rows grouped by their follow-up day (rows already arrive sorted by date).
  const groups = groupByDay && data ? Object.entries(Object.groupBy(data.items, (l) => l.nextFollowUpOn ?? "")) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          {title}
          {data ? ` (${data.total})` : ""}
        </CardTitle>
        {data && data.total > 0 && (
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/cases?followUp=${viewAllFilter}`} />}>
            View all
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't load follow-ups.")}</p>
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : groups ? (
          <div className="flex flex-col gap-4">
            {groups.map(([day, rows]) => (
              <div key={day} className="flex flex-col gap-2">
                <h3 className="kicker text-muted-foreground">{dayHeading(day)}</h3>
                <ul className="flex flex-col gap-2">{rows?.map((l) => <FollowUpRow key={l.id} loan={l} />)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">{data.items.map((l) => <FollowUpRow key={l.id} loan={l} />)}</ul>
        )}
      </CardContent>
    </Card>
  );
};
