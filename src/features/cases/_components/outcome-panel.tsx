"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DISPUTE_CATEGORIES, OUTCOME_CHOICES } from "@/lib/constants";
import { todayIst } from "@/lib/dates";
import { suggestFollowUp } from "@/lib/dispositions";
import { formatInr } from "@/lib/format";
import { useAddDisposition } from "../hooks/use-add-disposition";
import { buildDispositionSchema } from "../schemas";
import type { Answers } from "./customer-query-card";

// Raw form text; converted to numbers / undefined only when validating on submit.
type Values = {
  choice: string;
  ptpDate: string;
  ptpAmount: string;
  paidAmount: string;
  paymentDate: string;
  transactionRef: string;
  callbackTime: string;
  nextFollowUpOn: string;
  reason: string;
  category: string;
  remarks: string;
};
const EMPTY: Values = { choice: "", ptpDate: "", ptpAmount: "", paidAmount: "", paymentDate: "", transactionRef: "", callbackTime: "", nextFollowUpOn: "", reason: "", category: "", remarks: "" };

// Empty text means "not filled"; otherwise the number (NaN is left to zod to reject).
const toNumber = (text: string) => (text.trim() === "" ? undefined : Number(text));

// A rupee amount field with the ₹ prefix.
const AmountInput = ({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean }) => (
  <InputGroup>
    <InputGroupAddon>
      <InputGroupText>₹</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />
  </InputGroup>
);

/**
 * @component OutcomePanel
 * @description The outcome form, shown in the right-hand panel of the case page (it replaced the "Add outcome" dialog). The agent picks what
 * happened and only the fields that outcome needs appear. A follow-up date is suggested for outcomes that need one and can be changed (a
 * promise always follows up on the promised day). Saving records one interaction: the outcome plus the customer answers typed in the query card.
 * The same zod schema the API uses validates it; the hook shows the toast.
 * @param loanId The case the interaction belongs to.
 * @param overdueAmount Overdue amount, used to show what remains after a part payment.
 * @param notReachableCount Consecutive not-reachable outcomes so far, to show which attempt this would be.
 * @param answers Customer answers typed so far; the filled ones are saved with the outcome.
 * @param onSaved Called after a successful save (the page clears the answers and resets this form).
 * @param initialChoice Choice selected when the panel first mounts (a missed call opens it as "No answer"). The page remounts the panel (new key) to reseed it.
 */
