import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon, PhoneIncomingIcon, PhoneOutgoingIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CallStatusBadge } from "@/components/call-status-badge";
import type { DataTableColumn } from "@/components/data-table";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatDuration } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { CallItem } from "../types";

// Columns of the Calls table. `showAgent` is off for agents (every call is their own). Inbound calls that matched no loan show
// "Unmatched" instead of a customer and have no case to open.
export const getCallsColumns = ({ showAgent }: { showAgent: boolean }): DataTableColumn<CallItem>[] => [
  {
    key: "customer",
    header: "Customer",
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{c.customerName ? getInitials(c.customerName) : "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{c.customerName ?? "Unmatched number"}</div>
          <div className="truncate text-xs text-muted-foreground">{c.numberMask ?? "-"}</div>
        </div>
      </div>
    ),
  },
  { key: "agreementNo", header: "Agreement no.", cell: (c) => c.agreementNo ?? "-" },
  {
    key: "direction",
    header: "Direction",
    cell: (c) => (
      <span className="inline-flex items-center gap-1.5">
        {c.direction === "INBOUND" ? <PhoneIncomingIcon className="size-4 text-muted-foreground" /> : <PhoneOutgoingIcon className="size-4 text-muted-foreground" />}
        {c.direction === "INBOUND" ? "Inbound" : "Outbound"}
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (c) => <CallStatusBadge status={c.status} /> },
  { key: "startedAt", header: "Started", cell: (c) => format(new Date(c.startedAt), "dd MMM yyyy, h:mm a") },
  { key: "duration", header: "Duration", cell: (c) => formatDuration(c.durationSec) },
  {
    key: "outcome",
    header: "Outcome",
    cell: (c) => (c.needsOutcome ? <Badge variant="secondary">Pending</Badge> : c.outcome ? <OutcomeBadge outcome={c.outcome} /> : "-"),
  },
  ...(showAgent ? [{ key: "agent", header: "Agent", cell: (c: CallItem) => c.agent?.name ?? "-" }] : []),
  {
    key: "actions",
    header: "",
    className: "text-right",
    cell: (c) =>
      c.loanId ? (
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/cases/${c.loanId}`} />}>
          <EyeIcon data-icon="inline-start" />
          View details
        </Button>
      ) : null,
  },
];
