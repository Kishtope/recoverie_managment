"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { useAssignCases } from "../hooks/use-assign-cases";
import { useGetRecruiterOptions } from "../hooks/use-get-recruiters";
import { assignCasesSchema, MAX_ASSIGN } from "../schemas";

const COMPANY_OPTIONS = [{ value: "", label: "Any company" }, ...COMPANIES.map((c) => ({ value: c, label: c }))];
const BRANCH_OPTIONS = [{ value: "", label: "Any branch" }, ...BRANCHES.map((b) => ({ value: b, label: b }))];

/**
 * @component AssignCasesDialog
 * @description Admin / Manager form that hands one recruiter a number of cases nobody holds yet, optionally narrowed by company, branch and days
 * past due (most overdue first). Each assigned case starts the recruiter's escalation timer. Validated with the same zod schema the API uses;
 * the hook shows the toast and refreshes the lists.
 */
export const AssignCasesDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: options, isPending: loadingOptions } = useGetRecruiterOptions();
  const { mutate, isPending } = useAssignCases();
  const [recruiterId, setRecruiterId] = useState("");
  const [count, setCount] = useState("");
  const [company, setCompany] = useState("");
  const [branch, setBranch] = useState("");
  const [minDpd, setMinDpd] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clears the form whenever the dialog closes so the next one starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRecruiterId("");
      setCount("");
      setCompany("");
      setBranch("");
      setMinDpd("");
      setErrors({});
    }
    onOpenChange(next);
  };

  // Empty text means "not filled"; anything else is the number (a typo becomes NaN and zod rejects it).
  const num = (text: string) => (text.trim() === "" ? undefined : Number(text));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = assignCasesSchema.safeParse({
      recruiterId,
      count: num(count),
      company: company || undefined,
      branch: branch || undefined,
      minDpd: num(minDpd),
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate(parsed.data, { onSuccess: () => handleOpenChange(false) });
  };

  const recruiterOptions = (options?.recruiters ?? []).map((r) => ({ value: r.id, label: r.name }));

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Assign cases to a recruiter"
      description="Gives the recruiter cases nobody holds yet. Their time limit starts today."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="assign-cases-form" variant="accent" disabled={isPending || loadingOptions}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Assigning…" : "Assign cases"}
          </Button>
        </>
      }
    >
      <form id="assign-cases-form" onSubmit={onSubmit} className="w-full min-w-0 pb-4">
        <FieldGroup>
          <Field data-invalid={!!errors.recruiterId}>
            <FieldLabel htmlFor="assign-recruiter">Recruiter</FieldLabel>
            <FormSelect id="assign-recruiter" value={recruiterId} onChange={setRecruiterId} options={recruiterOptions} placeholder={loadingOptions ? "Loading…" : "Choose a recruiter"} disabled={loadingOptions} invalid={!!errors.recruiterId} />
            {errors.recruiterId && <FieldError>{errors.recruiterId}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.count}>
            <FieldLabel htmlFor="assign-count">How many cases</FieldLabel>
            <InputGroup>
              <InputGroupInput id="assign-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 25" aria-invalid={!!errors.count} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>cases</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>Up to {MAX_ASSIGN} at a time. The most overdue cases go first.</FieldDescription>
            {errors.count && <FieldError>{errors.count}</FieldError>}
          </Field>

          <FieldSet>
            <FieldLegend>Which cases (optional)</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="min-w-0">
                <FieldLabel htmlFor="assign-company">Company</FieldLabel>
                <FormSelect id="assign-company" value={company} onChange={setCompany} options={COMPANY_OPTIONS} />
              </Field>
              <Field className="min-w-0">
                <FieldLabel htmlFor="assign-branch">Branch</FieldLabel>
                <FormSelect id="assign-branch" value={branch} onChange={setBranch} options={BRANCH_OPTIONS} />
              </Field>
            </div>
            <Field data-invalid={!!errors.minDpd}>
              <FieldLabel htmlFor="assign-dpd">Days past due (at least)</FieldLabel>
              <InputGroup>
                <InputGroupInput id="assign-dpd" inputMode="numeric" value={minDpd} onChange={(e) => setMinDpd(e.target.value)} placeholder="Leave empty for any" aria-invalid={!!errors.minDpd} />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>days</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {errors.minDpd && <FieldError>{errors.minDpd}</FieldError>}
            </Field>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
