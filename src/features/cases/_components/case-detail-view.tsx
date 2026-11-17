"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { format, parse } from "date-fns";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetLoan } from "../hooks/use-get-loan";
import { DispositionHistory } from "./disposition-history";
import { OutcomeFormDialog } from "./outcome-form-dialog";

// One labelled value in a details card; empty optional values show as "-".
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className="kicker text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm">{children === null || children === undefined || children === "" ? "-" : children}</dd>
  </div>
);

/**
 * @component CaseDetailView
 * @description One case: loan and customer details (mobiles masked by the API), flags, next follow-up and the full outcome history.
 * The "Add outcome" button appears only for the agent the case is allocated to; on phones it is pinned to the bottom of the screen.
 * @param id The loan id from the route.
 */
export const CaseDetailView = ({ id }: { id: string }) => {
  const { data: loan, isPending, isError, error } = useGetLoan(id);
  const [formOpen, setFormOpen] = useState(false);

  if (isPending) return <LoadingView message="Loading case…" />;
  if (isError) return <ErrorView message={getErrorMessage(error, "Couldn't load this case.")} />;

  const addButton = loan.canAddOutcome ? (
    <Button onClick={() => setFormOpen(true)}>
      <PlusIcon data-icon="inline-start" />
      Add outcome
    </Button>
  ) : null;

  return (
    <>
      <EntityContainer
        header={
          <div className="flex flex-col gap-3">
            <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/cases" />}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to cases
            </Button>
            <EntityHeader
              title={`${loan.customer.name} · ${loan.agreementNo}`}
              description={`${loan.company} · ${loan.branch}${loan.agent ? ` · Allocated to ${loan.agent.name}` : " · Unassigned"}`}
              actions={<div className="hidden md:block">{addButton}</div>}
            />
            <div className="flex flex-wrap items-center gap-2">
              <OutcomeBadge outcome={loan.lastOutcome} />
              <FollowUpBadge day={loan.nextFollowUpOn} />
              {loan.fieldVisitFlag && <Badge variant="outline">Field visit pending</Badge>}
              {loan.escalatedAt && <Badge variant="destructive">Escalated</Badge>}
              {loan.status === "CLOSED" && <Badge variant="secondary">Closed</Badge>}
            </div>
          </div>
        }
      >
        <div className="grid min-w-0 gap-4 pb-20 md:grid-cols-2 md:pb-0">
          <Card>
            <CardHeader>
              <CardTitle>Loan</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="EMI">{formatInr(loan.emiAmount)}</Detail>
                <Detail label="Pending EMIs">{loan.pendingEmis}</Detail>
                <Detail label="DPD">{loan.dpd}</Detail>
                <Detail label="Overdue">{formatInr(loan.overdueAmount)}</Detail>
                <Detail label="Disbursed on">{loan.disbursedOn ? format(parse(loan.disbursedOn, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : null}</Detail>
                <Detail label="Status">{loan.status === "ACTIVE" ? "Active" : "Closed"}</Detail>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Mobile">{loan.customer.mobilePrimary}</Detail>
                <Detail label="Alternate">{loan.customer.mobileAlt}</Detail>
                <Detail label="Area">{loan.customer.area}</Detail>
                <Detail label="PIN">{loan.customer.pin}</Detail>
                <div className="col-span-2">
                  <Detail label="Address">{loan.customer.address}</Detail>
                </div>
              </dl>
              {loan.customer.references.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="kicker text-muted-foreground">References</span>
                  <ul className="flex flex-col gap-1 text-sm">
                    {loan.customer.references.map((r, i) => (
                      <li key={i}>
                        {r.name || "-"}
                        {r.relation ? ` (${r.relation})` : ""} · {r.mobile ?? "-"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <DispositionHistory items={loan.dispositions} />
            </CardContent>
          </Card>
        </div>
      </EntityContainer>

      {loan.canAddOutcome && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background p-3 md:hidden">
          <Button className="w-full" onClick={() => setFormOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add outcome
          </Button>
        </div>
      )}
      {loan.canAddOutcome && <OutcomeFormDialog loanId={loan.id} open={formOpen} onOpenChange={setFormOpen} />}
    </>
  );
};
