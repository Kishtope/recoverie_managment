"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { IndianRupeeIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import type { ScorecardRow } from "@/lib/scorecard";
import { useSetTarget } from "../hooks/use-set-target";
import { setTargetSchema } from "../schemas";

// Empty text means "no goal"; anything else is the number (NaN is left to zod to reject).
const num = (text: string) => (text.trim() === "" ? null : Number(text));

/**
 * @component SetTargetDialog
 * @description Admin / Manager form for one caller's goals in a month: money to recover and / or cases to resolve. Leaving both empty removes the target.
 * @param row The caller's scorecard row (supplies the name and the current goals).
 * @param month The month the goals are for, "yyyy-MM".
 */
export const SetTargetDialog = ({ row, month, onClose }: { row: ScorecardRow | null; month: string; onClose: () => void }) => {
  const { mutate, isPending } = useSetTarget();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!row) return;
    const f = new FormData(e.currentTarget);
    const parsed = setTargetSchema.safeParse({
      userId: row.agentId,
      month,
      collectionAmount: num(String(f.get("collectionAmount") ?? "")),
      casesResolved: num(String(f.get("casesResolved") ?? "")),
    });
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    mutate(parsed.data, { onSuccess: onClose });
  };

  return (
    <FormDialog
      open={!!row}
      onOpenChange={(open) => !open && onClose()}
      title={row ? `Target for ${row.name}` : "Target"}
      description={`Goals for ${format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy")}. Leave both empty to remove the target.`}
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="target-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save target"}
          </Button>
        </>
      }
    >
      {/* Keyed by caller and month so the fields restart from the saved goals each time the dialog opens. */}
      <form key={`${row?.agentId}-${month}`} id="target-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!errors.collectionAmount}>
            <FieldLabel htmlFor="collectionAmount">Amount to recover</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <IndianRupeeIcon />
              </InputGroupAddon>
              <InputGroupInput id="collectionAmount" name="collectionAmount" inputMode="decimal" defaultValue={row?.targetAmount ?? ""} aria-invalid={!!errors.collectionAmount} />
            </InputGroup>
            <FieldDescription>Compared with the money collected on their cases this month.</FieldDescription>
            {errors.collectionAmount && <FieldError>{errors.collectionAmount}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.casesResolved}>
            <FieldLabel htmlFor="casesResolved">Cases to resolve</FieldLabel>
            <Input id="casesResolved" name="casesResolved" inputMode="numeric" defaultValue={row?.targetResolved ?? ""} aria-invalid={!!errors.casesResolved} />
            <FieldDescription>Cases that end the month fully paid.</FieldDescription>
            {errors.casesResolved && <FieldError>{errors.casesResolved}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
