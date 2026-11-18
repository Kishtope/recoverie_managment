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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { useMe } from "@/features/auth/hooks/use-me";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useDeleteBatch, useUpdateBatch } from "../hooks/use-batch-mutations";
import { useBatchesParams } from "../hooks/use-batches-params";
import { useGetBatches } from "../hooks/use-get-batches";
import { BATCH_STAGES, BATCH_TYPES, BATCH_TYPE_LABELS, stageLabel, type BatchListItem, type BatchStage, type BatchTypeValue } from "../types";
import { AssignBatchDialog } from "./assign-batch-dialog";
import { BatchDetailSheet } from "./batch-detail-sheet";
import { BatchFormDialog } from "./batch-form-dialog";
import { FOLLOWUP_KEYS, getBatchesColumns } from "./batches-table";

const PAGE_SIZE = 10;

const DESCRIPTION = "Groups of cases handed to a team together, for calling or for field recovery.";

// What the empty state says for each stage; a search or filter in use gets a different line.
const EMPTY_TEXT: Record<BatchStage, string> = {
  drafts: "No drafts. Create a batch to start preparing one.",
  open: "No open batches. Open a draft to make it ready to assign.",
  "in-progress": "Nothing is being worked right now. Assign an open batch to start it.",
  closed: "No batches have been closed yet.",
};

/**
 * @component BatchesView
 * @description Batches page: cases grouped for a team, split into Call and FR tabs, each with Drafts / Open / In progress / Closed stages.
 * Admins and Managers create, open, assign, close and delete; Agency owners can only view batches assigned to their agency. Type, stage, search
 * and page live in the URL.
 */
export const BatchesView = () => {
  const { data: me } = useMe();
  const canManage = me?.role === "ADMIN" || me?.role === "MANAGER";

  const params = useBatchesParams();
  const type = params.filters.type as BatchTypeValue;
  const stage = params.filters.stage as BatchStage;
  const { data, isPending, isError, error, isPlaceholderData } = useGetBatches({ type, stage, q: params.q, page: params.page, pageSize: PAGE_SIZE });

  const update = useUpdateBatch();
  const remove = useDeleteBatch();

  // Which dialog or sheet is open, and for which batch.
  const [viewId, setViewId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [assigning, setAssigning] = useState<BatchListItem | null>(null);
  const [closing, setClosing] = useState<BatchListItem | null>(null);
  const [deleting, setDeleting] = useState<BatchListItem | null>(null);

  const columns = useMemo(
    () =>
      getBatchesColumns({
        canManage,
        actions: {
          onView: (b) => setViewId(b.id),
          onOpen: (b) => update.mutate({ id: b.id, batchName: b.name, action: "open" }),
          onAssign: setAssigning,
          onClose: setClosing,
          onDelete: setDeleting,
          pending: {
            updating: update.isPending ? (update.variables?.id ?? null) : null,
            deleting: remove.isPending ? (remove.variables?.id ?? null) : null,
          },
        },
      }),
    [canManage, update, remove],
  );

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-3">
      <Tabs value={type} onValueChange={(v) => params.setFilter("type", String(v))}>
        <TabsList>
          {BATCH_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>{BATCH_TYPE_LABELS[t]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup variant="outline" aria-label="Stage" value={[stage]} onValueChange={(v) => v[0] && params.setFilter("stage", v[0])}>
          {BATCH_STAGES.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {stageLabel(s, type)}
              {data && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{data.counts[s]}</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search batch name" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} batches` : "No batches"}</p>}
        {/* Legend for the four coloured follow-up counts in the table. */}
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Follow-up colours">
          {FOLLOWUP_KEYS.map((f) => (
            <li key={f.key} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", f.className)} aria-hidden />
              {f.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <EntityContainer
      header={
        canManage ? (
          <EntityHeader title="Batches" description={DESCRIPTION} newButtonLabel="New batch" onNew={() => setShowForm(true)} />
        ) : (
          <EntityHeader title="Batches" description={DESCRIPTION} />
        )
      }
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading batches…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load batches.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No batches"
          message={params.hasActiveFilters ? "No batches match this search." : EMPTY_TEXT[stage]}
          {...(canManage && stage === "drafts" && !params.hasActiveFilters ? { onNew: () => setShowForm(true), label: "New batch" } : {})}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(b) => b.id} />
      )}

      <BatchDetailSheet batchId={viewId} onClose={() => setViewId(null)} />
      <BatchFormDialog open={showForm} onOpenChange={setShowForm} defaultType={type} />
      <AssignBatchDialog batch={assigning} onClose={() => setAssigning(null)} />

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {closing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It moves to Closed and its cases can go into a new batch. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (closing) update.mutate({ id: closing.id, batchName: closing.name, action: "close" });
                setClosing(null);
              }}
            >
              Close batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>The draft is removed and its cases become free to use in another batch. The cases themselves are not touched.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) remove.mutate({ id: deleting.id, batchName: deleting.name });
                setDeleting(null);
              }}
            >
              Delete draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EntityContainer>
  );
};
