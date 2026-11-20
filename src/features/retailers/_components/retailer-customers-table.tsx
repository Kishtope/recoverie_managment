import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { RetailerCustomerItem } from "../types";

// Empty optional values show as "-".
const orDash = (value?: string | number | null) => (value === null || value === undefined || value === "" ? "-" : value);

// Columns of a retailer's customers table: who the customer is, their loan, what is overdue, and which caller holds it (a separate relationship
// from the retailer). A customer with several loans shows the first agreement no. and "+N".
export const retailerCustomersColumns: DataTableColumn<RetailerCustomerItem>[] = [
  {
    key: "customer",
    header: "Customer",
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{c.name}</div>
          <div className="truncate text-xs text-muted-foreground">{orDash(c.mobile)}</div>
        </div>
      </div>
    ),
  },
  {
    key: "agreementNo",
    header: "Agreement no.",
    cell: (c) => (
      <span>
        {c.agreementNo}
        {c.loanCount > 1 && <span className="ml-1 text-xs text-muted-foreground">+{c.loanCount - 1}</span>}
      </span>
    ),
  },
  { key: "outstanding", header: "Outstanding", className: "text-right tabular-nums", cell: (c) => formatInr(c.outstanding) },
  { key: "dpd", header: "Overdue days", className: "text-right tabular-nums", cell: (c) => orDash(c.maxDpd) },
  { key: "status", header: "Status", cell: (c) => <Badge variant={c.status === "ACTIVE" ? "secondary" : "outline"}>{c.status === "ACTIVE" ? "Active" : "Closed"}</Badge> },
  {
    key: "caller",
    header: "Assigned caller",
    cell: (c) => (c.callers.length ? c.callers.join(", ") : <Badge variant="outline">Unassigned</Badge>),
  },
  { key: "assignedOn", header: "With retailer since", cell: (c) => (c.assignedOn ? format(new Date(c.assignedOn), "dd MMM yyyy") : "-") },
];
