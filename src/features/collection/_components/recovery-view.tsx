"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { ExportExcelButton } from "@/components/export-excel-button";
import { FilterSelect } from "@/components/filter-select";
import { TeamFilters } from "@/features/dashboard/_components/team-filters";
import { getTeamUserColumns } from "@/features/dashboard/_components/team-users-table";
import { useExportTeamUsers } from "@/features/dashboard/hooks/use-export-team-users";
import { useGetTeamUsers } from "@/features/dashboard/hooks/use-team-dashboard";
import { useTeamParams } from "@/features/dashboard/hooks/use-team-params";
import { AddPaymentDialog } from "@/features/payments/_components/add-payment-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

// Columns the table can be sorted by (biggest first).
const SORT_OPTIONS = [
  { value: "collected", label: "Sort: Collected" },
  { value: "allocated", label: "Sort: Allocated" },
  { value: "dueAmount", label: "Sort: Due ₹" },
  { value: "pendingAmount", label: "Sort: Pending ₹" },
  { value: "collectionPct", label: "Sort: Collection %" },
  { value: "paid", label: "Sort: Paid" },
  { value: "ptp", label: "Sort: PTP" },
  { value: "pending", label: "Sort: Pending cases" },
];

/**
 * @component RecoveryView
 * @description The user-wise recovery table on its own page: every agent in the caller's scope with the same filters, a sort choice,
 * paging and the Excel export. Clicking a row opens that agent's cases. Numbers come from the same endpoint as the dashboard table.
 */
export const RecoveryView = () => {
  const router = useRouter();
  const params = useTeamParams();
  // Whether the Add payment flow is open.
  const [addingPayment, setAddingPayment] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useGetTeamUsers({ ...params.query, sort: params.sort, page: params.page, pageSize: PAGE_SIZE });
  const { mutate: exportUsers, isPending: isExporting } = useExportTeamUsers();
  const columns = useMemo(() => getTeamUserColumns(), []);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-2">
      <TeamFilters
        params={params}
        // TODO: Export Excel is hidden until the exported Daily MIS file is checked (it came out empty for some filters). Re-add: import ExportMisButton from "@/features/reports/_components/export-mis-button" and render <ExportMisButton query={params.query} />.
        actions={
          <>
            <ExportExcelButton onClick={() => exportUsers({ ...params.query, sort: params.sort })} isPending={isExporting} />
            <FilterSelect value={params.sort} onChange={(v) => params.setFilter("sort", v)} options={SORT_OPTIONS} ariaLabel="Sort by" className="w-48" />
          </>
        }
      />
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} agents` : "No agents"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Recovery"
          description="How each agent is doing: cases, conversations, outcomes and money collected."
          newButtonLabel="Add payment"
          onNew={() => setAddingPayment(true)}
        />
      }
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading recovery…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load recovery.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No agents" message={params.hasActiveFilters ? "No cases match these filters." : "No cases are allocated yet."} />
      ) : (
        <>
          <DataTable
            className={cn(isPlaceholderData && "opacity-60")}
            columns={columns}
            rows={data.items}
            getRowKey={(u) => u.agentId ?? "unassigned"}
            onRowClick={(u) => u.agentId && router.push(`/cases?agent=${u.agentId}`)}
          />
          <p className="text-xs text-muted-foreground">{data.collectedSource === "payments" ? "Collected is from imported payments." : "Collected is from outcomes agents recorded, not bank data."}</p>
        </>
      )}
      <AddPaymentDialog open={addingPayment} onOpenChange={setAddingPayment} />
    </EntityContainer>
  );
};
