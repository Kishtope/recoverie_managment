"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  HandCoinsIcon,
  PhoneCallIcon,
  PhoneMissedIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TargetProgress } from "@/components/target-progress";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetAgentDashboard } from "../hooks/use-get-agent-dashboard";
import type { AgentDashboard as AgentDashboardData } from "../types";

// A small uppercase section heading; headings group the page into "do now", "this month" and "my book" so the eye lands on what is urgent first.
const SectionTitle = ({ children }: { children: ReactNode }) => <h2 className="kicker text-muted-foreground">{children}</h2>;

// One queue the agent should work through, as a link to the matching cases. Top: what it is and whether it needs action; middle: the count;
// bottom: a plain-language note and where it leads. A queue with work in it gets an orange top edge and a "Needs action" badge; an empty one stays quiet.
const QueueTile = ({ icon: Icon, label, count, note, href }: { icon: LucideIcon; label: string; count: number; note: string; href: string }) => {
  const urgent = count > 0;
  return (
    <Link href={href} className="group rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <Card className={cn("h-full border-t-4 transition-colors group-hover:bg-muted/50", urgent ? "border-t-accent" : "border-t-border")}>
        <CardContent className="flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", urgent ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="text-sm font-medium leading-snug">{label}</span>
            </div>
            <Badge variant={urgent ? "default" : "outline"} className="shrink-0">
              {urgent ? "Needs action" : "All clear"}
            </Badge>
          </div>
          <span className="display-number text-6xl leading-none">{count}</span>
          <div className="mt-auto flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{note}</p>
            <span className={cn("flex items-center gap-1 text-sm font-medium", urgent ? "text-foreground" : "text-muted-foreground")}>
              {urgent ? "Work these now" : "View cases"}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// One line of the money / book panels: a label and its figure, with an optional muted note under the label.
const FigureRow = ({ label, note, value }: { label: string; note?: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <div className="flex min-w-0 flex-col">
      <span className="text-sm font-medium">{label}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
    <span className="display-number shrink-0 text-2xl">{value}</span>
  </div>
);

// A target with its progress bar: "₹40,000 of ₹1,00,000 recovered".
const TargetRow = ({ done, of, label, pct }: { done: string; of: string; label: string; pct: number | null }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm">
      <strong>{done}</strong> of {of} {label}
    </span>
    <TargetProgress pct={pct} />
  </div>
);

// Placeholder shaped like the loaded page so nothing jumps when the numbers arrive.
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-44 rounded-card" />
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-card" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Skeleton className="h-56 rounded-card" />
      <Skeleton className="h-56 rounded-card" />
    </div>
  </div>
);

// The loaded dashboard.
const DashboardBody = ({ data }: { data: AgentDashboardData }) => {
  const clear = data.todayFollowUps === 0 && data.overdueFollowUps === 0;
  const { target } = data;
  const calls = data.callsToday;
  const connectedPct = calls.total ? Math.round((calls.connected / calls.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* The one thing to do first: today's follow-ups, with a way straight into them. Navy panel so it is the heaviest thing on the page. */}
      <section aria-label="Today" className="overflow-hidden rounded-card bg-primary text-primary-foreground">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex flex-col gap-2">
            <span className="kicker text-primary-foreground/70">Today</span>
            {clear ? (
              <>
                <h2 className="flex items-center gap-3 text-4xl md:text-5xl">
                  <CircleCheckBigIcon className="size-9 shrink-0 md:size-11" aria-hidden />
                  You&apos;re clear for today
                </h2>
                <p className="text-primary-foreground/70">No follow-ups are due and nothing is overdue. Work your cases or pick up new ones.</p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="display-number text-7xl leading-none md:text-8xl">{data.todayFollowUps}</span>
                  <span className="text-xl font-medium">{data.todayFollowUps === 1 ? "follow-up due today" : "follow-ups due today"}</span>
                </div>
                <p className="text-primary-foreground/70">
                  {data.overdueFollowUps > 0 ? `Plus ${data.overdueFollowUps} overdue from earlier days.` : "Nothing overdue from earlier days."}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.todayFollowUps > 0 && (
              <Button variant="accent" size="lg" nativeButton={false} render={<Link href="/cases?followUp=today" />}>
                Start today&apos;s follow-ups
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
            {data.overdueFollowUps > 0 && (
              <Button variant="outline" size="lg" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" nativeButton={false} render={<Link href="/cases?followUp=overdue" />}>
                Clear the overdue
              </Button>
            )}
            {clear && (
              <Button variant="accent" size="lg" nativeButton={false} render={<Link href="/cases" />}>
                Open my cases
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Needs your attention" className="flex flex-col gap-3">
        <SectionTitle>Needs your attention</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <QueueTile
            icon={TriangleAlertIcon}
            label="Overdue follow-ups"
            count={data.overdueFollowUps}
            note={data.overdueFollowUps ? "Missed on an earlier day" : "Nothing overdue"}
            href="/cases?followUp=overdue"
          />
          <QueueTile
            icon={HandCoinsIcon}
            label="Promises due today"
            count={data.duePtps.count}
            note={data.duePtps.count ? `${formatInr(data.duePtps.amount)} promised` : "No promises due"}
            href="/cases?followUp=today&outcome=PTP"
          />
          <QueueTile
            icon={PhoneMissedIcon}
            label="Missed-call callbacks"
            count={data.missedCallbacks}
            note={data.missedCallbacks ? "Customers who called and got no answer" : "No one is waiting for a call back"}
            href="/follow-ups"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section aria-label="This month" className="flex flex-col gap-3">
          <SectionTitle>This month</SectionTitle>
          <Card>
            <CardHeader>
              <CardDescription>Collected so far</CardDescription>
              <CardTitle className="display-number text-5xl leading-none">{formatInr(data.collectedThisMonth)}</CardTitle>
              <CardDescription>From outcomes you recorded, not bank data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {target ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-4">
                    <span className="kicker text-muted-foreground">My target</span>
                    {target.collectionAmount !== null && <TargetRow done={formatInr(target.collected)} of={formatInr(target.collectionAmount)} label="recovered" pct={target.collectedPct} />}
                    {target.casesResolved !== null && <TargetRow done={String(target.resolved)} of={String(target.casesResolved)} label="cases resolved" pct={target.resolvedPct} />}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No target is set for this month.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-label="My book" className="flex flex-col gap-3">
          <SectionTitle>My book</SectionTitle>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <FigureRow label="My cases" value={String(data.totalCases)} />
              <Separator />
              <FigureRow label="Due amount" note="Overdue across your cases" value={formatInr(data.dueAmount)} />
              <Separator />
              <div className="flex flex-col gap-2">
                <FigureRow label="Calls today" note="Connected out of dialled" value={`${calls.connected} / ${calls.total}`} />
                <Progress value={connectedPct} aria-label="Calls connected" className="flex-nowrap gap-0" />
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/cases" />}>
              <BriefcaseIcon data-icon="inline-start" />
              My cases
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/calls" />}>
              <PhoneCallIcon data-icon="inline-start" />
              My calls
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/follow-ups" />}>
              <CalendarClockIcon data-icon="inline-start" />
              Follow-ups
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * @component AgentDashboard
 * @description Agent home, ordered by urgency: a navy "Today" panel with the follow-ups due and a button into them, the three queues that need
 * action (overdue follow-ups, promises due today, missed-call callbacks), then this month's collection with the agent's targets and a summary of their
 * book (cases, due amount, calls today). Every queue opens My cases with the matching filter, so the number and the list always agree.
 */
export const AgentDashboard = () => {
  const { data, isPending, isError, error } = useGetAgentDashboard();

  return (
    <EntityContainer header={<EntityHeader title="Dashboard" description="Your day at a glance." />}>
      {isPending ? <DashboardSkeleton /> : isError ? <ErrorView message={getErrorMessage(error, "Couldn't load the dashboard.")} /> : <DashboardBody data={data} />}
    </EntityContainer>
  );
};
