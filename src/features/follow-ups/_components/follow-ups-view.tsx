"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useFollowUpsParams } from "../hooks/use-follow-ups-params";
import { FOLLOW_UP_TABS, FOLLOW_UP_TAB_INFO, type FollowUpTabValue } from "../types";
import { getFollowUpColumns } from "./follow-ups-table";
import { MissedCallsSection } from "./missed-calls-section";

const PAGE_SIZE = 10;

/**
 * @component FollowUpsView
 * @description The agent's calling worklist in four tabs: New (never called), Today (due and not called yet), Post (already called) and
 * Closed. Reads the same loans API as My cases with a `tab` filter, so the numbers always agree. Tab, search and page live in the URL.
 */
export const FollowUpsView = () => {
  const params = useFollowUpsParams();
  const tab = params.filters.tab as FollowUpTabValue;
  const { data, isPending, isError, error, isPlaceholderData } = useGetLoans({
    q: params.q,
    agentId: "",
    company: "",
    branch: "",
    followUp: "",
    outcome: "",
    flag: "",
    tab,
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  const columns = useMemo(() => getFollowUpColumns(tab), [tab]);
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => params.setFilter("tab", String(v))}>
          <TabsList>
            {FOLLOW_UP_TABS.map((t) => (
              <TabsTrigger key={t} value={t}>{FOLLOW_UP_TAB_INFO[t].label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, agreement, mobile" />
      </div>
      <p className="text-sm text-muted-foreground">
        {FOLLOW_UP_TAB_INFO[tab].hint}
        {data ? ` · ${data.total} ${data.total === 1 ? "customer" : "customers"}` : ""}
      </p>
    </div>
  );

  return (
    <EntityContainer
      header={<EntityHeader title="Follow-ups" description="Who to call next." />}
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <MissedCallsSection />
        {isPending ? (
          <LoadingView message="Loading follow-ups…" />
        ) : isError ? (
          <ErrorView message={getErrorMessage(error, "Couldn't load follow-ups.")} />
        ) : data.items.length === 0 ? (
          <EntityEmptyView empty_label="Nothing here" message={params.q ? "No customers match this search." : "No customers in this tab."} />
        ) : (
          <DataTable
            className={cn(isPlaceholderData && "opacity-60")}
            columns={columns}
            rows={data.items}
            getRowKey={(l) => l.id}
          />
        )}
      </div>
    </EntityContainer>
  );
};
