import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/data-table";
import type { LoanListItem } from "@/features/cases/types";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";

// Empty optional values show as "-".
const orDash = (value?: string | number | null) => (value === null || value === undefined || value === "" ? "-" : value);

// Columns of the uploaded customers table: who the customer is, where the loan sits, what is overdue and who holds it.
// The customer cell and the View details button open the case page; rows themselves are not clickable.
export const uploadedColumns: DataTableColumn<LoanListItem>[] = [
  {
    key: "customer",
    header: "Customer",
    cell: (l) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(l.customerName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/cases/${l.id}`} className="block truncate font-medium hover:underline">
            {l.customerName}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {orDash(l.mobile)}
            {l.area ? ` · ${l.area}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  { key: "agreementNo", header: "Agreement no.", cell: (l) => l.agreementNo },
  { key: "branch", header: "Company · branch", cell: (l) => `${l.company} · ${l.branch}` },
  { key: "dpd", header: "DPD", cell: (l) => orDash(l.dpd) },
  { key: "overdue", header: "Overdue", cell: (l) => formatInr(l.overdueAmount) },
  {
    key: "status",
    header: "Status",
    cell: (l) => <Badge variant={l.status === "ACTIVE" ? "secondary" : "outline"}>{l.status === "ACTIVE" ? "Active" : "Closed"}</Badge>,
  },
  {
    key: "agent",
    header: "Allocated to",
    cell: (l) =>
      l.agent ? (
        <div className="min-w-0">
          <div className="truncate">{l.agent.name}</div>
          {l.assignedOn && <div className="text-xs text-muted-foreground">{format(new Date(l.assignedOn), "dd MMM yyyy")}</div>}
        </div>
      ) : (
        <Badge variant="outline">Unassigned</Badge>
      ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cell: (l) => (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/cases/${l.id}`} />}>
        <EyeIcon data-icon="inline-start" />
        View details
      </Button>
    ),
  },
];
