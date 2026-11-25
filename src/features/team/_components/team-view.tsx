"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { useMe } from "@/features/auth/hooks/use-me";
import { getErrorMessage } from "@/lib/get-error-message";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useGetUsers } from "../hooks/use-get-users";
import { useTeamParams } from "../hooks/use-team-params";
import { useUpdateUser } from "../hooks/use-user-mutations";
import type { TeamUser } from "../types";
import { getTeamColumns } from "./team-table";
import { TeamFormDialog } from "./team-form-dialog";

const PAGE_SIZE = 10;

// Options for the toolbar dropdowns; "all" is the default and never appears in the URL.
const ROLE_OPTIONS = [{ value: "all", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))];
const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
];

const DESCRIPTION = "Users, roles and the companies and branches they can access.";

/**
 * @component TeamView
 * @description Team page: users the signed-in role may see, with role/status filters, search and pagination in the URL.
 * Admins can also create, edit and disable users (buttons are display only; the API enforces it).
 */
export const TeamView = () => {
  const { data: me } = useMe();
  const canManage = me?.role === "ADMIN";
  const params = useTeamParams();
  const { data, isPending, isError, error, isPlaceholderData } = useGetUsers({
    q: params.q,
    role: params.filters.role,
    status: params.filters.status,
    branch: "",
    page: params.page,
    pageSize: PAGE_SIZE,
  });
  const updateUser = useUpdateUser();

  // Form state: undefined editing = create mode. `formKey` remounts the form so it starts from the right user.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser>();
  const [confirmDisable, setConfirmDisable] = useState<TeamUser>();

  // Opens the form in create mode.
  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const setStatus = (user: TeamUser, status: "ACTIVE" | "DISABLED") =>
    updateUser.mutate({
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      mobile: user.mobile ?? "",
      role: user.role,
      agencyId: user.agency?.id ?? "",
      reportsToId: user.reportsTo?.id ?? "",
      access: user.access as never,
      status,
    });

  const columns = useMemo(
    () =>
      getTeamColumns({
        canManage,
        onEdit: (u) => {
          setEditing(u);
          setFormOpen(true);
        },
        onToggleStatus: (u) => (u.status === "ACTIVE" ? setConfirmDisable(u) : setStatus(u, "ACTIVE")),
        pendingId: updateUser.isPending ? updateUser.variables?.id : undefined,
      }),
    // setStatus only closes over the stable mutate function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, updateUser.isPending, updateUser.variables?.id],
  );

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={params.filters.role}
          onChange={(v) => params.setFilter("role", v)}
          options={ROLE_OPTIONS}
          ariaLabel="Filter by role"
        />
        <FilterSelect
          value={params.filters.status}
          onChange={(v) => params.setFilter("status", v)}
          options={STATUS_OPTIONS}
          ariaLabel="Filter by status"
        />
        {params.hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>
        )}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, email, mobile" />
      </div>
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.total ? `Showing ${from}–${to} of ${data.total} users` : "No users"}
        </p>
      )}
    </div>
  );

  return (
    <EntityContainer
      header={
        canManage ? (
          <EntityHeader title="Team" description={DESCRIPTION} newButtonLabel="New user" onNew={openCreate} />
        ) : (
          <EntityHeader title="Team" description={DESCRIPTION} />
        )
      }
      search={toolbar}
      pagination={
        <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />
      }
    >
      {isPending ? (
        <LoadingView message="Loading team…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load the team.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No users"
          message={params.hasActiveFilters ? "No users match these filters." : "No users yet."}
          label="New user"
          onNew={canManage ? openCreate : undefined}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} startIndex={(data.page - 1) * data.pageSize} getRowKey={(u) => u.id} />
      )}

      {formOpen && (
        <TeamFormDialog key={editing?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} user={editing} />
      )}

      <AlertDialog open={!!confirmDisable} onOpenChange={(open) => !open && setConfirmDisable(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {confirmDisable?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They will be signed out on their next request and cannot sign in until re-enabled. Their open cases move to active colleagues; their call history stays.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDisable) setStatus(confirmDisable, "DISABLED");
                setConfirmDisable(undefined);
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EntityContainer>
  );
};
