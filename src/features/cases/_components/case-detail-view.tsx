"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { format, parse } from "date-fns";
import { ArrowLeftIcon, CalendarClockIcon, MapPinIcon, PhoneIcon, PlusIcon, UserRoundIcon, UsersRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { CaseStatusBadge, PtpStatusBadge, RiskTagBadge } from "@/components/case-status-badge";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import { PaymentsCard } from "@/features/payments/_components/payments-card";
import { SettlementsCard } from "@/features/settlements/_components/settlements-card";
import { CallButton } from "@/features/calls/_components/call-button";
import { CallPanel } from "@/features/calls/_components/call-panel";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import type { CallItem } from "@/features/calls/types";
import { useGetLoan } from "../hooks/use-get-loan";
import { ComplianceActions } from "./compliance-actions";
import { DispositionHistory } from "./disposition-history";
import { OutcomeFormDialog } from "./outcome-form-dialog";
import { ReassignDialog } from "./reassign-dialog";

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
 * The "Call" and "Add outcome" buttons appear only for the agent the case is allocated to; on phones they are pinned to the bottom of the screen.
 * A live call shows as a panel under the header, and the outcome form opens by itself when the call is answered or missed.
 * @param id The loan id from the route.
 */
export const CaseDetailView = ({ id }: { id: string }) => {
  const { data: loan, isPending, isError, error } = useGetLoan(id);
  const [formOpen, setFormOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  // Bumped each time the form opens so it remounts fresh; a missed call opens it as "Not reachable".
  const [seed, setSeed] = useState<{ key: number; outcome?: string }>({ key: 0 });
  const openOutcomeForm = (call?: CallItem) => {
    setSeed((s) => ({ key: s.key + 1, outcome: call?.status === "MISSED" ? "NOT_REACHABLE" : undefined }));
    setFormOpen(true);
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <ComplianceActions loan={loan} />
            {loan.canReassign && (
              <Button variant="outline" size="lg" onClick={() => setReassignOpen(true)}>
                <UsersRoundIcon data-icon="inline-start" />
                Reassign
              </Button>
            )}
            {loan.canAddOutcome && (
              <div className="hidden items-center gap-2 md:flex">
                <CallButton loanId={loan.id} primaryMask={loan.customer.mobilePrimary} altMask={loan.customer.mobileAlt} canCall={loan.canCall} />
                <Button variant="outline" size="lg" onClick={() => openOutcomeForm()}>
                  <PlusIcon data-icon="inline-start" />
                  Add outcome
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Why calling is off right now (outside 9 AM-7 PM, a call still needs its outcome...), with a link to that case when it is another one. */}
        {loan.callBlocked && (
          <p className="text-sm text-muted-foreground">
            {loan.callBlocked.message}
            {loan.callBlocked.pendingLoanId && loan.callBlocked.pendingLoanId !== loan.id && (
              <>
                {" "}
                <Link href={`/cases/${loan.callBlocked.pendingLoanId}`} className="font-medium text-foreground underline">
                  Open case
                </Link>
              </>
            )}
          </p>
        )}

        {loan.currentCall && <CallPanel key={loan.currentCall.id} initial={loan.currentCall} loanId={loan.id} customerName={loan.customer.name} onAddOutcome={openOutcomeForm} />}

        <div className="flex flex-wrap items-center gap-2">
          <CaseStatusBadge status={loan.caseStatus} />
          <PtpStatusBadge status={loan.ptpStatus} />
          <RiskTagBadge tag={loan.riskTag} />
          {loan.doNotCall && <Badge variant="destructive">Do not call</Badge>}
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
              <CardDescription>Every call and outcome on this case, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <DispositionHistory items={loan.dispositions} calls={loan.calls} />
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

            <PaymentsCard loanId={loan.id} payments={loan.payments} canRecord={loan.canRecordPayment} />
            <SettlementsCard loanId={loan.id} settlements={loan.settlements} canRequest={loan.canRequestSettlement} overdue={loan.overdueAmount} />

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
        <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-border bg-background p-3 md:hidden">
          <CallButton className="flex-1" loanId={loan.id} primaryMask={loan.customer.mobilePrimary} altMask={loan.customer.mobileAlt} canCall={loan.canCall} />
          <Button variant="outline" size="lg" className="flex-1" onClick={() => openOutcomeForm()}>
            <PlusIcon data-icon="inline-start" />
            Add outcome
          </Button>
        </div>
      )}
      {loan.canReassign && <ReassignDialog loanId={loan.id} currentAgentId={loan.agent?.id ?? null} open={reassignOpen} onOpenChange={setReassignOpen} />}
      {loan.canAddOutcome && <OutcomeFormDialog key={seed.key} loanId={loan.id} open={formOpen} onOpenChange={setFormOpen} initialOutcome={seed.outcome} />}
    </>
  );
};
