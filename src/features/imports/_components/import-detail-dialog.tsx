"use client";

import { DownloadIcon } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { LoadingView } from "@/components/entity-components/loading-view";
import { ErrorView } from "@/components/entity-components/error-view";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetImport } from "../hooks/use-get-imports";
import type { ImportRowError } from "../types";
import { ImportSummary } from "./import-summary";

// Columns of the rejected-rows table.
const ERROR_COLUMNS: DataTableColumn<ImportRowError>[] = [
  { key: "row", header: "Row", cell: (e) => e.row || "-" },
  { key: "agreementNo", header: "Agreement no.", cell: (e) => e.agreementNo || "-" },
  { key: "reason", header: "Reason", cell: (e) => e.reason },
];

// Quotes one CSV cell (commas, quotes and line breaks are escaped).
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

// Downloads the rejected rows as a CSV so they can be fixed and re-upload.
const downloadErrorsCsv = (fileName: string, errors: ImportRowError[]) => {
  const lines = [["Row", "Agreement no.", "Reason"], ...errors.map((e) => [e.row || "", e.agreementNo ?? "", e.reason])];
  const blob = new Blob([lines.map((l) => l.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `errors-${fileName.replace(/\.[^.]+$/, "")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * @component ImportDetailDialog
 * @description One import run: its totals and the full list of rejected rows, with a CSV download of the errors.
 * @param runId The run to show; the dialog is open while this is set.
 */
export const ImportDetailDialog = ({ runId, onClose }: { runId: string | undefined; onClose: () => void }) => {
  const { data: run, isPending, isError, error } = useGetImport(runId);

  return (
    <FormDialog
      open={!!runId}
      onOpenChange={(open) => !open && onClose()}
      title={run ? run.fileName : "Import details"}
      description="Rows that were not imported, and why."
      className="sm:max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {run && run.errors.length > 0 && (
            <Button onClick={() => downloadErrorsCsv(run.fileName, run.errors)}>
              <DownloadIcon data-icon="inline-start" />
              Download errors (CSV)
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-4">
        {isPending ? (
          <LoadingView message="Loading import…" />
        ) : isError ? (
          <ErrorView message={getErrorMessage(error, "Couldn't load this import.")} />
        ) : (
          <>
            <ImportSummary run={run} onOpenErrors={() => {}} />
            {run.errors.length ? (
              <DataTable columns={ERROR_COLUMNS} rows={run.errors} getRowKey={(e) => `${e.row}-${e.agreementNo}-${e.reason}`} />
            ) : (
              <p className="text-sm text-muted-foreground">Every row was imported.</p>
            )}
          </>
        )}
      </div>
    </FormDialog>
  );
};
