import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import type { CallItem } from "../types";

// Watches one call and reacts the moment it stops ringing: an answered / missed call calls `onNeedsOutcome` (the page opens the outcome
// form), a failed call shows a toast and frees the Call button. Only a live INITIATED -> final change counts, so reloading a page whose
// call already ended does not pop the form again (the "Outcome pending" panel covers that case).
export const useCallFinished = (call: CallItem | undefined, loanId: string, onNeedsOutcome: (call: CallItem) => void) => {
  const queryClient = useQueryClient();
  // Last status seen for each call id; compared with the new status on every update.
  const seen = useRef(new Map<string, CallItem["status"]>());
  // Always the latest callback, so the effect below doesn't re-run when the parent re-renders.
  const callback = useRef(onNeedsOutcome);
  useEffect(() => {
    callback.current = onNeedsOutcome;
  });

  useEffect(() => {
    if (!call) return;
    const before = seen.current.get(call.id);
    seen.current.set(call.id, call.status);
    if (before !== "INITIATED" || call.status === "INITIATED") return;
    queryClient.invalidateQueries({ queryKey: ["get-loan", loanId] });
    queryClient.invalidateQueries({ queryKey: ["get-pending-call"] });
    queryClient.invalidateQueries({ queryKey: ["get-calls"] });
    if (call.status === "FAILED") toast.add({ title: "Call didn't go through", description: "You can try again.", type: "error" });
    else callback.current(call);
  }, [call, loanId, queryClient]);
};
