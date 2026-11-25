"use client";

import { useState } from "react";
import { WandSparklesIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { MultiCombobox } from "@/components/multi-combobox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { ALLOCATION_RULES, ALLOCATION_RULE_LABELS, type AllocationRule } from "@/lib/allocation-plan";
import { DPD_BUCKETS, DPD_BUCKET_LABELS } from "@/lib/dpd-bucket";
import { useAutoAllocate } from "../hooks/use-auto-allocate";
import { autoAllocateSchema } from "../schemas";

/**
 * @component AutoAllocateDialog
 * @description Admin / Manager tool that splits the unassigned cases between chosen people by a rule (equal count, overdue bucket, branch,
 * amount). "Allocate" does it straight away and the hook confirms how many cases were allocated.
 */
export const AutoAllocateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const { mutate, isPending } = useAutoAllocate();
  const [rule, setRule] = useState<AllocationRule>("EQUAL");
  const [bucket, setBucket] = useState<string>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPicked(new Set());
      setBucket("all");
      setError("");
    }
    onOpenChange(next);
  };

  const changeRule = (value: string) => setRule(value as AllocationRule);

  // Validates with the API's schema, then allocates for real; the hook shows how many cases were allocated.
  const run = () => {
    const parsed = autoAllocateSchema.safeParse({ rule, bucket, agentIds: [...picked] });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form");
    setError("");
    mutate(parsed.data, { onSuccess: () => handleOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Auto-allocate cases"
      description="Splits the cases nobody holds yet between the people you choose. Cases that already have an owner are never moved."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isPending || loadingAgents} onClick={run}>
            {isPending ? <Spinner data-icon="inline-start" /> : <WandSparklesIcon data-icon="inline-start" />}
            {isPending ? "Allocating…" : "Allocate"}
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

          <Field>
            <FieldLabel htmlFor="allocation-dpd">DPD bucket</FieldLabel>
            <FormSelect
              id="allocation-dpd"
              value={bucket}
              onChange={setBucket}
              options={[{ value: "all", label: "All DPD" }, ...DPD_BUCKETS.map((b) => ({ value: b, label: DPD_BUCKET_LABELS[b] }))]}
            />
            <FieldDescription>Only cases in this days-past-due range are allocated; the rest stay unassigned.</FieldDescription>
          </Field>

          <FieldSet data-invalid={!!error}>
            <FieldLegend>People</FieldLegend>
            <MultiCombobox
              id="allocation-people"
              value={[...picked]}
              onChange={(ids) => setPicked(new Set(ids))}
              options={(agents ?? []).map((a) => ({ value: a.id, label: a.name }))}
              placeholder={loadingAgents ? "Loading people…" : "Search and choose people"}
              selectAllLabel="Select everyone"
              emptyLabel="No one matches"
              disabled={loadingAgents || isPending}
              invalid={!!error}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldSet>
        </FieldGroup>
      </div>
    </FormDialog>
  );
};
