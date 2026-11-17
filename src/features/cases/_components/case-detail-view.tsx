"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { format, parse } from "date-fns";
import { ArrowLeftIcon, CalendarClockIcon, MapPinIcon, PhoneIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import { useGetLoan } from "../hooks/use-get-loan";
import { DispositionHistory } from "./disposition-history";
import { OutcomeFormDialog } from "./outcome-form-dialog";

// One labelled value in a details card; empty optional values show as "-".
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className="kicker text-muted-foreground">{label}</dt>
    <dd className="wrap-break-word text-sm">{children === null || children === undefined || children === "" ? "-" : children}</dd>
  </div>
);

// One headline figure in the stat strip. `emphasis` makes the number larger (used for the overdue amount, the figure agents act on).
const Stat = ({ label, value, emphasis }: { label: string; value: ReactNode; emphasis?: boolean }) => (
  <div className="flex min-w-0 flex-col gap-1 bg-card p-4 md:p-5">
    <span className="kicker text-muted-foreground">{label}</span>
    <span className={emphasis ? "display-number truncate text-4xl md:text-5xl" : "display-number truncate text-3xl"}>{value}</span>
  </div>
);

/**
 * @component CaseDetailView
 * @description One case laid out for action: a profile header with flags, a strip of the four numbers that matter (overdue, DPD, EMI, pending EMIs),
 * the outcome timeline on the left, and next step, customer and loan details on the right (stacked on phones).
 * The "Add outcome" button appears only for the agent the case is allocated to; on phones it is pinned to the bottom of the screen.
 * @param id The loan id from the route.
 */
export const CaseDetailView = ({ id }: { id: string }) => {
  const { data: loan, isPending, isError, error } = useGetLoan(id);
  const [formOpen, setFormOpen] = useState(false);

  if (isPending) return <LoadingView message="Loading case…" />;
  if (isError) return <ErrorView message={getErrorMessage(error, "Couldn't load this case.")} />;

  return (
    <>
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 p-4 pb-24 md:px-10 md:py-6 md:pb-6">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/cases" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to cases
        </Button>

        {/* Profile header: who the customer is, which loan, and every flag that changes how the agent should act. */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-lg font-semibold">{getInitials(loan.customer.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-3xl md:text-4xl">{loan.customer.name}</h1>
              <p className="truncate text-sm text-muted-foreground">
                Agreement {loan.agreementNo} · {loan.company} · {loan.branch}
              </p>
            </div>
          </div>
          {loan.canAddOutcome && (
            <Button variant="accent" size="lg" className="hidden md:inline-flex" onClick={() => setFormOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add outcome
            </Button>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <OutcomeBadge outcome={loan.lastOutcome} />
          <FollowUpBadge day={loan.nextFollowUpOn} />
          {loan.fieldVisitFlag && <Badge variant="outline">Field visit pending</Badge>}
          {loan.escalatedAt && <Badge variant="destructive">Escalated</Badge>}
          {loan.status === "CLOSED" && <Badge variant="secondary">Closed</Badge>}
        </div>

        {/* Stat strip: one panel with dividers rather than four separate cards. */}
        <section aria-label="Loan summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-4">
          <Stat label="Overdue" value={formatInr(loan.overdueAmount)} emphasis />
          <Stat label="DPD" value={loan.dpd ?? "-"} />
          <Stat label="EMI" value={formatInr(loan.emiAmount)} />
          <Stat label="Pending EMIs" value={loan.pendingEmis ?? "-"} />
        </section>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Every outcome recorded on this case, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <DispositionHistory items={loan.dispositions} />
            </CardContent>
          </Card>

          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Next step</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" />
                  <FollowUpBadge day={loan.nextFollowUpOn} />
                </div>
                <div className="flex items-center gap-3">
                  <UserRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                  {loan.agent ? <span className="truncate">Allocated to {loan.agent.name}</span> : <Badge variant="outline">Unassigned</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Mobile">
                    <span className="inline-flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5 text-muted-foreground" />
                      {loan.customer.mobilePrimary}
                    </span>
                  </Detail>
                  <Detail label="Alternate">{loan.customer.mobileAlt}</Detail>
                  <Detail label="Area">{loan.customer.area}</Detail>
                  <Detail label="PIN">{loan.customer.pin}</Detail>
                  <div className="col-span-2">
                    <Detail label="Address">
                      <span className="inline-flex items-start gap-1.5">
                        <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {loan.customer.address}
                      </span>
                    </Detail>
                  </div>
                </dl>
                {loan.customer.references.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <span className="kicker text-muted-foreground">References</span>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {loan.customer.references.map((r, i) => (
                          <li key={i} className="flex flex-col">
                            <span>
                              {r.name || "-"}
                              {r.relation ? <span className="text-muted-foreground"> ({r.relation})</span> : null}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.mobile ?? "-"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Status">{loan.status === "ACTIVE" ? "Active" : "Closed"}</Detail>
                  <Detail label="Disbursed on">{loan.disbursedOn ? format(parse(loan.disbursedOn, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : null}</Detail>
                  <Detail label="Company">{loan.company}</Detail>
                  <Detail label="Branch">{loan.branch}</Detail>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {loan.canAddOutcome && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background p-3 md:hidden">
          <Button variant="accent" className="w-full" onClick={() => setFormOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add outcome
          </Button>
        </div>
      )}
      {loan.canAddOutcome && <OutcomeFormDialog loanId={loan.id} open={formOpen} onOpenChange={setFormOpen} />}
    </>
  );
};
