"use client";

import { useState } from "react";
import { IndianRupeeIcon } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { todayIst } from "@/lib/dates";
import { useRecordPayment } from "../hooks/use-record-payment";
import { PAYMENT_MODES, PAYMENT_MODE_LABELS, recordPaymentSchema } from "../schemas";
import type { PaymentItem } from "../types";

/**
 * @component RecordPaymentDialog
 * @description Records money received on a case (amount, day, mode, optional reference) and creates its receipt. Validated with the same zod
 * schema the API uses; the hook shows the toast.
 * @param onRecorded Called with the new payment so the page can open its receipt.
 */
export const RecordPaymentDialog = ({
  loanId,
  open,
  onOpenChange,
  onRecorded,
}: {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (payment: PaymentItem) => void;
}) => {
  const { mutate, isPending } = useRecordPayment();
  const today = todayIst();
  const [paidOn, setPaidOn] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPaidOn(today);
      setErrors({});
    }
    onOpenChange(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amountText = String(f.get("amount") ?? "").trim();
    const parsed = recordPaymentSchema.safeParse({
      amount: amountText === "" ? undefined : Number(amountText),
      paidOn,
      mode: String(f.get("mode") ?? ""),
      reference: String(f.get("reference") ?? ""),
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate({ loanId, ...parsed.data }, { onSuccess: (payment) => { handleOpenChange(false); onRecorded(payment); } });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Record a payment"
      description="Use this when the customer has paid. A receipt number is created for it."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="payment-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Record payment"}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="amount">Amount received</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <IndianRupeeIcon />
              </InputGroupAddon>
              <InputGroupInput id="amount" name="amount" inputMode="decimal" aria-invalid={!!errors.amount} />
            </InputGroup>
            {errors.amount && <FieldError>{errors.amount}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.paidOn}>
            <FieldLabel>Received on</FieldLabel>
            <DatePicker value={paidOn} onChange={setPaidOn} max={today} />
            {errors.paidOn && <FieldError>{errors.paidOn}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.mode}>
            <FieldLabel htmlFor="mode">Paid by</FieldLabel>
            <FormSelect id="mode" name="mode" defaultValue="UPI" invalid={!!errors.mode} options={PAYMENT_MODES.map((m) => ({ value: m, label: PAYMENT_MODE_LABELS[m] }))} />
            {errors.mode && <FieldError>{errors.mode}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.reference}>
            <FieldLabel htmlFor="reference">Reference (optional)</FieldLabel>
            <Input id="reference" name="reference" aria-invalid={!!errors.reference} />
            <FieldDescription>UPI transaction ID, cheque number or bank reference.</FieldDescription>
            {errors.reference && <FieldError>{errors.reference}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
