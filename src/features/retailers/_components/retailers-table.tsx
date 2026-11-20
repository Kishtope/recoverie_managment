import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon, PencilIcon, PowerIcon, PowerOffIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DataTableColumn } from "@/components/data-table";
import { getInitials } from "@/lib/get-initials";
import { RETAILER_STATUS_LABELS, type RetailerItem } from "../types";

// What a row can do. `pendingId` is the retailer a status change is running for (its button shows a spinner).
export type RetailerRowActions = {
  onEdit: (r: RetailerItem) => void;
  onActivate: (r: RetailerItem) => void;
  onDeactivate: (r: RetailerItem) => void;
  pendingId: string | null;
};

// Status pill shared by the list and the detail page: Active is filled, Inactive is outlined.
export const RetailerStatusBadge = ({ status }: { status: RetailerItem["status"] }) => (
  <Badge variant={status === "ACTIVE" ? "secondary" : "outline"}>{RETAILER_STATUS_LABELS[status]}</Badge>
);

// Columns of the Retailers table. The retailer cell links to its customer list and shows the code and city on a muted line; row actions are
// View, Edit and Activate / Deactivate (deactivating asks first, in the view).
export const getRetailersColumns = (actions: RetailerRowActions): DataTableColumn<RetailerItem>[] => [
  {
    key: "retailer",
    header: "Retailer",
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(r.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/retailers/${r.id}`} className="block truncate font-medium hover:underline">
            {r.name}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {r.code}
            {r.city ? ` · ${r.city}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate">{r.ownerName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {r.mobile}
          {r.email ? ` · ${r.email}` : ""}
        </div>
      </div>
    ),
  },
  { key: "customers", header: "Customers", className: "text-right tabular-nums", cell: (r) => r.customerCount.toLocaleString("en-IN") },
  { key: "status", header: "Status", cell: (r) => <RetailerStatusBadge status={r.status} /> },
  { key: "created", header: "Added on", cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy") },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cell: (r) => {
      const pending = actions.pendingId === r.id;
      return (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/retailers/${r.id}`} />}>
            <EyeIcon data-icon="inline-start" />
            View
          </Button>
          <Button size="sm" variant="outline" onClick={() => actions.onEdit(r)}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
          {r.status === "ACTIVE" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => actions.onDeactivate(r)}>
              {pending ? <Spinner data-icon="inline-start" /> : <PowerOffIcon data-icon="inline-start" />}
              Deactivate
            </Button>
          ) : (
            <Button size="sm" variant="accent" disabled={pending} onClick={() => actions.onActivate(r)}>
              {pending ? <Spinner data-icon="inline-start" /> : <PowerIcon data-icon="inline-start" />}
              Activate
            </Button>
          )}
        </div>
      );
    },
  },
];
