"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { DatePicker } from "@/components/date-picker";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSelect } from "@/components/filter-select";
import { useMe } from "@/features/auth/hooks/use-me";
import { useTeamOptions } from "@/features/team/hooks/use-team-options";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCallsParams } from "../hooks/use-calls-params";
import { useGetCalls } from "../hooks/use-get-calls";
import { getCallsColumns } from "./calls-table";

const PAGE_SIZE = 10;

// Toolbar options; "all" is the default and never appears in the URL.
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "CONNECTED", label: "Connected" },
  { value: "MISSED", label: "Missed" },
  { value: "FAILED", label: "Failed" },
];
const DIRECTION_OPTIONS = [
  { value: "all", label: "Any direction" },
  { value: "OUTBOUND", label: "Outbound" },
  { value: "INBOUND", label: "Inbound" },
];
const UNMATCHED_OPTIONS = [
  { value: "all", label: "All numbers" },
  { value: "1", label: "Unmatched" },
];

/**
 * @component CallsView
 * @description Calls page. An agent sees "My calls"; Manager / Agency owner / Admin see "Calls" with an agent column. Filters, search and
 * page live in the URL. Admins also get an agent filter and an "Unmatched" filter (inbound calls whose number matched no case).
 * The numbers here are the ones to compare with the telephony provider's report.
 */
export const CallsView = () => {
  const { data: me } = useMe();
  const isAgent = me?.role === "AGENT";
  const isAdmin = me?.role === "ADMIN";

  const params = useCallsParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetCalls({
    status: params.filters.status,
    direction: params.filters.direction,
    date: params.filters.date,
    agentId: params.filters.agent,
    callback: "",
    unmatched: params.filters.unmatched,
    q: params.q,
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  // Only Admins can list every agent for the dropdown (the options endpoint is Admin only).
  const { data: options } = useTeamOptions(isAdmin);
  const agentOptions = useMemo(
    () => [{ value: "all", label: "All agents" }, ...(options?.agents ?? []).map((a) => ({ value: a.id, label: a.name }))],
    [options],
  );
  const columns = useMemo(() => getCallsColumns({ showAgent: !isAgent }), [isAgent]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup variant="outline" aria-label="Status" value={[params.filters.status]} onValueChange={(v) => v[0] && params.setFilter("status", v[0])}>
          {STATUS_OPTIONS.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FilterSelect value={params.filters.direction} onChange={(v) => params.setFilter("direction", v)} options={DIRECTION_OPTIONS} ariaLabel="Filter by direction" />
        <DatePicker value={params.filters.date} onChange={(v) => params.setFilter("date", v)} clearable placeholder="Any day" />
        {isAdmin && <FilterSelect value={params.filters.agent} onChange={(v) => params.setFilter("agent", v)} options={agentOptions} ariaLabel="Filter by agent" />}
        {isAdmin && <FilterSelect value={params.filters.unmatched} onChange={(v) => params.setFilter("unmatched", v)} options={UNMATCHED_OPTIONS} ariaLabel="Filter unmatched calls" />}
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search customer, agreement" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} calls` : "No calls"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={<EntityHeader title={isAgent ? "My calls" : "Calls"} description={isAgent ? "Every call you placed or missed, newest first." : "Calls placed and received, newest first."} />}
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading calls…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load calls.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No calls" message={params.hasActiveFilters ? "No calls match these filters." : "Calls you place from a case will show here."} />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(c) => c.id} />
      )}
    </EntityContainer>
  );
};
