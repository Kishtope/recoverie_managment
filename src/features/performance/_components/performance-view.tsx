"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSelect } from "@/components/filter-select";
import { useTeamParams } from "@/features/dashboard/hooks/use-team-params";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { fyMonths, recentFys } from "@/lib/fy";
import { formatDuration } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import { cn } from "@/lib/utils";
import { useGetPerformance } from "../hooks/use-get-performance";
import type { PerformanceRow } from "../types";

// Callback % as "50%", or "-" when no customer missed-call came in.
const pct = (v: number | null) => (v === null ? "-" : `${v}%`);

// Columns of the team-performance table; the name cell identifies the agent, the whole row opens their calls.
const columns: DataTableColumn<PerformanceRow>[] = [
  {
    key: "name",
    header: "Agent",
    cell: (p) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate font-medium">{p.name}</span>
      </div>
    ),
  },
  { key: "calls", header: "Calls", cell: (p) => p.calls },
  { key: "connected", header: "Connected", cell: (p) => p.connected },
  { key: "missed", header: "Missed", cell: (p) => p.missed },
  { key: "failed", header: "Failed", cell: (p) => p.failed },
  { key: "avgTalk", header: "Avg talk time", cell: (p) => formatDuration(p.avgTalkSec) },
  { key: "ptpTaken", header: "PTP taken", cell: (p) => p.ptpTaken },
  { key: "ptpKept", header: "PTP kept", cell: (p) => p.ptpKept },
  { key: "inboundMissed", header: "Customer missed calls", cell: (p) => p.inboundMissed },
  { key: "callback", header: "Callback %", cell: (p) => pct(p.callbackPct) },
];

/**
 * @component PerformanceView
 * @description Team performance for Admin / Manager / Agency owner: per agent calls, connected, missed, average talk time, promises taken and
 * kept, and how many customer missed-calls were called back. Filters (year, month, agent) live in the URL; a row opens that agent's calls.
 */
export const PerformanceView = () => {
  const router = useRouter();
  const params = useTeamParams();
  const f = params.filters;
  const { data: agents } = useScopeAgents(true);
  const { data, isPending, isError, error, isPlaceholderData } = useGetPerformance({ fy: f.fy, month: f.month, agentId: f.agent });

  const fyOptions = useMemo(() => recentFys().map((fy) => ({ value: fy, label: `FY ${fy}` })), []);
  const monthOptions = useMemo(
    () => [{ value: "all", label: "Whole year" }, ...fyMonths(f.fy).map((m) => ({ value: m, label: format(parse(m, "yyyy-MM", new Date()), "MMM yyyy") }))],
    [f.fy],
  );
  const agentOptions = useMemo(() => [{ value: "all", label: "All agents" }, ...(agents ?? []).map((a) => ({ value: a.id, label: a.name }))], [agents]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect value={f.fy} onChange={(fy) => params.setFilters({ fy, month: "all" })} options={fyOptions} ariaLabel="Financial year" />
      <FilterSelect value={f.month} onChange={(v) => params.setFilter("month", v)} options={monthOptions} ariaLabel="Month" />
      <FilterSelect value={f.agent} onChange={(v) => params.setFilter("agent", v)} options={agentOptions} ariaLabel="Filter by agent" />
      {params.hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={params.clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <EntityContainer header={<EntityHeader title="Team performance" description="Calls and promises per agent for the selected period." />} search={toolbar}>
      {isPending ? (
        <LoadingView message="Loading performance…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load performance.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No agents" message="No agents in your team yet." />
      ) : (
        <DataTable
          className={cn(isPlaceholderData && "opacity-60")}
          columns={columns}
          rows={data.items}
          getRowKey={(p) => p.agentId}
          onRowClick={(p) => router.push(`/calls?agent=${p.agentId}`)}
        />
      )}
    </EntityContainer>
  );
};
