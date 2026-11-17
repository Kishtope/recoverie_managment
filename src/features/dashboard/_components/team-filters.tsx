"use client";

import { useMemo, type ReactNode } from "react";
import { format, parse } from "date-fns";
import { FilterSelect } from "@/components/filter-select";
import { FilterSheet, type FilterField } from "@/components/filter-sheet";
import { useMe } from "@/features/auth/hooks/use-me";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { useTeamOptions } from "@/features/team/hooks/use-team-options";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { DPD_BUCKETS, DPD_BUCKET_LABELS, type DpdBucket } from "@/lib/dpd-bucket";
import { fyMonths, recentFys } from "@/lib/fy";
import type { useTeamParams } from "../hooks/use-team-params";

type Option = { value: string; label: string };

// Adds the "everything" choice in front of a list of options.
const withAll = (all: string, options: Option[]): Option[] => [{ value: "all", label: all }, ...options];

/**
 * @component TeamFilters
 * @description One slim toolbar for the team dashboard and the Recovery page. Year and month stay in view because they change every number;
 * company, branch, agency, agent and DPD bucket live in a Filters side sheet (FilterSheet), where anything applied also shows as a removable chip. Changing the year resets the month. Everything is kept in the URL through `useTeamParams`.
 * @param params The object returned by `useTeamParams`.
 * @param actions Controls shown at the right end of the bar (export button, sort...).
 */
export const TeamFilters = ({ params, actions }: { params: ReturnType<typeof useTeamParams>; actions?: ReactNode }) => {
  const { data: me } = useMe();
  const isAdmin = me?.role === "ADMIN";
  const { data: agents } = useScopeAgents(!!me && me.role !== "AGENT");
  const { data: options } = useTeamOptions(isAdmin);
  const f = params.filters;

  const fyOptions = useMemo(() => recentFys().map((fy) => ({ value: fy, label: `FY ${fy}` })), []);
  const monthOptions = useMemo(() => withAll("Whole year", fyMonths(f.fy).map((m) => ({ value: m, label: format(parse(m, "yyyy-MM", new Date()), "MMM yyyy") }))), [f.fy]);
  const companyOptions = useMemo(() => withAll("All companies", COMPANIES.map((c) => ({ value: c, label: c }))), []);
  const branchOptions = useMemo(() => withAll("All branches", BRANCHES.map((b) => ({ value: b, label: b }))), []);
  const agencyOptions = useMemo(() => withAll("All agencies", (options?.agencies ?? []).map((a) => ({ value: a.id, label: a.name }))), [options]);
  const agentOptions = useMemo(() => withAll("All agents", (agents ?? []).map((a) => ({ value: a.id, label: a.name }))), [agents]);
  const bucketOptions = useMemo(() => withAll("Any DPD", DPD_BUCKETS.map((b) => ({ value: b, label: `DPD ${DPD_BUCKET_LABELS[b as DpdBucket]}` }))), []);

  // The filters inside the sheet, in the order they are shown; agency is for Admins only.
  const fields: FilterField[] = [
    { key: "company", label: "Company", options: companyOptions, value: f.company },
    { key: "branch", label: "Branch", options: branchOptions, value: f.branch },
    ...(isAdmin ? [{ key: "agency", label: "Agency", options: agencyOptions, value: f.agency }] : []),
    { key: "agent", label: "Agent", options: agentOptions, value: f.agent },
    { key: "bucket", label: "Days past due", options: bucketOptions, value: f.bucket },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect value={f.fy} onChange={(fy) => params.setFilters({ fy, month: "all" })} options={fyOptions} ariaLabel="Financial year" className="w-36" />
      <FilterSelect value={f.month} onChange={(v) => params.setFilter("month", v)} options={monthOptions} ariaLabel="Month" className="w-36" />

      <FilterSheet fields={fields} onChange={params.setFilter} onClear={params.clearFilters} description="Narrow the cards, charts and tables to part of your team." />

      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
