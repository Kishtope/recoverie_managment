
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarClockIcon, HistoryIcon, MessageSquareTextIcon, PlusIcon, UserRoundIcon, UsersRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { CaseStatusBadge, PtpStatusBadge, RiskTagBadge } from "@/components/case-status-badge";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import { PaymentsCard } from "@/features/payments/_components/payments-card";
import { SettlementsCard } from "@/features/settlements/_components/settlements-card";
import { CallButton } from "@/features/calls/_components/call-button";
import { CallPanel } from "@/features/calls/_components/call-panel";
import { useMe } from "@/features/auth/hooks/use-me";
import { isWorkerRole } from "@/lib/constants";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import type { CallItem } from "@/features/calls/types";
import { useGetLoan } from "../hooks/use-get-loan";
import { CaseDetailsCard } from "./case-details-card";
import { ComplianceActions } from "./compliance-actions";
import { CustomerQueryCard, type Answer, type Answers } from "./customer-query-card";
import { DispositionHistory } from "./disposition-history";
import { OutcomePanel } from "./outcome-panel";
import { ReassignDialog } from "./reassign-dialog";

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
 * the customer questions and the interaction history on the left, and the outcome form, next step, customer and loan details on the right (stacked on phones).
 * Only the agent the case is allocated to gets the Call button, the question boxes and the outcome form; on phones Call and "Record outcome"
 * are pinned to the bottom of the screen. A live call shows as a panel under the header, and when it is answered or missed the page scrolls to the outcome form.
 * The customer answers live here so they are saved together with the outcome as one interaction.
 * @param id The loan id from the route.
 */
export const CaseDetailView = ({ id }: { id: string }) => {
  const { data: loan, isPending, isError, error } = useGetLoan(id);
  // Workers reach cases from Follow-ups, so "back" returns there.
  const { data: me } = useMe();
  const isWorker = isWorkerRole(me?.role);
  const [reassignOpen, setReassignOpen] = useState(false);
  // Which tab of the workspace is showing: the questions to ask, or what has been recorded so far.
  const [tab, setTab] = useState("questions");
  // What the customer said to each question, by question id; saved with the outcome, then cleared.
  const [answers, setAnswers] = useState<Answers>({});
  // Bumped to remount the outcome form fresh (after a save, or when a call ends); a missed call selects "No answer".
  const [seed, setSeed] = useState<{ key: number; choice?: string }>({ key: 0 });

  // Updates part of one answer.
  const changeAnswer = (questionId: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [questionId]: { ...(a[questionId] ?? { response: "", remarks: "" }), ...patch } }));

  // Brings the outcome form into view (it sits below the fold on phones); a call that just ended also preselects its likely result.
  const openOutcomeForm = (call?: CallItem) => {
    if (call) setSeed((s) => ({ key: s.key + 1, choice: call.status === "MISSED" ? "NO_ANSWER" : undefined }));
    requestAnimationFrame(() => document.getElementById("outcome-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // After a save: forget the answers, start the form over and open the history tab, where the new entry appears at the top.
  const onSaved = () => {
    setAnswers({});
    setSeed((s) => ({ key: s.key + 1 }));
    setTab("history");
    requestAnimationFrame(() => document.getElementById("case-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (isPending) return <LoadingView message="Loading case…" />;
  if (isError) return <ErrorView message={getErrorMessage(error, "Couldn't load this case.")} />;

  // Every call and interaction on the case, newest first (shown under a tab for agents, on its own for everyone else).
  const historyCard = (
    <Card>
      <CardHeader>
        <CardTitle>Interaction history</CardTitle>
        <CardDescription>
          {loan.dispositions.length} recorded, newest first. Past entries are never changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DispositionHistory items={loan.dispositions} calls={loan.calls} />
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 p-4 pb-24 md:px-10 md:py-6 md:pb-6">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href={isWorker ? "/follow-ups" : "/cases"} />}>
          <ArrowLeftIcon data-icon="inline-start" />
          {isWorker ? "Back to follow-ups" : "Back to cases"}
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

        <CaseDetailsCard loan={loan} />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Workspace: an agent switches between the questions to ask and what has been recorded; everyone else just sees the history. */}
          <div id="case-workspace" className="flex min-w-0 scroll-mt-4 flex-col gap-4">
            {loan.canAddOutcome ? (
              <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-4">
                <TabsList variant="line" className="w-full justify-start border-b border-border">
                  <TabsTrigger value="questions" className="flex-none">
                    <MessageSquareTextIcon data-icon="inline-start" />
                    Customer query
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-none">
                    <HistoryIcon data-icon="inline-start" />
                    Interaction history
                    <Badge variant="secondary">{loan.dispositions.length}</Badge>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="questions">
                  <CustomerQueryCard answers={answers} onChange={changeAnswer} />
                </TabsContent>
                <TabsContent value="history">{historyCard}</TabsContent>
              </Tabs>
            ) : (
              historyCard
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {loan.canAddOutcome && (
              <OutcomePanel
                key={seed.key}
                loanId={loan.id}
                overdueAmount={loan.overdueAmount}
                notReachableCount={loan.notReachableCount}
                answers={answers}
                onSaved={onSaved}
                initialChoice={seed.choice}
              />
            )}
            <Card>
              <CardHeader>
                <CardTitle>Next step</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClockIcon className="size-4" aria-hidden />
                    Follow-up
                  </span>
                  <FollowUpBadge day={loan.nextFollowUpOn} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRoundIcon className="size-4" aria-hidden />
                    Allocated to
                  </span>
                  {loan.agent ? (
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(loan.agent.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{loan.agent.name}</span>
                    </span>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <PaymentsCard loanId={loan.id} payments={loan.payments} canRecord={loan.canRecordPayment} />
            <SettlementsCard loanId={loan.id} settlements={loan.settlements} canRequest={loan.canRequestSettlement} overdue={loan.overdueAmount} />
          </div>
        </div>
      </div>

      {loan.canAddOutcome && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-border bg-background p-3 md:hidden">
          <CallButton className="flex-1" loanId={loan.id} primaryMask={loan.customer.mobilePrimary} altMask={loan.customer.mobileAlt} canCall={loan.canCall} />
          <Button variant="outline" size="lg" className="flex-1" onClick={() => openOutcomeForm()}>
            <PlusIcon data-icon="inline-start" />
            Record outcome
          </Button>
        </div>
      )}
      {loan.canReassign && <ReassignDialog loanId={loan.id} currentAgentId={loan.agent?.id ?? null} open={reassignOpen} onOpenChange={setReassignOpen} />}
    </>
  );
};
