"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ErrorView } from "@/components/entity-components/error-view";
import { OutcomeBadge } from "@/components/outcome-badge";
import { StatCard } from "@/components/stat-card";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetBatch } from "../hooks/use-get-batches";
import { BATCH_TYPE_LABELS, type BatchCase } from "../types";

// Plain-words status for the sheet's subtitle.
const STATUS_TEXT = { DRAFT: "Draft", OPEN: "Open", IN_PROGRESS: "In progress", CLOSED: "Closed" } as const;

// Columns of the cases list inside the sheet; the customer cell is a real link to the case page.
const CASE_COLUMNS: DataTableColumn<BatchCase>[] = [
  {
    key: "customer",
    header: "Customer",
    cell: (c) => (
      <div className="min-w-0">
        <Link href={`/cases/${c.id}`} className="block truncate font-medium hover:underline">{c.customerName}</Link>
        <div className="truncate text-xs text-muted-foreground">{c.agreementNo} · {c.company} · {c.branch}</div>
      </div>
    ),
  },
  { key: "dpd", header: "DPD", cell: (c) => c.dpd ?? "-" },
  { key: "overdue", header: "Overdue", cell: (c) => formatInr(c.overdueAmount) },
  { key: "outcome", header: "Last outcome", cell: (c) => <OutcomeBadge outcome={c.lastOutcome} /> },
];

/**
 * @component BatchDetailSheet
 * @description Side sheet with one batch: its status, money and follow-up numbers, and its biggest cases (up to 100) with links to each case.
 * @param batchId The batch to show; the sheet is closed while it is null.
 */
export const BatchDetailSheet = ({ batchId, onClose }: { batchId: string | null; onClose: () => void }) => {
  const { data: batch, isPending, isError, error } = useGetBatch(batchId);
  const columns = useMemo(() => CASE_COLUMNS, []);

  return (
    <Sheet open={!!batchId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl! lg:max-w-xl!">
        <SheetHeader>
          <SheetTitle>{batch?.name ?? "Batch"}</SheetTitle>
          <SheetDescription>
            {batch ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{BATCH_TYPE_LABELS[batch.type]}</Badge>
                {STATUS_TEXT[batch.status]}
                {batch.status === "IN_PROGRESS" || batch.status === "CLOSED" ? ` · ${batch.agency?.name ?? "In-house"}` : ""}
              </span>
            ) : (
              "Loading batch…"
            )}
          </SheetDescription>
        </SheetHeader>

        {/* ScrollArea root is a flex column with a flex-1 viewport (same fix as FormDialog) so it shrinks to the sheet's height and scrolls. */}
        <ScrollArea className="flex min-h-0 flex-1 flex-col overflow-hidden [&_[data-slot=scroll-area-viewport]]:h-auto! [&_[data-slot=scroll-area-viewport]]:min-h-0 [&_[data-slot=scroll-area-viewport]]:flex-1 [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=scroll-area-viewport]>div]:min-w-0!">
        <div className="flex min-w-0 flex-col gap-4 p-4 pt-0">
          {isPending ? (
            <>
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-64 rounded-card" />
            </>
          ) : isError ? (
            <ErrorView message={getErrorMessage(error, "Couldn't load this batch.")} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatCard label="Due" value={formatInr(batch.amounts.due)} note={`${batch.followups.total} cases`} />
                <StatCard label="Collected" value={formatInr(batch.amounts.collected)} note={batch.assignedOn ? "Since it was assigned" : "Counted once assigned"} />
                <StatCard label="Open" value={String(batch.followups.open)} note="No promise or payment yet" />
                <StatCard label="Paid / promised" value={`${batch.followups.paid} / ${batch.followups.ptp}`} />
              </div>
              <DataTable columns={columns} rows={batch.cases} getRowKey={(c) => c.id} />
              {batch.casesTotal > batch.cases.length && (
                <p className="text-sm text-muted-foreground">Showing the {batch.cases.length} biggest of {batch.casesTotal} cases.</p>
              )}
            </>
          )}
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
