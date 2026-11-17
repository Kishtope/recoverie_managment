"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { OUTCOMES, OUTCOME_LABELS } from "@/lib/constants";
import { addDays, todayIst } from "@/lib/dates";
import { useAddDisposition } from "../hooks/use-add-disposition";
import { buildDispositionSchema } from "../schemas";

// Raw form text; converted to numbers / undefined only when validating on submit.
type Values = { outcome: string; ptpDate: string; ptpAmount: string; paidAmount: string; nextFollowUpOn: string; remarks: string };
const EMPTY: Values = { outcome: "", ptpDate: "", ptpAmount: "", paidAmount: "", nextFollowUpOn: "", remarks: "" };

// Empty text means "not filled"; otherwise the number (NaN is left to zod to reject).
const toNumber = (text: string) => (text.trim() === "" ? undefined : Number(text));

/**
 * @component OutcomeFormDialog
 * @description Form for recording what happened on a case. Only the fields the chosen outcome needs are shown; the same zod
 * schema the API uses validates it. The hook shows the toast; this only closes the dialog on success.
 * @param loanId The case the outcome belongs to.
 * @param initialOutcome Outcome chosen when the form first mounts (a missed call opens it as "Not reachable"). The parent remounts the
 * dialog (new key) each time it opens, so this is only read once.
 */
export const OutcomeFormDialog = ({
  loanId,
  open,
  onOpenChange,
  initialOutcome,
}: {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOutcome?: string;
}) => {
  const { mutate, isPending } = useAddDisposition();
  const today = todayIst();
  const [values, setValues] = useState<Values>(() => ({
    ...EMPTY,
    outcome: initialOutcome ?? "",
    nextFollowUpOn: initialOutcome === "NOT_REACHABLE" ? addDays(today, 1) : "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof Values, value: string) => setValues((v) => ({ ...v, [field]: value }));

  // Changing the outcome keeps what was typed, but pre-fills tomorrow as the follow-up for "Not reachable" so a retry is never forgotten.
  const onOutcomeChange = (outcome: string) =>
    setValues((v) => ({ ...v, outcome, nextFollowUpOn: outcome === "NOT_REACHABLE" && !v.nextFollowUpOn ? addDays(today, 1) : v.nextFollowUpOn }));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValues(EMPTY);
      setErrors({});
    }
    onOpenChange(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = buildDispositionSchema().safeParse({
      outcome: values.outcome || undefined,
      ptpDate: values.ptpDate || undefined,
      ptpAmount: toNumber(values.ptpAmount),
      paidAmount: toNumber(values.paidAmount),
      nextFollowUpOn: values.nextFollowUpOn || undefined,
      remarks: values.remarks || undefined,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate({ ...parsed.data, loanId }, { onSuccess: () => handleOpenChange(false) });
  };

  const o = values.outcome;
  const showPtp = o === "PTP";
  const showPaid = o === "PAID" || o === "PART_PAID";
  const showNext = o === "PART_PAID" || o === "CALLBACK" || o === "NOT_REACHABLE";

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add outcome"
      description="What happened on this case? It is saved to the history and cannot be edited later."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="outcome-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save outcome"}
          </Button>
        </>
      }
    >
      <form id="outcome-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Outcome</FieldLegend>
            <Field data-invalid={!!errors.outcome}>
              <FieldLabel htmlFor="outcome">Result of the conversation</FieldLabel>
              <NativeSelect id="outcome" value={values.outcome} onChange={(e) => onOutcomeChange(e.target.value)} aria-invalid={!!errors.outcome}>
                <NativeSelectOption value="">Choose an outcome</NativeSelectOption>
                {OUTCOMES.map((code) => (
                  <NativeSelectOption key={code} value={code}>{OUTCOME_LABELS[code]}</NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.outcome && <FieldError>{errors.outcome}</FieldError>}
            </Field>
          </FieldSet>

          {showPtp && (
            <FieldSet>
              <FieldLegend>Promise to pay</FieldLegend>
              <Field data-invalid={!!errors.ptpDate}>
                <FieldLabel>Promised date</FieldLabel>
                <DatePicker value={values.ptpDate} onChange={(v) => set("ptpDate", v)} min={today} placeholder="Pick the promised date" />
                <FieldDescription>The case comes back to your follow-ups on this day.</FieldDescription>
                {errors.ptpDate && <FieldError>{errors.ptpDate}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.ptpAmount}>
                <FieldLabel htmlFor="ptpAmount">Promised amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon><InputGroupText>₹</InputGroupText></InputGroupAddon>
                  <InputGroupInput id="ptpAmount" inputMode="decimal" value={values.ptpAmount} onChange={(e) => set("ptpAmount", e.target.value)} aria-invalid={!!errors.ptpAmount} />
                </InputGroup>
                {errors.ptpAmount && <FieldError>{errors.ptpAmount}</FieldError>}
              </Field>
            </FieldSet>
          )}

          {showPaid && (
            <FieldSet>
              <FieldLegend>Payment</FieldLegend>
              <Field data-invalid={!!errors.paidAmount}>
                <FieldLabel htmlFor="paidAmount">Amount paid</FieldLabel>
                <InputGroup>
                  <InputGroupAddon><InputGroupText>₹</InputGroupText></InputGroupAddon>
                  <InputGroupInput id="paidAmount" inputMode="decimal" value={values.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} aria-invalid={!!errors.paidAmount} />
                </InputGroup>
                <FieldDescription>As told by the customer; the payments import will confirm it later.</FieldDescription>
                {errors.paidAmount && <FieldError>{errors.paidAmount}</FieldError>}
              </Field>
            </FieldSet>
          )}

          {showNext && (
            <FieldSet>
              <FieldLegend>Next follow-up</FieldLegend>
              <Field data-invalid={!!errors.nextFollowUpOn}>
                <FieldLabel>{o === "NOT_REACHABLE" ? "Try again on (optional)" : "Follow-up date"}</FieldLabel>
                <DatePicker value={values.nextFollowUpOn} onChange={(v) => set("nextFollowUpOn", v)} min={today} clearable={o === "NOT_REACHABLE"} placeholder="Pick a date" />
                {errors.nextFollowUpOn && <FieldError>{errors.nextFollowUpOn}</FieldError>}
              </Field>
            </FieldSet>
          )}

          <FieldSet>
            <FieldLegend>Remarks</FieldLegend>
            <Field data-invalid={!!errors.remarks}>
              <FieldLabel htmlFor="remarks">{o === "REFUSED_DISPUTE" || o === "WRONG_NUMBER" ? "Remarks (required)" : "Remarks (optional)"}</FieldLabel>
              <Textarea id="remarks" rows={3} value={values.remarks} onChange={(e) => set("remarks", e.target.value)} aria-invalid={!!errors.remarks} />
              {errors.remarks && <FieldError>{errors.remarks}</FieldError>}
            </Field>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