export const OutcomePanel = ({
  loanId,
  overdueAmount,
  notReachableCount,
  answers,
  onSaved,
  initialChoice,
}: {
  loanId: string;
  overdueAmount: number | null;
  notReachableCount: number;
  answers: Answers;
  onSaved: () => void;
  initialChoice?: string;
}) => {
  const { mutate, isPending } = useAddDisposition();
  const today = todayIst();
  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, choice: initialChoice ?? "", nextFollowUpOn: initialChoice ? suggestFollowUp(initialChoice, today) : "" }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Once the agent picks a follow-up date themselves, changing the outcome no longer overwrites it with a suggestion.
  const [followUpTouched, setFollowUpTouched] = useState(false);

  const set = (field: keyof Values, value: string) => setValues((v) => ({ ...v, [field]: value }));

  // Changing the outcome keeps what was typed, and suggests a follow-up date unless the agent has chosen their own.
  const onChoiceChange = (choice: string) =>
    setValues((v) => ({ ...v, choice, nextFollowUpOn: followUpTouched ? v.nextFollowUpOn : suggestFollowUp(choice, today) }));

  const picked = OUTCOME_CHOICES.find((c) => c.value === values.choice);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!picked) {
      setErrors({ outcome: "Choose an outcome" });
      return;
    }
    // Only answers the agent actually filled in are saved; the server adds each question's text.
    const responses = Object.entries(answers)
      .filter(([, a]) => a.response.trim() !== "")
      .map(([questionId, a]) => ({ questionId, response: a.response, remarks: a.remarks || undefined }));
    const parsed = buildDispositionSchema().safeParse({
      outcome: picked.outcome,
      outcomeDetail: "detail" in picked ? picked.detail : undefined,
      ptpDate: values.ptpDate || undefined,
      ptpAmount: toNumber(values.ptpAmount),
      paidAmount: toNumber(values.paidAmount),
      paymentDate: values.paymentDate || undefined,
      transactionRef: values.transactionRef || undefined,
      callbackTime: values.callbackTime || undefined,
      nextFollowUpOn: values.nextFollowUpOn || undefined,
      reason: values.reason || undefined,
      category: values.category || undefined,
      remarks: values.remarks || undefined,
      responses,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate({ ...parsed.data, loanId }, { onSuccess: onSaved });
  };

  const c = values.choice;
  const paidNow = toNumber(values.paidAmount);
  // What would still be unpaid after this part payment (only shown once a valid amount is typed).
  const remaining = overdueAmount !== null && paidNow !== undefined && paidNow > 0 && !Number.isNaN(paidNow) ? Math.max(overdueAmount - paidNow, 0) : null;
  const answered = Object.values(answers).filter((a) => a.response.trim() !== "").length;
  // Needs a manager's attention rather than another call, so no follow-up date is asked for.
  const endsFollowUp = c === "REFUSED" || c === "DISPUTE";
  const showFollowUp = c === "PART_PAID" || c === "CALLBACK" || c === "NO_ANSWER" || c === "BUSY";
  const remarksRequired = c === "WRONG_NUMBER";

  return (
    <Card id="outcome-panel" className="scroll-mt-4">
      <form onSubmit={onSubmit} noValidate className="contents">
        <CardHeader>
          <CardTitle>Record outcome</CardTitle>
          <CardDescription>What happened on this call? It is saved to the history with the customer&apos;s answers and cannot be edited later.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.outcome}>
              <FieldLabel id="outcome-label">Result of the conversation</FieldLabel>
              <ToggleGroup
                aria-labelledby="outcome-label"
                variant="outline"
                className="flex-wrap"
                value={c ? [c] : []}
                onValueChange={(v) => v[0] && onChoiceChange(v[0])}
              >
                {OUTCOME_CHOICES.map((o) => (
                  <ToggleGroupItem key={o.value} value={o.value}>
                    {o.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {errors.outcome && <FieldError>{errors.outcome}</FieldError>}
            </Field>

            {c === "PTP" && (
              <>
                <Field data-invalid={!!errors.ptpDate}>
                  <FieldLabel>Promise date</FieldLabel>
                  <DatePicker value={values.ptpDate} onChange={(v) => set("ptpDate", v)} min={today} placeholder="Pick the promised date" />
                  <FieldDescription>The case comes back to your follow-ups on this day.</FieldDescription>
                  {errors.ptpDate && <FieldError>{errors.ptpDate}</FieldError>}
                </Field>
                <Field data-invalid={!!errors.ptpAmount}>
                  <FieldLabel htmlFor="ptpAmount">Promised amount</FieldLabel>
                  <AmountInput id="ptpAmount" value={values.ptpAmount} onChange={(v) => set("ptpAmount", v)} invalid={!!errors.ptpAmount} />
                  {errors.ptpAmount && <FieldError>{errors.ptpAmount}</FieldError>}
                </Field>
              </>
            )}

            {(c === "PAID" || c === "PART_PAID") && (
              <>
                <Field data-invalid={!!errors.paidAmount}>
                  <FieldLabel htmlFor="paidAmount">{c === "PAID" ? "Amount paid" : "Paid amount"}</FieldLabel>
                  <AmountInput id="paidAmount" value={values.paidAmount} onChange={(v) => set("paidAmount", v)} invalid={!!errors.paidAmount} />
                  <FieldDescription>As told by the customer; the payment record confirms it.</FieldDescription>
                  {errors.paidAmount && <FieldError>{errors.paidAmount}</FieldError>}
                </Field>
                {c === "PART_PAID" && (
                  <p className="rounded-[14px] bg-muted px-3 py-2 text-sm">
                    Remaining amount: <strong className="font-semibold">{remaining === null ? "-" : formatInr(remaining)}</strong>
                  </p>
                )}
                <Field data-invalid={!!errors.paymentDate}>
                  <FieldLabel>Payment date</FieldLabel>
                  <DatePicker value={values.paymentDate} onChange={(v) => set("paymentDate", v)} max={today} placeholder="Pick the payment date" />
                  {errors.paymentDate && <FieldError>{errors.paymentDate}</FieldError>}
                </Field>
              </>
            )}

            {c === "PAID" && (
              <Field data-invalid={!!errors.transactionRef}>
                <FieldLabel htmlFor="transactionRef">Transaction reference (optional)</FieldLabel>
                <Input id="transactionRef" value={values.transactionRef} onChange={(e) => set("transactionRef", e.target.value)} placeholder="UPI / bank reference" maxLength={100} aria-invalid={!!errors.transactionRef} />
                {errors.transactionRef && <FieldError>{errors.transactionRef}</FieldError>}
              </Field>
            )}

            {c === "CALLBACK" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field data-invalid={!!errors.nextFollowUpOn} className="min-w-0">
                    <FieldLabel>Callback date</FieldLabel>
                    <DatePicker
                      value={values.nextFollowUpOn}
                      onChange={(v) => {
                        setFollowUpTouched(true);
                        set("nextFollowUpOn", v);
                      }}
                      min={today}
                      placeholder="Pick a date"
                    />
                    {errors.nextFollowUpOn && <FieldError>{errors.nextFollowUpOn}</FieldError>}
                  </Field>
                  <Field data-invalid={!!errors.callbackTime} className="min-w-0">
                    <FieldLabel htmlFor="callbackTime">Callback time</FieldLabel>
                    <Input id="callbackTime" type="time" value={values.callbackTime} onChange={(e) => set("callbackTime", e.target.value)} aria-invalid={!!errors.callbackTime} />
                    {errors.callbackTime && <FieldError>{errors.callbackTime}</FieldError>}
                  </Field>
                </div>
                <Field data-invalid={!!errors.reason}>
                  <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
                  <Input id="reason" value={values.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why did the customer ask for a callback?" maxLength={500} aria-invalid={!!errors.reason} />
                  {errors.reason && <FieldError>{errors.reason}</FieldError>}
                </Field>
              </>
            )}

            {c === "REFUSED" && (
              <Field data-invalid={!!errors.reason}>
                <FieldLabel htmlFor="reason">Reason for refusing</FieldLabel>
                <Textarea id="reason" rows={2} value={values.reason} onChange={(e) => set("reason", e.target.value)} maxLength={500} aria-invalid={!!errors.reason} />
                {errors.reason && <FieldError>{errors.reason}</FieldError>}
              </Field>
            )}

            {c === "DISPUTE" && (
              <>
                <Field data-invalid={!!errors.category}>
                  <FieldLabel htmlFor="category">Dispute category</FieldLabel>
                  <FormSelect id="category" value={values.category} onChange={(v) => set("category", v)} invalid={!!errors.category} placeholder="Choose a category" options={DISPUTE_CATEGORIES.map((d) => ({ value: d, label: d }))} />
                  {errors.category && <FieldError>{errors.category}</FieldError>}
                </Field>
                <Field data-invalid={!!errors.reason}>
                  <FieldLabel htmlFor="reason">Dispute description</FieldLabel>
                  <Textarea id="reason" rows={3} value={values.reason} onChange={(e) => set("reason", e.target.value)} maxLength={500} aria-invalid={!!errors.reason} />
                  {errors.reason && <FieldError>{errors.reason}</FieldError>}
                </Field>
              </>
            )}

            {c === "NOT_INTERESTED" && (
              <Field data-invalid={!!errors.reason}>
                <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
                <Input id="reason" value={values.reason} onChange={(e) => set("reason", e.target.value)} maxLength={500} aria-invalid={!!errors.reason} />
                {errors.reason && <FieldError>{errors.reason}</FieldError>}
              </Field>
            )}

            {(c === "NO_ANSWER" || c === "BUSY") && (
              <p className="flex items-start gap-2 rounded-[14px] bg-muted px-3 py-2 text-sm">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  Call attempt {notReachableCount + 1} in a row without reaching the customer. After a few, the case is flagged for a field visit.
                </span>
              </p>
            )}

            {showFollowUp && c !== "CALLBACK" && (
              <Field data-invalid={!!errors.nextFollowUpOn}>
                <FieldLabel>{c === "PART_PAID" ? "Follow up for the remaining amount" : "Try again on"}</FieldLabel>
                <DatePicker
                  value={values.nextFollowUpOn}
                  onChange={(v) => {
                    setFollowUpTouched(true);
                    set("nextFollowUpOn", v);
                  }}
                  min={today}
                  clearable={c !== "PART_PAID"}
                  placeholder="Pick a date"
                />
                <FieldDescription>Suggested for you; change it if the customer said otherwise.</FieldDescription>
                {errors.nextFollowUpOn && <FieldError>{errors.nextFollowUpOn}</FieldError>}
              </Field>
            )}

            {c === "PTP" && values.ptpDate && <p className="text-sm text-muted-foreground">Follow-up is set for the promise date. The promise stays pending until a payment is recorded.</p>}
            {endsFollowUp && <p className="text-sm text-muted-foreground">Your manager is told about this case. No follow-up is scheduled and calls are paused until they review it.</p>}

            <Field data-invalid={!!errors.remarks}>
              <FieldLabel htmlFor="remarks">{remarksRequired ? "Remarks (required)" : "Remarks (optional)"}</FieldLabel>
              <Textarea id="remarks" rows={3} value={values.remarks} onChange={(e) => set("remarks", e.target.value)} maxLength={1000} aria-invalid={!!errors.remarks} />
              {errors.remarks && <FieldError>{errors.remarks}</FieldError>}
            </Field>

            {errors.responses && <FieldError>{errors.responses}</FieldError>}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          <Button type="submit" variant="accent" size="lg" disabled={isPending || !c}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save interaction"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{answered ? `${answered} customer ${answered === 1 ? "answer" : "answers"} will be saved with it.` : "No customer answers written yet."}</p>
        </CardFooter>
      </form>
    </Card>
  );
};
