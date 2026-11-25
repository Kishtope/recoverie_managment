"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon, PowerIcon, PowerOffIcon, UserRoundIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { DataTable } from "@/components/data-table";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetRetailer, useGetRetailerCustomers } from "../hooks/use-get-retailers";
import { useUpdateRetailer } from "../hooks/use-retailer-mutations";
import { useRetailerCustomersParams } from "../hooks/use-retailers-params";
import { RetailerFormDialog } from "./retailer-form-dialog";
import { retailerCustomersColumns } from "./retailer-customers-table";
import { RetailerStatusBadge } from "./retailers-table";

const PAGE_SIZE = 10;

// One labelled fact on the retailer card (icon, then the value or "-").
const Fact = ({ icon: Icon, children }: { icon: typeof PhoneIcon; children: React.ReactNode }) => (
  <div className="flex min-w-0 items-start gap-2 text-sm">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    <span className="min-w-0 wrap-break-word">{children}</span>
  </div>
);

/**
 * @component RetailerDetailView
 * @description One retailer (Admin): its details with Edit and Activate / Deactivate, and the table of the customers it holds with search and
 * paging. Retailer assignment is separate from caller allocation, so the callers shown here are whoever holds each loan right now.
 * @param id The retailer id from the route.
 */
export const RetailerDetailView = ({ id }: { id: string }) => {
  const retailer = useGetRetailer(id);
  const params = useRetailerCustomersParams();
  const customers = useGetRetailerCustomers({ retailerId: id, q: params.q, page: params.page, pageSize: PAGE_SIZE });
  const update = useUpdateRetailer();
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  if (retailer.isPending) return <LoadingView message="Loading retailer…" />;
  if (retailer.isError) return <ErrorView message={getErrorMessage(retailer.error, "Couldn't load this retailer.")} />;
  const r = retailer.data;

  const data = customers.data;
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="h-full min-w-0 p-4 md:px-10 md:py-6">
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/retailers?tab=retailers" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Retailers
        </Button>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl">{r.name}</h1>
                  <RetailerStatusBadge status={r.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.code} · {r.customerCount.toLocaleString("en-IN")} {r.customerCount === 1 ? "customer" : "customers"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline"  size="sm" onClick={() => setEditing(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
                {r.status === "ACTIVE" ? (
                  <Button variant="outline"  size="sm" disabled={update.isPending} onClick={() => setDeactivating(true)}>
                    {update.isPending ? <Spinner data-icon="inline-start" /> : <PowerOffIcon data-icon="inline-start" />}
                    Deactivate
                  </Button>
                ) : (
                  <Button variant="accent" size="sm"  disabled={update.isPending} onClick={() => update.mutate({ id: r.id, retailerName: r.name, status: "ACTIVE" })}>
                    {update.isPending ? <Spinner data-icon="inline-start" /> : <PowerIcon data-icon="inline-start" />}
                    Activate
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={UserRoundIcon}>{r.ownerName}</Fact>
              <Fact icon={PhoneIcon}>{r.mobile}</Fact>
              <Fact icon={MailIcon}>{r.email ?? "-"}</Fact>
              <Fact icon={MapPinIcon}>{[r.city, r.address].filter(Boolean).join(" · ") || "-"}</Fact>
            </div>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-lg">Customers</h2>
          <div className="flex flex-wrap items-center gap-2">
            <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search name, agreement no. or mobile" />
          </div>
          {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} customers` : "No customers"}</p>}
          {customers.isPending ? (
            <LoadingView message="Loading customers…" />
          ) : customers.isError ? (
            <ErrorView message={getErrorMessage(customers.error, "Couldn't load customers.")} />
          ) : customers.data.items.length === 0 ? (
            <EntityEmptyView
              empty_label="No customers"
              message={params.hasActiveFilters || params.q ? "No customers match this search." : "This retailer holds no customers yet. They arrive with a customer upload whose rows carry this retailer's code."}
            />
          ) : (
            <DataTable className={cn(customers.isPlaceholderData && "opacity-60")} columns={retailerCustomersColumns} rows={customers.data.items} startIndex={(customers.data.page - 1) * customers.data.pageSize} getRowKey={(c) => c.id} />
          )}
          <EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={customers.isPlaceholderData} />
        </div>
      </div>

      <RetailerFormDialog open={editing} onOpenChange={setEditing} retailer={r} />

      <AlertDialog open={deactivating} onOpenChange={setDeactivating}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {r.name}?</AlertDialogTitle>
            <AlertDialogDescription>It stops receiving new customers. The customers it already holds stay with it, and you can activate it again at any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                update.mutate({ id: r.id, retailerName: r.name, status: "INACTIVE" });
                setDeactivating(false);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
