"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetRecruiterEscalations } from "../hooks/use-get-recruiters";
import type { RecruitersParams } from "../hooks/use-recruiters-params";
import { getRecruiterEscalationsColumns } from "./recruiter-escalations-table";
import { RecruiterFilter } from "./recruiter-filter";

const PAGE_SIZE = 10;

/**
 * @component RecruiterEscalationsTab
 * @description History of cases that moved from a recruiter to a caller after the time limit: who held it, who has it now, and what has been
 * paid since. Recruiter filter and search live in the URL.
 * @param params The page's URL state.
 */
export const RecruiterEscalationsTab = ({ params }: { params: RecruitersParams }) => {
  const recruiter = params.filters.recruiter;
  const { data, isPending, isError, error, isPlaceholderData } = useGetRecruiterEscalations({ recruiter, q: params.q, page: params.page, pageSize: PAGE_SIZE }, true);

  const columns = useMemo(() => getRecruiterEscalationsColumns(), []);
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <RecruiterFilter value={recruiter} onChange={(v) => params.setFilter("recruiter", v)} />
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search agreement or customer" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} escalations` : "No escalations"}</p>}

      {isPending ? (
        <LoadingView message="Loading escalations…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load escalations.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No escalations"
          message={params.hasActiveFilters ? "No escalations match these filters." : "No case has moved from a recruiter to a caller yet."}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(e) => e.id} />
      )}

      <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />
    </div>
  );
};
