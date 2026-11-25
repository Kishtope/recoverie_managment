"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { ErrorView } from "@/components/entity-components/error-view";
import { ExportExcelButton } from "@/components/export-excel-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useExportLoanOverdue } from "../hooks/use-export-loan-overdue";
import { useGetTeamSummary, useGetTeamUsers } from "../hooks/use-team-dashboard";
import { useTeamParams } from "../hooks/use-team-params";
import { CollectionHero } from "./collection-hero";
import { SummaryStrip } from "./summary-strip";
import { TeamCharts } from "./team-charts";
import { TeamFilters } from "./team-filters";
import { getTeamUserColumns } from "./team-users-table";

const PAGE_SIZE = 10;

/**
 * @component TeamDashboard
 * @description Home page for Admin, Manager and Agency owner. It leads with what was collected and where every case stands (CollectionHero),
 * then four supporting numbers, the charts and the agent table. Filters (FY, month, company, branch, agency, agent, DPD) sit on top and live
 * in the URL. Every number is for the caller's own scope and comes from the same server code as the Recovery page and the Excel export.
 */
export const TeamDashboard = () => {
  const router = useRouter();
  const params = useTeamParams();
  const summary = useGetTeamSummary(params.query);
  const users = useGetTeamUsers({ ...params.query, sort: "collected", page: params.page, pageSize: PAGE_SIZE });
  // "Export Excel" downloads the overdue cases in the hub sheet format for the filters on screen.
  const { mutate: exportOverdue, isPending: isExporting } = useExportLoanOverdue();
  const columns = useMemo(() => getTeamUserColumns(), []);

  const data = summary.data;
  const totalPages = users.data ? Math.ceil(users.data.total / users.data.pageSize) : 0;

  // TODO: Export Excel is hidden until the exported Daily MIS file is checked (it came out empty for some filters). Re-add: import ExportMisButton from "@/features/reports/_components/export-mis-button" and render <ExportMisButton query={params.query} />.
  return (
    <EntityContainer
      header={<EntityHeader title="Dashboard" description="How recovery is going across your team." />}
      search={<TeamFilters params={params} actions={<ExportExcelButton onClick={() => exportOverdue(params.query)} isPending={isExporting} />} />}
    >
      {summary.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      ) : summary.isError || !data ? (
        <ErrorView message={getErrorMessage(summary.error, "Couldn't load the dashboard.")} />
      ) : (
        <div className={cn("flex flex-col gap-4", summary.isPlaceholderData && "opacity-60")}>
          <CollectionHero summary={data.summary} period={data.period} source={data.collectedSource} targetPct={data.targetPct} />
          <SummaryStrip summary={data.summary} filters={params.query} />
        </div>
      )}

      <TeamCharts filters={params.query} />

      <section aria-label="Recovery by agent" className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl">Recovery by agent</h2>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/recovery" />}>
            Open full table
          </Button>
        </div>
        {users.isPending ? (
          <Skeleton className="h-40 w-full rounded-card" />
        ) : users.isError ? (
          <ErrorView message={getErrorMessage(users.error, "Couldn't load the agent table.")} />
        ) : users.data.items.length === 0 ? (
          <EntityEmptyView empty_label="No agents" message={params.hasActiveFilters ? "No cases match these filters." : "No cases are allocated yet."} />
        ) : (
          <>
            <DataTable
              className={cn(users.isPlaceholderData && "opacity-60")}
              columns={columns}
              rows={users.data.items} startIndex={(users.data.page - 1) * users.data.pageSize}
              getRowKey={(u) => u.agentId ?? "unassigned"}
              onRowClick={(u) => u.agentId && router.push(`/cases?agent=${u.agentId}`)}
            />
            <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={users.isPlaceholderData} />
          </>
        )}
      </section>
    </EntityContainer>
  );
};
