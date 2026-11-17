"use client";

import { useEffect, useState } from "react";
import { PhoneCallIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CallStatusBadge } from "@/components/call-status-badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCallFinished } from "../hooks/use-call-finished";
import { useGetCall } from "../hooks/use-get-call";
import { useSimulateCall } from "../hooks/use-simulate-call";
import type { CallItem } from "../types";

// Seconds since `from`, ticking every second while `active` (drives the ringing timer).
const useElapsedSeconds = (from: string, active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
};

/**
 * @component CallPanel
 * @description The card under the case header while a call is live or waiting for its outcome: who is being called, live status with a
 * timer, and (mock provider in dev only) a dashed "Test call controls" box to end the call as answered / missed / failed.
 * Once the call is answered or missed it shows "Outcome pending" with an "Add outcome" button.
 * @param initial The call as last loaded with the case; the panel then polls it every 2s until it stops ringing.
 * @param onAddOutcome Opens the outcome form for this call; also called automatically the moment the call is answered or missed.
 */
export const CallPanel = ({
  initial,
  loanId,
  customerName,
  onAddOutcome,
}: {
  initial: CallItem;
  loanId: string;
  customerName: string;
  onAddOutcome: (call: CallItem) => void;
}) => {
  const { data } = useGetCall(initial.id);
  const call = data?.call ?? initial;
  useCallFinished(data?.call, loanId, onAddOutcome);
  const { mutate, isPending, variables } = useSimulateCall();
  const ringing = call.status === "INITIATED";
  const elapsed = useElapsedSeconds(call.startedAt, ringing);
  const simulating = (result: string) => isPending && variables?.result === result;

  return (
    <Card aria-live="polite">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-muted", ringing && "motion-safe:animate-pulse")}>
            {ringing ? <PhoneCallIcon className="size-5" /> : <PhoneIcon className="size-5" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">
              {ringing ? "Calling" : "Call with"} {customerName} · {call.numberMask ?? "-"}
            </span>
            <span className="text-xs text-muted-foreground">
              {ringing ? `Ringing ${formatDuration(elapsed)}` : call.status === "CONNECTED" ? `Talked for ${formatDuration(call.durationSec)}` : "Not answered"}
            </span>
          </div>
          <CallStatusBadge status={call.status} />
          {call.needsOutcome && (
            <Button variant="accent" size="sm" onClick={() => onAddOutcome(call)}>
              <PlusIcon data-icon="inline-start" />
              Add outcome
            </Button>
          )}
        </div>

        {call.needsOutcome && <p className="text-sm text-muted-foreground">Outcome pending. Record it before your next call.</p>}

        {ringing && data?.canSimulate && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-border p-3">
            <span className="kicker text-muted-foreground">Test call controls</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => mutate({ callId: call.id, result: "CONNECTED", durationSec: 120 })}>
                {simulating("CONNECTED") && <Spinner data-icon="inline-start" />}
                Answered (2 min)
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => mutate({ callId: call.id, result: "MISSED" })}>
                {simulating("MISSED") && <Spinner data-icon="inline-start" />}
                Not answered
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => mutate({ callId: call.id, result: "FAILED" })}>
                {simulating("FAILED") && <Spinner data-icon="inline-start" />}
                Failed
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
