"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { StatCard } from "@/components/stat-card";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useGetRetailerDashboard } from "../hooks/use-get-retailers";
import { RETAILER_PERIODS, RETAILER_PERIOD_LABELS, type RetailerPeriod } from "../types";
import { retailerPerformanceColumns } from "./retailer-performance-table";

/**
 * @component RetailerOverviewTab
 * @description Overview tab of the Retailers page: stat cards (retailers, customers held, customers still without a retailer, outstanding,
 * collected) and the per-retailer performance table. Only "collected" follows the period filter; the other numbers are as of now.
 */
export const RetailerOverviewTab = ({
  period,
  onPeriodChange,
}: {
  period: RetailerPeriod;
  onPeriodChange: (period: RetailerPeriod) => void;
}) => {
  const { data, isPending, isError, error, isPlaceholderData } = useGetRetailerDashboard(period);

  if (isPending) return <LoadingView message="Loading overview…" />;
  if (isError) return <ErrorView message={getErrorMessage(error, "Couldn't load the overview.")} />;

  const { totals } = data;
  return (
    <div className={cn("flex flex-col gap-4", isPlaceholderData && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Customers and outstanding are as of today. Collected follows the period.</p>
        <ToggleGroup variant="outline" aria-label="Period" value={[period]} onValueChange={(v) => v[0] && onPeriodChange(v[0] as RetailerPeriod)}>
          {RETAILER_PERIODS.map((p) => (
            <ToggleGroupItem key={p} value={p}>{RETAILER_PERIOD_LABELS[p]}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Retailers" value={totals.retailers.toLocaleString("en-IN")} note={`${totals.active} active · ${totals.inactive} inactive`} />
        <StatCard label="Customers held" value={totals.customers.toLocaleString("en-IN")} note="Across all retailers" />
        <StatCard label="Caller customers" value={totals.unassignedCustomers.toLocaleString("en-IN")} note="Not held by a retailer" />
        <StatCard label="Outstanding" value={formatInr(totals.outstanding)} note="Overdue on active loans" />
        <StatCard label="Collected" value={formatInr(totals.collected)} note={RETAILER_PERIOD_LABELS[period]} />
      </div>

      {data.items.length === 0 ? (
        <EntityEmptyView empty_label="No retailers" message="No retailers have been loaded yet." />
      ) : (
        <>
          <h2 className="text-lg">Retailer performance</h2>
          <DataTable columns={retailerPerformanceColumns} rows={data.items} getRowKey={(r) => r.retailerId} />
        </>
      )}
    </div>
  );
};
