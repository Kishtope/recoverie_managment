import { format } from "date-fns";
import { BanIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DataTableColumn } from "@/components/data-table";
import { ROLE_LABELS } from "@/lib/constants";
import type { TeamUser } from "../types";

// Up to two initials from a full name for the avatar fallback.
const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// Empty optional values show as "-".
const orDash = (value?: string | null) => value || "-";

// Columns of the Team table. Row actions only appear when `canManage` (Admin); the API enforces it anyway.
export const getTeamColumns = ({
  canManage,
  onEdit,
  onToggleStatus,
  pendingId,
}: {
  canManage: boolean;
  onEdit: (user: TeamUser) => void;
  onToggleStatus: (user: TeamUser) => void;
  pendingId?: string;
}): DataTableColumn<TeamUser>[] => [
  {
    key: "name",
    header: "User",
    cell: (u) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{u.name}</div>
          <div className="truncate text-xs text-muted-foreground">{orDash(u.mobile ?? u.email)}</div>
        </div>
      </div>
    ),
  },
  { key: "role", header: "Role", cell: (u) => <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge> },
  { key: "agency", header: "Agency", cell: (u) => orDash(u.agency?.name) },
  { key: "reportsTo", header: "Reports to", cell: (u) => orDash(u.reportsTo?.name) },
  { key: "hubUserId", header: "Hub ID", cell: (u) => orDash(u.hubUserId) },
  {
    key: "branches",
    header: "Branches",
    cell: (u) => orDash([...new Set(u.access.map((a) => `${a.company} · ${a.branch}`))].join(", ")),
  },
  {
    key: "status",
    header: "Status",
    cell: (u) => <Badge variant={u.status === "ACTIVE" ? "outline" : "destructive"}>{u.status === "ACTIVE" ? "Active" : "Disabled"}</Badge>,
  },
  { key: "lastLogin", header: "Last login", cell: (u) => (u.lastLoginAt ? format(new Date(u.lastLoginAt), "dd MMM yyyy, hh:mm a") : "-") },
  ...(canManage
    ? [
        {
          key: "actions",
          header: "",
          cell: (u: TeamUser) => (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(u)}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
              <Button size="sm" variant="outline" disabled={pendingId === u.id} onClick={() => onToggleStatus(u)}>
                {pendingId === u.id ? <Spinner data-icon="inline-start" /> : u.status === "ACTIVE" ? <BanIcon data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
                {u.status === "ACTIVE" ? "Disable" : "Enable"}
              </Button>
            </div>
          ),
        },
      ]
    : []),
];
