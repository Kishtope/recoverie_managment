import { format } from "date-fns";
import { CallStatusBadge } from "@/components/call-status-badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recordingSrc } from "../api";
import type { CallItem } from "../types";

/**
 * @component CallLine
 * @description One call in a case's history: direction, status and talk time, plus a recording player for answered calls.
 * The audio loads only when played (`preload="none"`), so the server's access check and audit entry happen on a real play.
 * @param withTime Prefix the line with the call's date/time (for calls shown on their own, not under an outcome).
 */
export const CallLine = ({ call, withTime, className }: { call: CallItem; withTime?: boolean; className?: string }) => {
  const inbound = call.direction === "INBOUND";
  const label = inbound
    ? call.status === "MISSED"
      ? "Customer called, missed"
      : "Customer called"
    : call.status === "CONNECTED"
      ? `Call · ${formatDuration(call.durationSec)}`
      : call.status === "INITIATED"
        ? "Call · ringing"
        : "Call";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {withTime && <span className="text-xs">{format(new Date(call.startedAt), "dd MMM yyyy, h:mm a")} ·</span>}
        <span>{label}</span>
        <CallStatusBadge status={call.status} />
        {inbound && call.status === "MISSED" && <span className="text-xs">{call.callbackResolvedAt ? "Called back" : "Not called back yet"}</span>}
        {call.status === "FAILED" && call.failureReason && <span className="text-xs">{call.failureReason}</span>}
        {call.needsOutcome && <span className="text-xs font-medium text-foreground">Outcome pending</span>}
      </div>
      {call.status === "CONNECTED" &&
        (call.hasRecording ? (
          <audio controls preload="none" src={recordingSrc(call.id)} className="h-9 w-full max-w-sm" />
        ) : (
          <span className="text-xs text-muted-foreground">{call.provider === "MOCK" ? "No recording (test call)" : "No recording"}</span>
        ))}
    </div>
  );
};
