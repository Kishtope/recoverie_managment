import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { TeamUserRow } from "../types";

// Collection % as "33.3%" with a thin bar under it (the bar is capped at 100%); "-" when nothing was due.
const Pct = ({ value }: { value: number | null }) =>
  value === null ? (
    "-"
  ) : (
    <div className="flex min-w-24 flex-col gap-1">
      <span>{value}%</span>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );

// Columns of the user-wise recovery table (dashboard and Recovery page). The name cell is the row's identity; the whole row opens that agent's cases.
export const getTeamUserColumns = (): DataTableColumn<TeamUserRow>[] => [
  {
    key: "name",
    header: "Agent",
    cell: (u) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{u.agentId ? getInitials(u.name) : "?"}</AvatarFallback>
        </Avatar>
        <span className="truncate font-medium">{u.name}</span>
      </div>
    ),
  },
  { key: "allocated", header: "Allocated", cell: (u) => u.allocated.toLocaleString("en-IN") },
  { key: "spoke", header: "Spoke to", cell: (u) => u.spoke.toLocaleString("en-IN") },
  { key: "notSpoke", header: "Not spoken", cell: (u) => u.notSpoke.toLocaleString("en-IN") },
  { key: "paid", header: "Paid", cell: (u) => u.paid.toLocaleString("en-IN") },
  { key: "partPaid", header: "Part paid", cell: (u) => u.partPaid.toLocaleString("en-IN") },
  { key: "ptp", header: "PTP", cell: (u) => u.ptp.toLocaleString("en-IN") },
  { key: "pending", header: "Pending", cell: (u) => u.pending.toLocaleString("en-IN") },
  { key: "collected", header: "Collected", cell: (u) => formatInr(u.collected) },
  { key: "pendingAmount", header: "Pending ₹", cell: (u) => formatInr(u.pendingAmount) },
  { key: "collectionPct", header: "Collection %", cell: (u) => <Pct value={u.collectionPct} /> },
];
