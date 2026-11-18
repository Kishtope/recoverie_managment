"use client";

import { useState } from "react";
import { CircleAlertIcon, FootprintsIcon, LayersIcon, PhoneCallIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { useCreateBatch } from "../hooks/use-batch-mutations";
import { useBatchPreview } from "../hooks/use-get-batches";
import { createBatchSchema } from "../schemas";
import { BATCH_TYPE_LABELS, type BatchTypeValue } from "../types";

const COMPANY_OPTIONS = [{ value: "", label: "Any company" }, ...COMPANIES.map((c) => ({ value: c, label: c }))];
const BRANCH_OPTIONS = [{ value: "", label: "Any branch" }, ...BRANCHES.map((b) => ({ value: b, label: b }))];

// The two kinds of batch as choice cards: icon, name and one line on how it is worked.
const TYPE_CARDS = [
  { value: "CALL", icon: PhoneCallIcon, text: "Agents work these cases by phone." },
  { value: "FR", icon: FootprintsIcon, text: "Field recovery: someone visits the customer." },
] as const satisfies readonly { value: BatchTypeValue; icon: typeof LayersIcon; text: string }[];

/**
 * @component BatchFormDialog
 * @description Admin / Manager form that creates a Draft batch: a name, Call or FR, and filters that pick the cases that go in. A live count
 * shows how many cases match before anything is created. Validated with the same zod schema the API uses; the hook shows the toast and
 * refreshes the lists.
 * @param defaultType The type tab the user is on, so the form starts there.
 */
export const BatchFormDialog = ({ open, onOpenChange, defaultType }: { open: boolean; onOpenChange: (open: boolean) => void; defaultType: BatchTypeValue }) => {
  const { mutate, isPending } = useCreateBatch();
  const [name, setName] = useState("");
  const [type, setType] = useState<BatchTypeValue>(defaultType);
  const [company, setCompany] = useState("");
  const [branch, setBranch] = useState("");
  const [minDpd, setMinDpd] = useState("");
  // null = follow the type (FR starts on, Call starts off) until the user flips the switch themselves.
  const [flagged, setFlagged] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const flaggedOnly = flagged ?? type === "FR";

  // The filters as the API takes them; the live count uses the same ones once they are valid (a half-typed DPD waits).
  const dpdNumber = minDpd.trim() === "" ? undefined : Number(minDpd);
  const filters = { type, company: (company || undefined) as (typeof COMPANIES)[number] | undefined, branch: (branch || undefined) as (typeof BRANCHES)[number] | undefined, minDpd: dpdNumber, flaggedOnly };
  const filtersValid = createBatchSchema.omit({ name: true }).safeParse(filters).success;
  const preview = useBatchPreview(filters, open && filtersValid);
  const count = preview.data?.count;
  const tooMany = preview.data !== undefined && preview.data.count > preview.data.max;
  const noCases = count === 0;

  // Clears the form whenever the dialog closes so the next one starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setType(defaultType);
      setCompany("");
      setBranch("");
      setMinDpd("");
      setFlagged(null);
      setErrors({});
    }
    onOpenChange(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = createBatchSchema.safeParse({ name, ...filters });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate(parsed.data, { onSuccess: () => handleOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="New batch"
      description="Creates a draft from the cases that match. Cases already in an unfinished batch of the same type are left out."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="batch-form" variant="accent" disabled={isPending || noCases || tooMany}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Creating…" : count ? `Create draft with ${count} cases` : "Create draft"}
          </Button>
        </>
      }
    >
      <form id="batch-form" onSubmit={onSubmit} className="w-full min-w-0 pb-4">
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="batch-name">Batch name</FieldLabel>
            <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nov DPD 60+ Balaghat" aria-invalid={!!errors.name} />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <FieldSet data-invalid={!!errors.type}>
            <FieldLegend variant="label">Type</FieldLegend>
            <RadioGroup value={type} onValueChange={(v) => setType(v as BatchTypeValue)} className="grid-cols-1 min-w-0 sm:grid-cols-2">
              {TYPE_CARDS.map((t) => (
                <FieldLabel key={t.value} htmlFor={`batch-type-${t.value}`}>
                  <Field orientation="horizontal" className="min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <t.icon className="size-4" />
                    </span>
                    <FieldContent className="min-w-0">
                      <FieldTitle>{BATCH_TYPE_LABELS[t.value]}</FieldTitle>
                      <FieldDescription>{t.text}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id={`batch-type-${t.value}`} value={t.value} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Which cases</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="min-w-0">
                <FieldLabel htmlFor="batch-company">Company</FieldLabel>
                <FormSelect id="batch-company" value={company} onChange={setCompany} options={COMPANY_OPTIONS} />
              </Field>
              <Field className="min-w-0">
                <FieldLabel htmlFor="batch-branch">Branch</FieldLabel>
                <FormSelect id="batch-branch" value={branch} onChange={setBranch} options={BRANCH_OPTIONS} />
              </Field>
            </div>

            <Field data-invalid={!!errors.minDpd}>
              <FieldLabel htmlFor="batch-dpd">Days past due (at least)</FieldLabel>
              <InputGroup>
                <InputGroupInput id="batch-dpd" inputMode="numeric" value={minDpd} onChange={(e) => setMinDpd(e.target.value)} placeholder="e.g. 60 (leave empty for any)" aria-invalid={!!errors.minDpd} />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>days</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {errors.minDpd && <FieldError>{errors.minDpd}</FieldError>}
            </Field>

            <FieldLabel htmlFor="batch-flagged">
              <Field orientation="horizontal" className="min-w-0">
                <FieldContent className="min-w-0">
                  <FieldTitle>Only cases flagged for a field visit</FieldTitle>
                  <FieldDescription>Cases where the customer could not be reached 3 times in a row.</FieldDescription>
                </FieldContent>
                <Switch id="batch-flagged" checked={flaggedOnly} onCheckedChange={setFlagged} />
              </Field>
            </FieldLabel>
          </FieldSet>

          {/* Live result: how many cases this batch would hold with the filters above. */}
          {!filtersValid ? null : count === undefined ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : noCases || tooMany ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{noCases ? "No cases match" : `More than ${preview.data?.max} cases match`}</AlertTitle>
              <AlertDescription>{noCases ? "Loosen a filter, or the cases may already be in an unfinished batch." : "Narrow the filters so the batch is smaller."}</AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <LayersIcon />
              <AlertTitle>{count} {count === 1 ? "case" : "cases"} will go into this draft</AlertTitle>
              <AlertDescription>You can open, assign and close it from the Batches list.</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
