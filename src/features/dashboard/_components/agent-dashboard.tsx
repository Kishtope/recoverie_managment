"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetAgentDashboard } from "../hooks/use-get-agent-dashboard";

// One stat card: small label, big number, optional muted line; a link when `href` is given.
const StatCard = ({ label, value, note, href, className }: { label: string; value: string; note?: string; href?: string; className?: string }) => {
  const card = (
    <Card className={cn(href && "transition-colors hover:bg-muted/50", className)}>
      <CardContent className="flex flex-col gap-1">
        <span className="kicker text-muted-foreground">{label}</span>
        <span className="display-number text-4xl">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
};

/**
 * @component AgentDashboard
 * @description Agent home: today's and overdue follow-ups, PTPs due today, case count, due amount and this month's collected amount.
 * Every card that counts cases opens My cases with the matching filter, so the number and the list always agree.
 */
export const AgentDashboard = () => {
  const { data, isPending, isError, error } = useGetAgentDashboard();

  return (
    <EntityContainer header={<EntityHeader title="Dashboard" description="Your day at a glance." />}>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </div>
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load the dashboard.")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Today's follow-ups" value={String(data.todayFollowUps)} href="/cases?followUp=today" />
          <StatCard label="Overdue follow-ups" value={String(data.overdueFollowUps)} href="/cases?followUp=overdue" />
          <StatCard
            label="PTPs due today"
            value={String(data.duePtps.count)}
            note={data.duePtps.count ? `${formatInr(data.duePtps.amount)} promised` : undefined}
            href="/cases?followUp=today&outcome=PTP"
          />
          <StatCard label="My cases" value={String(data.totalCases)} href="/cases" />
          <StatCard label="Due amount" value={formatInr(data.dueAmount)} note="Overdue across your cases" href="/cases" />
          <StatCard label="Collected this month" value={formatInr(data.collectedThisMonth)} note="From outcomes you recorded, not bank data" />
        </div>
      )}
    </EntityContainer>
  );
};
