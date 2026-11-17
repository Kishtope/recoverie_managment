"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetImports } from "../hooks/use-get-imports";
import { useImportsParams } from "../hooks/use-imports-params";
import { ImportDetailDialog } from "./import-detail-dialog";
import { ImportUpload } from "./import-upload";
import { getImportColumns } from "./imports-table";
import { UnmatchedHubUsers } from "./unmatched-hub-users";

const PAGE_SIZE = 10;

// Toolbar options; "all" is the default and never appears in the URL.
const TYPE_OPTIONS = [{ value: "all", label: "All types" }, { value: "LOANS", label: "Loans" }, { value: "ALLOCATIONS", label: "Allocations" }];
const STATUS_OPTIONS = [{ value: "all", label: "Any status" }, { value: "DONE", label: "Done" }, { value: "FAILED", label: "Failed" }];

// One filter as an always-one-selected ToggleGroup (a re-click that would empty it is ignored).
const FilterToggle = ({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) => (
  <ToggleGroup variant="outline" aria-label={label} value={[value]} onValueChange={(v) => v[0] && onChange(v[0])}>
    {options.map((o) => (
      <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
    ))}
  </ToggleGroup>
);

/**
 * @component ImportsView
 * @description Admin Imports page: upload a Loans/Allocations file, see the run summary, browse past runs (filters in the URL)
 * and open a run to see its rejected rows. Also lists hub users that still need an app account.
 */
export const ImportsView = () => {
  const params = useImportsParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetImports({
    type: params.filters.type,
    status: params.filters.status,
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  // Run whose details are open.
  const [openRunId, setOpenRunId] = useState<string>();

  const columns = useMemo(() => getImportColumns({ onOpen: (r) => setOpenRunId(r.id) }), []);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-4">
      <ImportUpload onOpenErrors={setOpenRunId} />
      <UnmatchedHubUsers />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterToggle value={params.filters.type} onChange={(v) => params.setFilter("type", v)} options={TYPE_OPTIONS} label="Filter by type" />
          <FilterToggle value={params.filters.status} onChange={(v) => params.setFilter("status", v)} options={STATUS_OPTIONS} label="Filter by status" />
          {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        </div>
        {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} imports` : "No imports"}</p>}
      </div>
    </div>
  );

  return (
    <EntityContainer
      header={<EntityHeader title="Imports" description="Bring loans, customers and allocations in from the hub." />}
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading imports…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load imports.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No imports" message={params.hasActiveFilters ? "No imports match these filters." : "Upload a Loans file to get started."} />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(r) => r.id} />
      )}

      <ImportDetailDialog runId={openRunId} onClose={() => setOpenRunId(undefined)} />
    </EntityContainer>
  );
};
