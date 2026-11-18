"use client";

import { useState } from "react";
import { PhoneOffIcon, PhoneIcon, ShieldCheckIcon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import type { ComplianceInput } from "../schemas";
import { useUpdateCompliance } from "../hooks/use-update-compliance";
import type { LoanDetail } from "../types";

// Copy for the confirm dialog of each action.
const CONFIRM: Record<ComplianceInput["action"], { title: string; description: string; confirm: string }> = {
  RESOLVE_DISPUTE: { title: "Resolve this dispute?", description: "Recovery calls on this case can start again.", confirm: "Resolve dispute" },
  SET_DO_NOT_CALL: { title: "Mark customer do-not-call?", description: "Calls to this customer are blocked on all their cases until you clear it.", confirm: "Mark do-not-call" },
  CLEAR_DO_NOT_CALL: { title: "Clear do-not-call?", description: "Agents will be able to call this customer again.", confirm: "Clear" },
};

/**
 * @component ComplianceActions
 * @description Manager / Admin controls on a case: resolve a dispute and set or clear the customer's do-not-call flag, each behind a confirmation.
 * @param loan The case being shown; the buttons that do not apply to its state are hidden.
 */
export const ComplianceActions = ({ loan }: { loan: LoanDetail }) => {
  const { mutate, isPending } = useUpdateCompliance();
  // The action waiting for the user's confirmation, if any.
  const [pending, setPending] = useState<ComplianceInput["action"] | null>(null);

  if (!loan.canManageCompliance || loan.status === "CLOSED") return null;

  return (
    <>
      {loan.escalatedAt && (
        <Button variant="outline" size="lg" disabled={isPending} onClick={() => setPending("RESOLVE_DISPUTE")}>
          {isPending ? <Spinner data-icon="inline-start" /> : <ShieldCheckIcon data-icon="inline-start" />}
          Resolve dispute
        </Button>
      )}
      <Button variant="outline" size="lg" disabled={isPending} onClick={() => setPending(loan.doNotCall ? "CLEAR_DO_NOT_CALL" : "SET_DO_NOT_CALL")}>
        {loan.doNotCall ? <PhoneIcon data-icon="inline-start" /> : <PhoneOffIcon data-icon="inline-start" />}
        {loan.doNotCall ? "Clear do-not-call" : "Do not call"}
      </Button>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending && CONFIRM[pending].title}</AlertDialogTitle>
            <AlertDialogDescription>{pending && CONFIRM[pending].description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) mutate({ loanId: loan.id, action: pending });
                setPending(null);
              }}
            >
              {pending && CONFIRM[pending].confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
