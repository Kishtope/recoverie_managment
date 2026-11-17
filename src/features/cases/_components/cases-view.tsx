"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSheet, type FilterField } from "@/components/filter-sheet";
import { useMe } from "@/features/auth/hooks/use-me";
import { useTeamOptions } from "@/features/team/hooks/use-team-options";
import { BRANCHES, COMPANIES, OUTCOMES, OUTCOME_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCasesParams } from "../hooks/use-cases-params";
import { useGetLoans } from "../hooks/use-get-loans";
import { getCasesColumns } from "./cases-table";

const PAGE_SIZE = 10;

// Static dropdown options; "all" is the default and never appears in the URL.
const COMPANY_OPTIONS = [{ value: "all", label: "All companies" }, ...COMPANIES.map((c) => ({ value: c, label: c }))];
const BRANCH_OPTIONS = [{ value: "all", label: "All branches" }, ...BRANCHES.map((b) => ({ value: b, label: b }))];
const OUTCOME_OPTIONS = [{ value: "all", label: "Any outcome" }, ...OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] }))];
const FLAG_OPTIONS = [
  { value: "all", label: "No flag filter" },
  { value: "field-visit", label: "Field visit flag" },
  { value: "escalated", label: "Escalated" },
];
const FOLLOW_UP_OPTIONS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
];

/**
 * @component CasesView
 * @description Cases page. For an agent it is "My cases": their active cases sorted by next follow-up, with follow-up and outcome
 * filters. Admins and managers also get agent / flag filters. Filters, search and page live in the URL; mobiles are masked by the API.
 */
export const CasesView = () => {
  const router = useRouter();
  const { data: me } = useMe();
  const isAgent = me?.role === "AGENT";
  const isAdmin = me?.role === "ADMIN";
  const canSeeFlags = me?.role === "ADMIN" || me?.role === "MANAGER";

  const params = useCasesParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetLoans({
    q: params.q,
    agentId: params.filters.agent,
    company: params.filters.company,
    branch: params.filters.branch,
    followUp: params.filters.followUp,
    outcome: params.filters.outcome,
    flag: params.filters.flag,
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  // Only Admins can list every agent for the dropdown (the options endpoint is Admin only).
  const { data: options } = useTeamOptions(isAdmin);

  // Agent dropdown: everyone who can hold cases, plus "Unassigned" (loans with no active allocation).
  const agentOptions = useMemo(
    () => [
      { value: "all", label: "All agents" },
      { value: "none", label: "Unassigned" },
      ...(options?.agents ?? []).map((a) => ({ value: a.id, label: a.name })),
    ],
    [options],
  );
  const columns = useMemo(() => getCasesColumns({ showAgent: !isAgent }), [isAgent]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  // Filters kept out of the toolbar (they open in the Filters sheet); which ones exist depends on the role.
  const fields: FilterField[] = [
    { key: "outcome", label: "Last outcome", options: OUTCOME_OPTIONS, value: params.filters.outcome },
    ...(isAdmin ? [{ key: "agent", label: "Agent", options: agentOptions, value: params.filters.agent }] : []),
    ...(canSeeFlags ? [{ key: "flag", label: "Flag", options: FLAG_OPTIONS, value: params.filters.flag }] : []),
    ...(!isAgent ? [{ key: "company", label: "Company", options: COMPANY_OPTIONS, value: params.filters.company }, { key: "branch", label: "Branch", options: BRANCH_OPTIONS, value: params.filters.branch }] : []),
  ];

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          variant="outline"
          aria-label="Follow-up"
          value={[params.filters.followUp]}
          onValueChange={(v) => v[0] && params.setFilter("followUp", v[0])}
        >
          {FOLLOW_UP_OPTIONS.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FilterSheet fields={fields} onChange={params.setFilter} onClear={params.clearFilters} description="Narrow the list of cases." />
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, agreement, mobile" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} cases` : "No cases"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title={isAgent ? "My cases" : "Cases"}
          description={isAgent ? "Your allocated cases, next follow-up first." : "Loans and who each one is allocated to."}
        />
      }
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading cases…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load cases.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No cases"
          message={
            params.hasActiveFilters
              ? "No cases match these filters."
              : isAgent
                ? "No cases are allocated to you yet."
                : "No loans imported yet. Upload a Loans file on the Imports page."
          }
        />
      ) : (
        <DataTable
          className={cn(isPlaceholderData && "opacity-60")}
          columns={columns}
          rows={data.items}
          getRowKey={(l) => l.id}
          onRowClick={(l) => router.push(`/cases/${l.id}`)}
        />
      )}
    </EntityContainer>
  );
};
