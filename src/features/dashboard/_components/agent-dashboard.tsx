"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { TargetProgress } from "@/components/target-progress";
import { Card, CardContent } from "@/components/ui/card";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetAgentDashboard } from "../hooks/use-get-agent-dashboard";

/**
 * @component AgentDashboard
 * @description Agent home: today's and overdue follow-ups, PTPs due today, missed-call callbacks, calls today, case count, due amount and this month's collected amount.
 * Every card that counts cases opens My cases with the matching filter, so the number and the list always agree.
 */
export const AgentDashboard = () => {
  const { data, isPending, isError, error } = useGetAgentDashboard();

  return (
    <EntityContainer header={<EntityHeader title="Dashboard" description="Your day at a glance." />}>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </div>
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load the dashboard.")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.target && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent className="flex flex-col gap-4">
                <span className="kicker text-muted-foreground">My target this month</span>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.target.collectionAmount !== null && (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        <strong>{formatInr(data.target.collected)}</strong> of {formatInr(data.target.collectionAmount)} recovered
                      </span>
                      <TargetProgress pct={data.target.collectedPct} />
                    </div>
                  )}
                  {data.target.casesResolved !== null && (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        <strong>{data.target.resolved}</strong> of {data.target.casesResolved} cases resolved
                      </span>
                      <TargetProgress pct={data.target.resolvedPct} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <StatCard label="Today's follow-ups" value={String(data.todayFollowUps)} href="/cases?followUp=today" />
          <StatCard label="Overdue follow-ups" value={String(data.overdueFollowUps)} href="/cases?followUp=overdue" />
          <StatCard
            label="PTPs due today"
            value={String(data.duePtps.count)}
            note={data.duePtps.count ? `${formatInr(data.duePtps.amount)} promised` : undefined}
            href="/cases?followUp=today&outcome=PTP"
          />
          <StatCard label="Missed-call callbacks" value={String(data.missedCallbacks)} note="Customers who called and got no answer" href="/follow-ups" />
          <StatCard label="Calls today" value={`${data.callsToday.connected} / ${data.callsToday.total}`} note="Connected / total" href="/calls" />
          <StatCard label="My cases" value={String(data.totalCases)} href="/cases" />
          <StatCard label="Due amount" value={formatInr(data.dueAmount)} note="Overdue across your cases" href="/cases" />
          <StatCard label="Collected this month" value={formatInr(data.collectedThisMonth)} note="From outcomes you recorded, not bank data" />
        </div>
      )}
    </EntityContainer>
  );
};
