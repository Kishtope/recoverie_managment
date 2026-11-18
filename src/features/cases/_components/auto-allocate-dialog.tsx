"use client";

import { useState } from "react";
import { EyeIcon, WandSparklesIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { ALLOCATION_RULES, ALLOCATION_RULE_LABELS, type AllocationRule } from "@/lib/allocation-plan";
import { formatInr } from "@/lib/format";
import { useAutoAllocate } from "../hooks/use-auto-allocate";
import { autoAllocateSchema } from "../schemas";

/**
 * @component AutoAllocateDialog
 * @description Admin / Manager tool that splits the unassigned cases between chosen people by a rule (equal count, overdue bucket, branch,
 * amount). "Preview" shows how many cases and how much overdue each person would get without saving; "Allocate" does it for real.
 * Changing the rule or the people clears the preview, so what you confirm is always what you saw.
 */
export const AutoAllocateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const { mutate, isPending, data: result, reset } = useAutoAllocate();
  const [rule, setRule] = useState<AllocationRule>("EQUAL");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPicked(new Set());
      setError("");
      reset();
    }
    onOpenChange(next);
  };

  // Any change to the inputs makes the shown preview stale.
  const changeRule = (value: string) => {
    setRule(value as AllocationRule);
    reset();
  };
  const toggle = (id: string, on: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    reset();
  };

  // Validates with the API's schema, then previews or really allocates.
  const run = (dryRun: boolean) => {
    const parsed = autoAllocateSchema.safeParse({ rule, agentIds: [...picked], dryRun });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form");
    setError("");
    mutate(parsed.data, { onSuccess: (r) => !r.dryRun && handleOpenChange(false) });
  };

  const preview = result?.dryRun ? result : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Auto-allocate cases"
      description="Splits the cases nobody holds yet between the people you choose. Cases that already have an owner are never moved."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="outline" disabled={isPending || loadingAgents} onClick={() => run(true)}>
            {isPending && !preview ? <Spinner data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
            Preview
          </Button>
          <Button type="button" disabled={isPending || !preview || preview.assigned === 0} onClick={() => run(false)}>
            {isPending && preview ? <Spinner data-icon="inline-start" /> : <WandSparklesIcon data-icon="inline-start" />}
            {isPending && preview ? "Allocating…" : `Allocate${preview ? ` ${preview.assigned}` : ""}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 pb-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="allocation-rule">Rule</FieldLabel>
            <FormSelect id="allocation-rule" value={rule} onChange={changeRule} options={ALLOCATION_RULES.map((r) => ({ value: r, label: ALLOCATION_RULE_LABELS[r].label }))} />
            <FieldDescription>{ALLOCATION_RULE_LABELS[rule].hint}</FieldDescription>
          </Field>

          <FieldSet data-invalid={!!error}>
            <FieldLegend>People</FieldLegend>
            {loadingAgents ? (
              <Spinner />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(agents ?? []).map((a) => (
                  <label key={a.id} htmlFor={`alloc-${a.id}`} className="flex items-center gap-2 text-sm">
                    <Checkbox id={`alloc-${a.id}`} checked={picked.has(a.id)} onCheckedChange={(on) => toggle(a.id, !!on)} />
                    {a.name}
                  </label>
                ))}
              </div>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldSet>
        </FieldGroup>

        {preview && (
          <div className="flex flex-col gap-3">
            <Alert>
              <AlertTitle>{preview.assigned} of {preview.totalUnassigned} unassigned cases would be allocated</AlertTitle>
              <AlertDescription>
                {preview.unassigned > 0 ? `${preview.unassigned} would stay unassigned (nobody chosen can take them under this rule).` : "Nothing would be left over."}
                {preview.capped && " More cases are waiting than one run handles; run it again afterwards."}
              </AlertDescription>
            </Alert>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead className="text-right">New cases</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.people.map((p) => (
                  <TableRow key={p.agentId}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{p.cases}</TableCell>
                    <TableCell className="text-right">{formatInr(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </FormDialog>
  );
};
