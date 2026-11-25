"use client";

import { useState } from "react";
import { IndianRupeeIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { formatInr } from "@/lib/format";
import { useUpdateLoanOverdue } from "../hooks/use-update-loan-overdue";
import { updateOverdueSchema } from "../schemas";
import type { LoanListItem } from "../types";

/**
 * @component EditOverdueDialog
 * @description Admin / Manager form to correct one case's overdue amount. Shows who the case is for and the current figure; the dashboards
 * pick up the new amount once it is saved.
 * @param loan The case being edited (null while the dialog is closed).
 */
export const EditOverdueDialog = ({ loan, onOpenChange }: { loan: LoanListItem | null; onOpenChange: (open: boolean) => void }) => {
  const { mutate, isPending } = useUpdateLoanOverdue();
  // Typed text of the amount field, and the validation message under it.
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  // The case the field was last filled for, so opening the dialog on another case resets the text.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (loan && loan.id !== filledFor) {
    setFilledFor(loan.id);
    setAmount(loan.overdueAmount === null ? "" : String(loan.overdueAmount));
    setError("");
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loan) return;
    const parsed = updateOverdueSchema.safeParse({ overdueAmount: amount.trim() === "" ? undefined : Number(amount) });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the amount");
    setError("");
    mutate({ loanId: loan.id, ...parsed.data }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={!!loan}
      onOpenChange={onOpenChange}
      title="Edit overdue amount"
      description={loan ? `${loan.customerName} · ${loan.agreementNo}. Currently ${formatInr(loan.overdueAmount)}.` : undefined}
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="edit-overdue-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save amount"}
          </Button>
        </>
      }
    >
      <form id="edit-overdue-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="edit-overdue-amount">Overdue amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <IndianRupeeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="edit-overdue-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!error}
                disabled={isPending}
              />
            </InputGroup>
            {error ? <FieldError>{error}</FieldError> : <FieldDescription>Replaces the imported amount. The change is recorded in the audit log.</FieldDescription>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
