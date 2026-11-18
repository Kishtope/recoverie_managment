import { format } from "date-fns";
import { Building2Icon, CircleCheckIcon, EyeIcon, FolderOpenIcon, FootprintsIcon, PhoneCallIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BatchFollowups, BatchListItem } from "../types";

// The four follow-up counts of a batch with the colour and meaning each one carries (the legend above the table uses the same list).
export const FOLLOWUP_KEYS = [
  { key: "total", label: "Cases", className: "bg-primary text-primary-foreground" },
  { key: "open", label: "Open (no promise or payment yet)", className: "bg-accent text-accent-foreground" },
  { key: "ptp", label: "Promised to pay", className: "bg-brand-sky text-foreground" },
  { key: "paid", label: "Paid", className: "bg-success text-success-foreground" },
] as const satisfies readonly { key: keyof BatchFollowups; label: string; className: string }[];

// One coloured count; hovering or focusing it names what it counts.
const CountPill = ({ value, label, className }: { value: number; label: string; className: string }) => (
  <Tooltip>
    <TooltipTrigger render={<span tabIndex={0} className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums", className)} />}>
      {value}
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

// What a row can do. Each handler gets the row; `pending` is the batch an update or delete is running for (its buttons show a spinner).
export type BatchRowActions = {
  onView: (b: BatchListItem) => void;
  onOpen: (b: BatchListItem) => void;
  onAssign: (b: BatchListItem) => void;
  onClose: (b: BatchListItem) => void;
  onDelete: (b: BatchListItem) => void;
  pending: { updating: string | null; deleting: string | null };
};

// The one forward step a batch in each status offers, shown as the row's main button.
const STEP = {
  DRAFT: { label: "Open", icon: FolderOpenIcon, run: "onOpen" },
  OPEN: { label: "Assign", icon: UserPlusIcon, run: "onAssign" },
  IN_PROGRESS: { label: "Close", icon: CircleCheckIcon, run: "onClose" },
} as const;

// Columns of the Batches table. `canManage` is off for Agency owners, who can only view. The batch cell shows the type icon and a muted line
// with the creation date and case count; money shows due with a thin collected bar; row actions are View, the next step, and Delete (drafts only).
export const getBatchesColumns = ({ canManage, actions }: { canManage: boolean; actions: BatchRowActions }): DataTableColumn<BatchListItem>[] => [
  {
    key: "batch",
    header: "Batch",
    cell: (b) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{b.type === "CALL" ? <PhoneCallIcon className="size-4" /> : <FootprintsIcon className="size-4" />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{b.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {b.followups.total} cases · created {format(new Date(b.createdAt), "dd MMM yyyy")}
          </div>
        </div>
      </div>
    ),
  },
  { key: "assignedOn", header: "Assigned on", cell: (b) => (b.assignedOn ? format(new Date(b.assignedOn), "dd/MM/yyyy") : "-") },
  {
    key: "amount",
    header: "Amount",
    cell: (b) => {
      const pct = b.amounts.due > 0 ? Math.min(100, Math.round((b.amounts.collected / b.amounts.due) * 100)) : 0;
      return (
        <div className="flex min-w-36 flex-col gap-1.5">
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="font-medium tabular-nums">{formatInr(b.amounts.due)}</span>
            <span className="text-xs text-muted-foreground">due</span>
          </div>
          <Progress value={pct} aria-label={`${pct}% collected`}>
            <ProgressTrack className="h-1.5">
              <ProgressIndicator className="bg-success" />
            </ProgressTrack>
          </Progress>
          <span className="text-xs text-muted-foreground tabular-nums">{formatInr(b.amounts.collected)} collected</span>
        </div>
      );
    },
  },
  {
    key: "followups",
    header: "Follow-ups",
    cell: (b) => (
      <div className="flex items-center gap-1">
        {FOLLOWUP_KEYS.map((f) => (
          <CountPill key={f.key} value={b.followups[f.key]} label={f.label} className={f.className} />
        ))}
      </div>
    ),
  },
  {
    key: "agency",
    header: "Assigned agency",
    cell: (b) =>
      b.status === "DRAFT" || b.status === "OPEN" ? (
        "-"
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Building2Icon className="size-4 text-muted-foreground" />
          {b.agency?.name ?? "In-house"}
        </span>
      ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cell: (b) => {
      const step = b.status === "CLOSED" ? null : STEP[b.status];
      const updating = actions.pending.updating === b.id;
      const deleting = actions.pending.deleting === b.id;
      return (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => actions.onView(b)}>
            <EyeIcon data-icon="inline-start" />
            View
          </Button>
          {canManage && step && (
            <Button size="sm" variant="accent" disabled={updating} onClick={() => actions[step.run](b)}>
              {updating ? <Spinner data-icon="inline-start" /> : <step.icon data-icon="inline-start" />}
              {step.label}
            </Button>
          )}
          {canManage && b.status === "DRAFT" && (
            <Button size="sm" variant="outline" disabled={deleting} aria-label={`Delete ${b.name}`} onClick={() => actions.onDelete(b)}>
              {deleting ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
              Delete
            </Button>
          )}
        </div>
      );
    },
  },
];
