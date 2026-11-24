import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon, MoreVerticalIcon, PencilIcon, PowerIcon, PowerOffIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Columns of the Retailers table. The retailer cell links to its customer list and shows the code and city on a muted line; row actions live in a 3-dots menu:
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
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon" variant="ghost" aria-label={`Actions for ${r.name}`} />}>
              {pending ? <Spinner /> : <MoreVerticalIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href={`/retailers/${r.id}`} />}>
                  <EyeIcon />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onEdit(r)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {r.status === "ACTIVE" ? (
                  <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => actions.onDeactivate(r)}>
                    <PowerOffIcon />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled={pending} onClick={() => actions.onActivate(r)}>
                    <PowerIcon />
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
