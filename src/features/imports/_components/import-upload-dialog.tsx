"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { ALLOCATION_RULES, ALLOCATION_RULE_LABELS, type AllocationRule } from "@/lib/allocation-plan";
import { useUploadImport } from "../hooks/use-upload-import";
import { ImportSummary } from "./import-summary";

// Columns a customers file must have; the rest are optional (a blank cell leaves the stored value as it is).
const REQUIRED_COLUMNS = "Agreement No, Customer Name, Company, Branch";

/**
 * @component ImportUploadDialog
 * @description Admin dialog for uploading the customer details file (.xlsx / .csv). Optionally splits the uploaded cases between chosen
 * callers right after the import (auto-allocate), then shows the summary of the run inside the dialog.
 * @param onOpenErrors Called with the run id when the Admin wants to see the rejected rows (the dialog closes first).
 */
export const ImportUploadDialog = ({
  open,
  onOpenChange,
  onOpenErrors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenErrors: (runId: string) => void;
}) => {
  const { mutate, isPending, data, reset } = useUploadImport();
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const [file, setFile] = useState<File | null>(null);
  // Auto-allocation choice: on/off, the rule and the callers to split the new cases between.
  const [allocate, setAllocate] = useState(false);
  const [rule, setRule] = useState<AllocationRule>("EQUAL");
  const [people, setPeople] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !!file && !isPending && (!allocate || people.length > 0);

  // Forgets the file, the choices and the last result so the next open starts clean.
  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) {
      setFile(null);
      setAllocate(false);
      setRule("EQUAL");
      setPeople([]);
      reset();
    }
    onOpenChange(next);
  };

  // Sends the file; clears the picker once the import is done so the same file is not uploaded twice by accident.
  const submit = () => {
    if (!file) return;
    mutate(
      { file, autoAllocate: allocate ? { rule, agentIds: people } : undefined },
      {
        onSuccess: () => {
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Upload customers"
      description="Import customer details from an Excel or CSV file. Existing customers are updated, new ones are added."
      footer={
        <>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            {data ? "Done" : "Cancel"}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={submit}>
            {isPending ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
            {isPending ? "Importing…" : allocate ? "Upload and allocate" : "Upload"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pb-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="import-file">Customer details file</FieldLabel>
            <Input
              id="import-file"
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              disabled={isPending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <FieldDescription>Required columns: {REQUIRED_COLUMNS}.</FieldDescription>
            <div>
              <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<a href="/templates/loans.csv" download />}>
                <DownloadIcon data-icon="inline-start" />
                Download template
              </Button>
            </div>
          </Field>

          <Field orientation="horizontal">
            <Checkbox id="auto-allocate" checked={allocate} disabled={isPending} onCheckedChange={(on) => setAllocate(!!on)} />
            <FieldLabel htmlFor="auto-allocate">Auto-allocate the uploaded cases</FieldLabel>
          </Field>
          {allocate && (
            <>
              <Field>
                <FieldLabel htmlFor="import-rule">Split by</FieldLabel>
                <FormSelect
                  id="import-rule"
                  value={rule}
                  onChange={(v) => setRule(v as AllocationRule)}
                  options={ALLOCATION_RULES.map((r) => ({ value: r, label: ALLOCATION_RULE_LABELS[r].label }))}
                />
                <FieldDescription>{ALLOCATION_RULE_LABELS[rule].hint}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="import-people">Callers</FieldLabel>
                <MultiSelect
                  id="import-people"
                  value={people}
                  onChange={setPeople}
                  disabled={loadingAgents || isPending}
                  options={(agents ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  placeholder="Choose callers"
                  allLabel="All callers"
                />
                <FieldDescription>Only cases from this file that nobody holds yet are allocated.</FieldDescription>
              </Field>
            </>
          )}
        </FieldGroup>

        {data && (
          <ImportSummary
            run={data.run}
            onOpenErrors={() => {
              handleOpenChange(false);
              onOpenErrors(data.run.id);
            }}
          />
        )}
      </div>
    </FormDialog>
  );
};
