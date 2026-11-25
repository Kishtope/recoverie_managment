"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersRoundIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { ExportExcelButton } from "@/components/export-excel-button";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSheet, type FilterField } from "@/components/filter-sheet";
import { useMe } from "@/features/auth/hooks/use-me";
import { useGetRetailers } from "@/features/retailers/hooks/use-get-retailers";
import { useTeamOptions } from "@/features/team/hooks/use-team-options";
import { BRANCHES, COMPANIES, OUTCOMES, OUTCOME_LABELS, isWorkerRole } from "@/lib/constants";
import { DPD_BUCKETS, DPD_BUCKET_LABELS } from "@/lib/dpd-bucket";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCasesParams } from "../hooks/use-cases-params";
import { useExportCases } from "../hooks/use-export-cases";
import { useGetLoans } from "../hooks/use-get-loans";
import { AutoAllocateDialog } from "./auto-allocate-dialog";
import { BulkReassignDialog } from "./bulk-reassign-dialog";
import { getCasesColumns } from "./cases-table";

const PAGE_SIZE = 10;

// Static dropdown options; "all" is the default and never appears in the URL.
const COMPANY_OPTIONS = [{ value: "all", label: "All companies" }, ...COMPANIES.map((c) => ({ value: c, label: c }))];
const BRANCH_OPTIONS = [{ value: "all", label: "All branches" }, ...BRANCHES.map((b) => ({ value: b, label: b }))];
const OUTCOME_OPTIONS = [{ value: "all", label: "Any outcome" }, ...OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] }))];
const DPD_OPTIONS = [{ value: "all", label: "Any DPD" }, ...DPD_BUCKETS.map((b) => ({ value: b, label: `DPD ${DPD_BUCKET_LABELS[b]}` }))];
const FLAG_OPTIONS = [
  { value: "all", label: "No flag filter" },
  { value: "field-visit", label: "Field visit flag" },
  { value: "escalated", label: "Escalated" },
  { value: "settlement-pending", label: "Settlement waiting" },
];
// Tabs: a case moves between Today and Follow-up by its follow-up date (IST); Closed holds closed loans.
const STAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "followup", label: "Follow-up" },
  { value: "closed", label: "Closed" },
];

/**
 * @component CasesView
 * @description Cases page. For an agent it is "My cases": their active cases sorted by next follow-up, with follow-up and outcome
 * filters. Admins and managers also get agent / flag filters. Filters, search and page live in the URL; mobiles are masked by the API.
 */
export const CasesView = () => {
  const { data: me } = useMe();
  const isAgent = isWorkerRole(me?.role);
  // Agents and callers use the Follow-ups page as their case list, so send them there.
  const router = useRouter();
  useEffect(() => { if (isAgent) router.replace("/follow-ups"); }, [isAgent, router]);
  const isAdmin = me?.role === "ADMIN";
  const canSeeFlags = me?.role === "ADMIN" || me?.role === "MANAGER";
  // Admin / Manager may run the allocation engine; they and Agency owners may reassign a selection (the API checks scope).
  const canAllocate = canSeeFlags;
  const canSelect = !!me && !isAgent;
  // Case ids ticked in the table (kept while paging) and which dialog is open.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);

  const params = useCasesParams();
  // The search and filters on screen; the list adds paging, the Excel export downloads every match.
  const filterQuery = {
    q: params.q,
    agentId: params.filters.agent,
    company: params.filters.company,
    branch: params.filters.branch,
    stage: params.filters.stage,
    outcome: params.filters.outcome,
    flag: params.filters.flag,
    dpd: params.filters.dpd,
    retailerId: params.filters.retailer,
  };
  const { data, isPending, isError, error, isPlaceholderData } = useGetLoans({ ...filterQuery, page: params.page, pageSize: PAGE_SIZE });
  const { mutate: exportCases, isPending: isExporting } = useExportCases();
  // Only Admins can list every agent for the dropdown (the options endpoint is Admin only).
  const { data: options } = useTeamOptions(isAdmin);
  // Admins can also filter by retailer; the dropdown lists the first 100 (the API's page limit).
  const { data: retailers } = useGetRetailers({ status: "all", q: "", page: 1, pageSize: 100 }, isAdmin);
  const retailerOptions = useMemo(
    () => [{ value: "all", label: "All retailers" }, { value: "none", label: "No retailer" }, ...(retailers?.items ?? []).map((r) => ({ value: r.id, label: r.name }))],
    [retailers],
  );

  // Agent dropdown: everyone who can hold cases, plus "Unassigned" (loans with no active allocation).
  const agentOptions = useMemo(
    () => [
      { value: "all", label: "All agents" },
      { value: "none", label: "Unassigned" },
      ...(options?.agents ?? []).map((a) => ({ value: a.id, label: a.name })),
    ],
    [options],
  );
  const columns = useMemo(() => getCasesColumns({ showAgent: !isAgent, showRetailer: isAdmin }), [isAgent, isAdmin]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  // Filters kept out of the toolbar (they open in the Filters sheet); which ones exist depends on the role.
  const fields: FilterField[] = [
    { key: "dpd", label: "DPD", options: DPD_OPTIONS, value: params.filters.dpd },
    { key: "outcome", label: "Last outcome", options: OUTCOME_OPTIONS, value: params.filters.outcome },
    ...(isAdmin ? [{ key: "agent", label: "Agent", options: agentOptions, value: params.filters.agent }] : []),
    ...(isAdmin ? [{ key: "retailer", label: "Retailer", options: retailerOptions, value: params.filters.retailer }] : []),
    ...(canSeeFlags ? [{ key: "flag", label: "Flag", options: FLAG_OPTIONS, value: params.filters.flag }] : []),
    ...(!isAgent ? [{ key: "company", label: "Company", options: COMPANY_OPTIONS, value: params.filters.company }, { key: "branch", label: "Branch", options: BRANCH_OPTIONS, value: params.filters.branch }] : []),
  ];

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Stage tabs only drive the filter; the table below is shared, so there are no panels. */}
        <Tabs value={params.filters.stage} onValueChange={(v) => params.setFilter("stage", String(v))}>
          <TabsList aria-label="Case tab">
            {STAGE_OPTIONS.map((o) => (
              <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FilterSheet fields={fields} onChange={params.setFilter} onClear={params.clearFilters} description="Narrow the list of cases." />
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, agreement, mobile" />
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-card px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <UsersRoundIcon data-icon="inline-start" />
            Reassign
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} cases` : "No cases"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title={isAgent ? "My cases" : "Cases"}
          description={isAgent ? "Your allocated cases, next follow-up first." : "Loans and who each one is allocated to."}
          actions={
            canSelect && (
              <>
                <ExportExcelButton onClick={() => exportCases(filterQuery)} isPending={isExporting} />
                {canAllocate && (
                  <Button size="sm" variant="outline" onClick={() => setAllocateOpen(true)}>
                    <WandSparklesIcon data-icon="inline-start" />
                    Auto-allocate
                  </Button>
                )}
              </>
            )
          }
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
          rows={data.items} startIndex={(data.page - 1) * data.pageSize}
          getRowKey={(l) => l.id}
          selection={canSelect ? { selected, onChange: setSelected } : undefined}
        />
      )}
      {canAllocate && <AutoAllocateDialog open={allocateOpen} onOpenChange={setAllocateOpen} />}
      {canSelect && <BulkReassignDialog loanIds={[...selected]} open={bulkOpen} onOpenChange={setBulkOpen} onDone={() => setSelected(new Set())} />}
    </EntityContainer>
  );
};
