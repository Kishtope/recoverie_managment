"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { useGetLoans } from "@/features/cases/hooks/use-get-loans";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useImportsParams } from "../hooks/use-imports-params";
import { ImportDetailDialog } from "./import-detail-dialog";
import { ImportUploadDialog } from "./import-upload-dialog";
import { uploadedColumns } from "./imports-table";

const PAGE_SIZE = 10;

/**
 * @component ImportsView
 * @description Admin Customers page: the uploaded customer details in a searchable table (newest first, search in the URL), with an
 * "Upload customers" dialog that can also auto-allocate the new cases. Rejected rows of an upload open in their own dialog.
 */
export const ImportsView = () => {
  const params = useImportsParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetLoans({
    q: params.q,
    agentId: "",
    company: "",
    branch: "",
    followUp: "",
    outcome: "",
    flag: "",
    sort: "recent",
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  // Whether the upload dialog is open, and the upload whose rejected rows are open.
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openRunId, setOpenRunId] = useState<string>();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear search</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, agreement, mobile" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} customers` : "No customers"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Customers"
          description="Upload customer details from an Excel or CSV file, and allocate them to callers."
          newButtonLabel="Upload customers"
          onNew={() => setUploadOpen(true)}
        />
      }
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading customers…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load customers.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No customers"
          message={params.hasActiveFilters ? "No customers match this search." : "Upload a customer details file to get started."}
          onNew={params.hasActiveFilters ? undefined : () => setUploadOpen(true)}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={uploadedColumns} rows={data.items} startIndex={(data.page - 1) * data.pageSize} getRowKey={(l) => l.id} />
      )}

      <ImportUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onOpenErrors={setOpenRunId} />
      <ImportDetailDialog runId={openRunId} onClose={() => setOpenRunId(undefined)} />
    </EntityContainer>
  );
};
