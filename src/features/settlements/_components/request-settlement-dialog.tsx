"use client";

import { useState } from "react";
import { IndianRupeeIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatInr } from "@/lib/format";
import { settlementOfferError, waiverFor, waiverPct } from "@/lib/settlement";
import { useRequestSettlement } from "../hooks/use-request-settlement";
import { requestSettlementSchema } from "../schemas";

/**
 * @component RequestSettlementDialog
 * @description Form for the owning agent to offer a settlement: how much the customer will pay. Shows the waiver (amount and share of the
 * overdue) as they type so they know what a manager will be asked to approve.
 * @param overdue The loan's overdue amount.
 */
export const RequestSettlementDialog = ({
  loanId,
  overdue,
  open,
  onOpenChange,
}: {
  loanId: string;
  overdue: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { mutate, isPending } = useRequestSettlement();
  // The amount as typed, to preview the waiver; everything else is read from the form on submit.
  const [amountText, setAmountText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amount = Number(amountText);
  const preview = overdue && amount > 0 && amount < overdue ? { waiver: waiverFor(overdue, amount), pct: waiverPct(overdue, waiverFor(overdue, amount)) } : null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAmountText("");
      setErrors({});
    }
    onOpenChange(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = requestSettlementSchema.safeParse({ requestedAmount: amountText.trim() === "" ? undefined : amount, remarks: String(f.get("remarks") ?? "") });
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
    const offerError = settlementOfferError(overdue, parsed.data.requestedAmount);
    if (offerError) return setErrors({ requestedAmount: offerError });
    setErrors({});
    mutate({ loanId, ...parsed.data }, { onSuccess: () => handleOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Request a settlement"
      description={overdue ? `Overdue now: ${formatInr(overdue)}. A manager reviews every request.` : "A manager reviews every request."}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="settlement-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <form id="settlement-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!errors.requestedAmount}>
            <FieldLabel htmlFor="requestedAmount">Customer will pay</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <IndianRupeeIcon />
              </InputGroupAddon>
              <InputGroupInput id="requestedAmount" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} aria-invalid={!!errors.requestedAmount} />
            </InputGroup>
            {preview && <FieldDescription>This waives {formatInr(preview.waiver)} ({preview.pct}% of the overdue amount).</FieldDescription>}
            {errors.requestedAmount && <FieldError>{errors.requestedAmount}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.remarks}>
            <FieldLabel htmlFor="settlement-remarks">Why this offer? (optional)</FieldLabel>
            <Textarea id="settlement-remarks" name="remarks" rows={3} aria-invalid={!!errors.remarks} />
            {errors.remarks && <FieldError>{errors.remarks}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
