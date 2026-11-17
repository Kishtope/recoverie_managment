import { format } from "date-fns";
import { FileTextIcon, ListIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/data-table";
import type { ImportRunItem } from "../types";

const TYPE_LABELS = { LOANS: "Loans", ALLOCATIONS: "Allocations", PAYMENTS: "Payments" } as const;
const STATUS_LABELS = { RUNNING: "Running", DONE: "Done", FAILED: "Failed" } as const;

// Columns of the import runs table; `onOpen` shows the run's rejected rows.
export const getImportColumns = ({ onOpen }: { onOpen: (run: ImportRunItem) => void }): DataTableColumn<ImportRunItem>[] => [
  {
    key: "file",
    header: "File",
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback><FileTextIcon className="size-4" /></AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{r.fileName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {format(new Date(r.startedAt), "dd MMM yyyy, hh:mm a")} · {r.createdBy?.name ?? "-"}
          </div>
        </div>
      </div>
    ),
  },
  { key: "type", header: "Type", cell: (r) => <Badge variant="secondary">{TYPE_LABELS[r.type]}</Badge> },
  { key: "rows", header: "Rows", cell: (r) => r.totalRows.toLocaleString("en-IN") },
  { key: "created", header: "New", cell: (r) => r.created.toLocaleString("en-IN") },
  { key: "updated", header: "Updated", cell: (r) => r.updated.toLocaleString("en-IN") },
  { key: "failed", header: "Errors", cell: (r) => (r.failed ? <Badge variant="destructive">{r.failed.toLocaleString("en-IN")}</Badge> : "-") },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={r.status === "FAILED" ? "destructive" : "outline"}>{STATUS_LABELS[r.status]}</Badge>,
  },
  {
    key: "actions",
    header: "",
    cell: (r) => (
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onOpen(r)}>
          <ListIcon data-icon="inline-start" />
          Details
        </Button>
      </div>
    ),
  },
];
