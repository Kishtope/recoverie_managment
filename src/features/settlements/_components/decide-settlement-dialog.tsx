"use client";

import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatInr } from "@/lib/format";
import { useState } from "react";
import { useDecideSettlement } from "../hooks/use-decide-settlement";
import { decideSettlementSchema } from "../schemas";
import type { SettlementItem } from "../types";

/**
 * @component DecideSettlementDialog
 * @description Confirms approving or rejecting a settlement, with an optional note the agent will see.
 * @param target The offer and decision being confirmed, or null to keep the dialog closed.
 */
export const DecideSettlementDialog = ({
  loanId,
  target,
  onClose,
}: {
  loanId: string;
  target: { item: SettlementItem; decision: "APPROVED" | "REJECTED" } | null;
  onClose: () => void;
}) => {
  const { mutate, isPending } = useDecideSettlement();
  const [error, setError] = useState("");
  const approving = target?.decision === "APPROVED";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!target) return;
    const note = String(new FormData(e.currentTarget).get("note") ?? "");
    const parsed = decideSettlementSchema.safeParse({ decision: target.decision, note });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the note");
    setError("");
    mutate({ loanId, settlementId: target.item.id, ...parsed.data }, { onSuccess: onClose });
  };

  return (
    <FormDialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
      title={approving ? "Approve this settlement?" : "Reject this settlement?"}
      description={target ? `The customer would pay ${formatInr(target.item.requestedAmount)} and ${formatInr(target.item.waiverAmount)} (${target.item.waiverPct}%) is waived.` : undefined}
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="decide-settlement-form" variant={approving ? "default" : "destructive"} disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {approving ? "Approve" : "Reject"}
          </Button>
        </>
      }
    >
      <form id="decide-settlement-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="decision-note">Note (optional)</FieldLabel>
            <Textarea id="decision-note" name="note" rows={3} aria-invalid={!!error} />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
