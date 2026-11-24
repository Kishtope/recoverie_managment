"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useUpdateRetailer } from "../hooks/use-retailer-mutations";
import { useGetRetailers } from "../hooks/use-get-retailers";
import { useRetailersParams } from "../hooks/use-retailers-params";
import { RETAILER_FILTERS, RETAILER_TABS, RETAILER_TAB_LABELS, type RetailerFilter, type RetailerItem, type RetailerPeriod, type RetailerTab } from "../types";
import { RetailerFormDialog } from "./retailer-form-dialog";
import { RetailerOverviewTab } from "./retailer-overview-tab";
import { getRetailersColumns } from "./retailers-table";

const PAGE_SIZE = 10;

const FILTER_LABELS: Record<RetailerFilter, string> = { all: "All", active: "Active", inactive: "Inactive" };

/**
 * @component RetailersView
 * @description Retailers page (Admin): an Overview tab with totals and per-retailer performance, and a Retailers tab to edit, activate and
 * deactivate retailers (retailers are loaded into the database beforehand, not created in the app). Customers reach a retailer through the Retailer Code in the uploaded file (never by automatic balancing).
 * Tab, status, period, search and page live in the URL.
 */
export const RetailersView = () => {
  const params = useRetailersParams();
  const tab = params.filters.tab as RetailerTab;
  const status = params.filters.status as RetailerFilter;
  const period = params.filters.period as RetailerPeriod;

  const { data, isPending, isError, error, isPlaceholderData } = useGetRetailers({ status, q: params.q, page: params.page, pageSize: PAGE_SIZE }, tab === "retailers");
  const update = useUpdateRetailer();

  // Which dialog is open: the edit form (open while a retailer is being edited) or the deactivate confirmation.
  const [editing, setEditing] = useState<RetailerItem | null>(null);
  const [deactivating, setDeactivating] = useState<RetailerItem | null>(null);

  const columns = useMemo(
    () =>
      getRetailersColumns({
        onEdit: setEditing,
        onActivate: (r) => update.mutate({ id: r.id, retailerName: r.name, status: "ACTIVE" }),
        onDeactivate: setDeactivating,
        pendingId: update.isPending ? (update.variables?.id ?? null) : null,
      }),
    [update],
  );

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const tabs = (
    <Tabs value={tab} onValueChange={(v) => params.setFilter("tab", String(v))}>
      <TabsList>
        {RETAILER_TABS.map((t) => (
          <TabsTrigger key={t} value={t}>{RETAILER_TAB_LABELS[t]}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const listToolbar = (
    <div className="flex flex-col gap-3">
      {tabs}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs only drive the filter; the table below is shared, so there are no panels. */}
        <Tabs value={status} onValueChange={(v) => params.setFilter("status", String(v))}>
          <TabsList aria-label="Status">
            {RETAILER_FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>
                {FILTER_LABELS[f]}
                {data && <span className="text-xs text-muted-foreground tabular-nums">{data.counts[f]}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search code, name, owner, city or mobile" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} retailers` : "No retailers"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Retailers"
          description="Shops that hold the customers whose uploaded rows carry their Retailer Code. A retailer takes at most 20 customers from one file."
        />
      }
      search={tab === "retailers" ? listToolbar : tabs}
      pagination={tab === "retailers" ? <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} /> : undefined}
    >
      {tab === "overview" ? (
        <RetailerOverviewTab period={period} onPeriodChange={(p) => params.setFilter("period", p)} />
      ) : isPending ? (
        <LoadingView message="Loading retailers…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load retailers.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No retailers"
          message={params.hasActiveFilters ? "No retailers match this search." : "No retailers have been loaded yet."}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(r) => r.id} />
      )}

      <RetailerFormDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} retailer={editing} />

      <AlertDialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Uploaded rows with its code are rejected while it is inactive. The customers it already holds stay with it, and you can activate it again at any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deactivating) update.mutate({ id: deactivating.id, retailerName: deactivating.name, status: "INACTIVE" });
                setDeactivating(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EntityContainer>
  );
};
