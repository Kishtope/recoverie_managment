"use client";

import { format, parse } from "date-fns";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { OUTCOME_LABELS, type OUTCOMES } from "@/lib/constants";
import { DPD_BUCKET_LABELS, type DpdBucket } from "@/lib/dpd-bucket";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetTeamCharts } from "../hooks/use-team-dashboard";
import type { TeamFilters } from "../types";

const amountConfig = { amount: { label: "Collected", color: "var(--chart-1)" } } satisfies ChartConfig;
const countConfig = { count: { label: "Cases", color: "var(--chart-2)" } } satisfies ChartConfig;
const dpdConfig = { cases: { label: "Cases", color: "var(--chart-3)" } } satisfies ChartConfig;

// A card with a title and a fixed-height chart area.
const ChartCard = ({ title, description, children, className }: { title: string; description: string; children: React.ReactNode; className?: string }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// "PAID" -> "Paid"; the pseudo outcome PENDING reads "No outcome".
const outcomeLabel = (outcome: string) => (outcome === "PENDING" ? "No outcome" : (OUTCOME_LABELS[outcome as (typeof OUTCOMES)[number]] ?? outcome));

/**
 * @component TeamCharts
 * @description The three dashboard charts: money collected per day (with the daily target line when a target is set in Settings),
 * loans by latest outcome, and cases by DPD bucket. All read from one endpoint so they always agree with the cards.
 */
export const TeamCharts = ({ filters }: { filters: TeamFilters }) => {
  const { data, isPending, isError, error } = useGetTeamCharts(filters);

  if (isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className={i === 0 ? "h-80 rounded-card lg:col-span-2" : "h-72 rounded-card"} />
        ))}
      </div>
    );
  }
  if (isError) return <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't load the charts.")}</p>;

  const daily = data.daily.map((d) => ({ ...d, label: format(parse(d.day, "yyyy-MM-dd", new Date()), "d MMM") }));
  const outcomes = data.outcomes.map((o) => ({ ...o, label: outcomeLabel(o.outcome) }));
  const dpd = data.dpd.map((d) => ({ ...d, label: DPD_BUCKET_LABELS[d.bucket as DpdBucket] }));

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <ChartCard className="lg:col-span-2" title="Daily collection" description={data.dailyTarget === null ? "Money collected each day." : "Money collected each day against the daily target."}>
        <ChartContainer config={amountConfig} className="h-72 w-full">
          <BarChart data={daily} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatInr(v)} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatInr(Number(value))} />} />
            {data.dailyTarget !== null && <ReferenceLine y={data.dailyTarget} stroke="var(--chart-4)" strokeDasharray="4 4" />}
            <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Outcomes" description="Loans by their latest outcome in this period.">
        <ChartContainer config={countConfig} className="h-64 w-full">
          <BarChart data={outcomes} layout="vertical" accessibilityLayer>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="DPD buckets" description="Cases by days past due; hover for the due amount.">
        <ChartContainer config={dpdConfig} className="h-64 w-full">
          <BarChart data={dpd} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => `${value} cases · ${formatInr((item.payload as { dueAmount: number }).dueAmount)} due`} />} />
            <Bar dataKey="cases" fill="var(--color-cases)" radius={4} />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
};
