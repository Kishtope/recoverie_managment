"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { DownloadIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { ROLE_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import { cn } from "@/lib/utils";
import { useExportCutover, useGetCutover } from "../hooks/use-cutover";
import { useCutoverParams } from "../hooks/use-cutover-params";
import type { CutoverUser, ReadinessSummary } from "../types";
import { StaffCheck } from "./staff-check";

const PAGE_SIZE = 10;
const FILTER_OPTIONS = [{ value: "all", label: "Everyone" }, { value: "not-ready", label: "Not ready" }];

// Columns of the readiness table. The status cell is "Ready" or one badge per thing still missing.
const columns: DataTableColumn<CutoverUser>[] = [
  {
    key: "name",
    header: "User",
    cell: (u) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{u.name}</div>
          <div className="truncate text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</div>
        </div>
      </div>
    ),
  },
  { key: "mobile", header: "Mobile", cell: (u) => u.mobile ?? "-" },
  { key: "email", header: "Email", cell: (u) => u.email ?? "-" },
  { key: "cases", header: "Active cases", cell: (u) => u.activeCases },
  { key: "last", header: "Last sign-in", cell: (u) => (u.lastLoginAt ? format(new Date(u.lastLoginAt), "dd MMM yyyy, h:mm a") : "Never") },
  {
    key: "status",
    header: "Status",
    cell: (u) =>
      u.ready ? (
        <Badge className="bg-success text-success-foreground">Ready</Badge>
      ) : (
        <div className="flex flex-wrap gap-1">
          {u.problems.map((p) => (
            <Badge key={p} variant="outline">{p}</Badge>
          ))}
        </div>
      ),
  },
];

// One figure in the strip above the table.
const Cell = ({ label, value, note }: { label: string; value: number; note: string }) => (
  <div className="flex min-w-0 flex-col gap-1 bg-card p-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="display-number text-4xl">{value}</span>
    <span className="text-xs text-muted-foreground">{note}</span>
  </div>
);

/**
 * @component CutoverView
 * @description Admin go-live page: how many active users are ready (right login details, signed in once), a table of who is not and why,
 * a CSV export, and the old-staff-list check. The "Not ready" filter lives in the URL; the table is paged on the server.
 */
export const CutoverView = () => {
  const params = useCutoverParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetCutover({ filter: params.filters.filter, page: params.page, pageSize: PAGE_SIZE });
  const exportCsv = useExportCutover();
  const memoColumns = useMemo(() => columns, []);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const s: ReadinessSummary | undefined = data?.summary;

  const toolbar = (
    <div className="flex flex-col gap-4">
      {s && (
        <section aria-label="Readiness summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-4">
          <Cell label="Ready" value={s.ready} note={`of ${s.total} active users`} />
          <Cell label="Not ready" value={s.notReady} note="Need something before go-live" />
          <Cell label="Missing contact" value={s.noMobile + s.noEmail} note={`${s.noMobile} no mobile, ${s.noEmail} no email`} />
          <Cell label="Never signed in" value={s.neverSignedIn} note="Have not logged in yet" />
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup variant="outline" aria-label="Show" value={[params.filters.filter]} onValueChange={(v) => v[0] && params.setFilter("filter", v[0])}>
          {FILTER_OPTIONS.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate(params.filters.filter)}>
          {exportCsv.isPending ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Export CSV
        </Button>
      </div>
    </div>
  );

  return (
    <EntityContainer
      header={<EntityHeader title="Cut-over" description="Who is ready to go live, and who still needs something." />}
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading cut-over…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load the readiness list.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="Nobody to show" message={params.hasActiveFilters ? "Everyone is ready." : "No active users yet."} />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={memoColumns} rows={data.items} getRowKey={(u) => u.id} />
      )}

      <StaffCheck />
    </EntityContainer>
  );
};
