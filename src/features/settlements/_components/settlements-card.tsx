"use client";

import { useState } from "react";
import { format } from "date-fns";
import { BadgePercentIcon, CheckIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DecideSettlementDialog } from "./decide-settlement-dialog";
import { RequestSettlementDialog } from "./request-settlement-dialog";
import type { SettlementItem } from "../types";

// Badge per status: waiting is neutral, approved is green, rejected is red.
const StatusBadge = ({ status }: { status: SettlementItem["status"] }) =>
  status === "APPROVED" ? (
    <Badge className="bg-success text-success-foreground">Approved</Badge>
  ) : status === "REJECTED" ? (
    <Badge variant="destructive">Rejected</Badge>
  ) : (
    <Badge variant="secondary">Waiting</Badge>
  );

/**
 * @component SettlementsCard
 * @description Settlement offers on a case: who asked, how much the customer would pay and how much is waived. The owning agent can request
 * one; a Manager (within the Admin's limit) or Admin can approve, and either can reject.
 * @param canRequest Whether the signed-in user may ask for a settlement on this case.
 * @param overdue The loan's overdue amount, shown while asking so the agent sees what is being waived.
 */
export const SettlementsCard = ({
  loanId,
  settlements,
  canRequest,
  overdue,
  className,
}: {
  loanId: string;
  settlements: SettlementItem[];
  canRequest: boolean;
  overdue: number | null;
  className?: string;
}) => {
  const [requestOpen, setRequestOpen] = useState(false);
  // The offer being decided and which way; null keeps the dialog closed.
  const [deciding, setDeciding] = useState<{ item: SettlementItem; decision: "APPROVED" | "REJECTED" } | null>(null);

  // Nothing to show to someone who cannot act and has nothing to read.
  if (settlements.length === 0 && !canRequest) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Settlement</CardTitle>
        <CardDescription>A one-time offer: the customer pays less than the overdue amount and the rest is waived.</CardDescription>
        {canRequest && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              <BadgePercentIcon data-icon="inline-start" />
              Request
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {settlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No settlement requested on this case.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {settlements.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    Pays {formatInr(s.requestedAmount)} · waives {formatInr(s.waiverAmount)} ({s.waiverPct}%)
                  </span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Asked by {s.requestedBy ?? "unknown"} on {format(new Date(s.createdAt), "dd MMM yyyy")}
                  {s.decidedBy && s.decidedAt ? ` · ${s.status === "APPROVED" ? "approved" : "rejected"} by ${s.decidedBy} on ${format(new Date(s.decidedAt), "dd MMM yyyy")}` : ""}
                </p>
                {s.remarks && <p>{s.remarks}</p>}
                {s.decisionNote && <p className="text-muted-foreground">Decision note: {s.decisionNote}</p>}
                {s.status === "PENDING" && (s.canApprove || s.canReject) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {s.canApprove && (
                      <Button size="sm" onClick={() => setDeciding({ item: s, decision: "APPROVED" })}>
                        <CheckIcon data-icon="inline-start" />
                        Approve
                      </Button>
                    )}
                    {s.canReject && (
                      <Button size="sm" variant="outline" onClick={() => setDeciding({ item: s, decision: "REJECTED" })}>
                        <XIcon data-icon="inline-start" />
                        Reject
                      </Button>
                    )}
                    {!s.canApprove && <span className="text-xs text-muted-foreground">Above your approval limit: an Admin has to approve.</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {canRequest && <RequestSettlementDialog loanId={loanId} overdue={overdue} open={requestOpen} onOpenChange={setRequestOpen} />}
      <DecideSettlementDialog loanId={loanId} target={deciding} onClose={() => setDeciding(null)} />
    </Card>
  );
};
