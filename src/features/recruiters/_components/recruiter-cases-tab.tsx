"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetRecruiterCases, useGetRecruiterOptions } from "../hooks/use-get-recruiters";
import type { RecruitersParams } from "../hooks/use-recruiters-params";
import { RECRUITER_STAGES, type RecruiterStage } from "../types";
import { getRecruiterCasesColumns } from "./recruiter-cases-table";
import { RecruiterFilter } from "./recruiter-filter";

const PAGE_SIZE = 10;

// Stage labels for the toggle; "due soon" names the reminder window so the number means something.
const stageLabel = (stage: RecruiterStage, reminderDays: number) => (stage === "with-recruiter" ? "With recruiter" : `Due in ${reminderDays} days or less`);

// What the empty state says for each stage; a search or filter in use gets a different line.
const EMPTY_TEXT: Record<RecruiterStage, string> = {
  "with-recruiter": "No recruiter is holding a case right now.",
  "due-soon": "No case is close to its deadline.",
};

/**
 * @component RecruiterCasesTab
 * @description Cases recruiters hold right now, most urgent first. Stage toggle (all / due soon), recruiter filter and search live in the URL;
 * each row shows the time left before the case moves to a caller.
 * @param params The page's URL state.
 */
export const RecruiterCasesTab = ({ params }: { params: RecruitersParams }) => {
  const stage = params.filters.stage as RecruiterStage;
  const recruiter = params.filters.recruiter;
  const { data: options } = useGetRecruiterOptions();
  const reminderDays = options?.rules.reminderDays ?? 2;
  const { data, isPending, isError, error, isPlaceholderData } = useGetRecruiterCases({ stage, recruiter, q: params.q, page: params.page, pageSize: PAGE_SIZE });

  const columns = useMemo(() => getRecruiterCasesColumns({ reminderDays }), [reminderDays]);
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup variant="outline" aria-label="Stage" value={[stage]} onValueChange={(v) => v[0] && params.setFilter("stage", v[0])}>
          {RECRUITER_STAGES.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {stageLabel(s, reminderDays)}
              {data && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{data.counts[s]}</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <RecruiterFilter value={recruiter} onChange={(v) => params.setFilter("recruiter", v)} />
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search agreement or customer" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} cases` : "No cases"}</p>}

      {isPending ? (
        <LoadingView message="Loading cases…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load recruiter cases.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No cases" message={params.hasActiveFilters ? "No cases match these filters." : EMPTY_TEXT[stage]} />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(c) => c.allocationId} />
      )}

      <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />
    </div>
  );
};
