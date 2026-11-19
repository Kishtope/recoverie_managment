"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSelect } from "@/components/filter-select";
import { StatCard } from "@/components/stat-card";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetRecruiterPerformance } from "../hooks/use-get-recruiters";
import type { RecruitersParams } from "../hooks/use-recruiters-params";
import { RECRUITER_PERIODS, RECRUITER_PERIOD_LABELS, type RecruiterPeriod } from "../types";
import { getRecruiterPerformanceColumns } from "./recruiter-performance-table";

const PERIOD_OPTIONS = RECRUITER_PERIODS.map((p) => ({ value: p, label: RECRUITER_PERIOD_LABELS[p] }));

/**
 * @component RecruiterPerformanceTab
 * @description One row per recruiter: cases held, money recovered while the case was still theirs, and cases escalated. Totals sit above the
 * table; the period (this month, last month, all time) lives in the URL.
 * @param params The page's URL state.
 */
export const RecruiterPerformanceTab = ({ params }: { params: RecruitersParams }) => {
  const period = params.filters.period as RecruiterPeriod;
  const { data, isPending, isError, error, isPlaceholderData } = useGetRecruiterPerformance(period, true);
  const columns = useMemo(() => getRecruiterPerformanceColumns(), []);

  const totals = (data?.items ?? []).reduce(
    (t, r) => ({ held: t.held + r.heldNow, recovered: t.recovered + r.recoveredInLimit, escalated: t.escalated + r.escalated }),
    { held: 0, recovered: 0, escalated: 0 },
  );
  const label = RECRUITER_PERIOD_LABELS[period].toLowerCase();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FilterSelect value={period} onChange={(v) => params.setFilter("period", v)} options={PERIOD_OPTIONS} ariaLabel="Period" className="w-40" />

      {isPending ? (
        <LoadingView message="Loading performance…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load recruiter performance.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No recruiters" message="There are no active recruiters in your team yet." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Cases with recruiters" value={String(totals.held)} note="Held right now" />
            <StatCard label="Recovered in limit" value={formatInr(totals.recovered)} note={`Paid while still theirs, ${label}`} />
            <StatCard label="Escalated" value={String(totals.escalated)} note={`Moved to a caller, ${label}`} />
          </div>
          <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(r) => r.recruiter.id} />
        </>
      )}
    </div>
  );
};
