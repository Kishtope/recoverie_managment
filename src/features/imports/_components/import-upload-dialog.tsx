"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { MultiCombobox } from "@/components/multi-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { RetailerSplitSummary } from "@/features/retailers/_components/retailer-split-summary";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { ALLOCATION_RULES, ALLOCATION_RULE_LABELS, type AllocationRule } from "@/lib/allocation-plan";
import { cn } from "@/lib/utils";
import { usePreviewImport } from "../hooks/use-preview-import";
import { useUploadImport } from "../hooks/use-upload-import";
import { ImportSummary } from "./import-summary";

// Columns a customers file must have; the rest are optional (a blank cell leaves the stored value as it is).
// Retailer Code is also needed on every row whose Assignment Type is Retailer.
const REQUIRED_COLUMNS = "Agreement No, Customer Name, Company, Branch, Assignment Type";

// One number of the preview with its label; `danger` outlines it when there are errors.
const PreviewStat = ({ label, value, danger }: { label: string; value: number; danger?: boolean }) => (
  <div className={cn("flex flex-col gap-1 rounded-[14px] border p-3", danger ? "border-destructive" : "border-border")}>
    <span className="kicker text-muted-foreground">{label}</span>
    <span className="display-number text-3xl">{value.toLocaleString("en-IN")}</span>
  </div>
);

/**
 * @component ImportUploadDialog
 * @description Admin dialog for uploading the customer details file (.xlsx / .csv) with one button: it checks the file first and, when every row
 * is valid, uploads straight away. When some rows are invalid it stops and shows the preview (valid and invalid rows, caller / retailer split,
 * retailer-wise counts and the first errors); the same button then uploads the valid rows. Optionally splits the Caller cases between chosen
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
  const { mutate: check, isPending: checking, data: preview, reset: resetPreview } = usePreviewImport();
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const [file, setFile] = useState<File | null>(null);
  // Auto-allocation choice: on/off, the rule and the callers to split the new cases between.
  const [allocate, setAllocate] = useState(false);
  const [rule, setRule] = useState<AllocationRule>("EQUAL");
  const [people, setPeople] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // The button works once a file is chosen (and callers, when auto-allocate is on); after a check it needs at least one valid row to save.
  const busy = isPending || checking;
  const canSubmit = !!file && !busy && (!allocate || people.length > 0) && !(preview && preview.valid === 0);

  // Forgets the file, the choices and the last result so the next open starts clean.
  const handleOpenChange = (next: boolean) => {
    if (isPending || checking) return;
    if (!next) {
      setFile(null);
      setAllocate(false);
      setRule("EQUAL");
      setPeople([]);
      reset();
      resetPreview();
    }
    onOpenChange(next);
  };

  // Sends the file for real; clears the picker once the import is done so the same file is not uploaded twice by accident.
  const submit = () => {
    if (!file) return;
    mutate(
      { file, autoAllocate: allocate ? { rule, agentIds: people } : undefined },
      {
        onSuccess: () => {
          setFile(null);
          resetPreview();
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  };

  // The one button: first press checks the file. A clean file (no invalid rows) uploads right away; otherwise the preview stays on screen
  // for the Admin to review, and pressing again uploads the valid rows.
  const checkAndUpload = () => {
    if (!file) return;
    if (preview) return submit();
    check({ file }, { onSuccess: (result) => result.invalid === 0 && result.valid > 0 && submit() });
  };

  // The button just says Upload (Uploading… while the check or the import runs); the check step is invisible when the file is clean.
  const buttonLabel = busy ? "Uploading…" : "Upload";

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Upload customers"
      description="Import customer details from an Excel or CSV file. Each row says Caller or Retailer; Retailer rows go to the retailer named by their Retailer Code (at most 20 per retailer). The file is checked first; if every row is valid it uploads right away, otherwise you review the errors first."
      footer={
        <>
          <Button type="button" variant="outline" disabled={isPending || checking} onClick={() => handleOpenChange(false)}>
            {data ? "Done" : "Cancel"}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={checkAndUpload}>
            {busy ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
            {buttonLabel}
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
              disabled={isPending || checking}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                resetPreview(); // a different file needs its own check
              }}
            />
            <FieldDescription>Required columns: {REQUIRED_COLUMNS}. Retailer rows also need a Retailer Code.</FieldDescription>
            <div>
              <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<a href="/templates/loans.csv" download />}>
                <DownloadIcon data-icon="inline-start" />
                Download template
              </Button>
            </div>
          </Field>

          <Field orientation="horizontal">
            <Checkbox id="auto-allocate" checked={allocate} disabled={isPending} onCheckedChange={(on) => setAllocate(!!on)} />
            <FieldLabel htmlFor="auto-allocate">Auto-allocate the caller cases</FieldLabel>
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
                <MultiCombobox
                  id="import-people"
                  value={people}
                  onChange={setPeople}
                  disabled={loadingAgents || isPending}
                  options={(agents ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  placeholder={loadingAgents ? "Loading callers…" : "Search and choose callers"}
                  selectAllLabel="Select all callers"
                  emptyLabel="No caller matches"
                />
                <FieldDescription>Only Caller cases from this file that nobody holds yet are allocated. Retailer customers are never given to callers.</FieldDescription>
              </Field>
            </>
          )}
        </FieldGroup>

        {preview && !data && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <PreviewStat label="Rows" value={preview.totalRows} />
              <PreviewStat label="Valid" value={preview.valid} />
              <PreviewStat label="Invalid" value={preview.invalid} danger={preview.invalid > 0} />
            </div>
            <RetailerSplitSummary summary={preview.retailers} />
            {preview.errors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base">{preview.invalid > preview.errors.length ? `First ${preview.errors.length} of ${preview.invalid} errors` : "Errors"}</h3>
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[14px] border border-border p-3 text-sm">
                  {preview.errors.map((e) => (
                    <li key={e.row}>
                      <span className="font-medium tabular-nums">Row {e.row}</span>
                      {e.agreementNo ? ` (${e.agreementNo})` : ""}: {e.reason}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Rows with errors are skipped; the valid rows are saved when you upload.</p>
              </div>
            )}
            {preview.valid === 0 && <p className="text-sm text-destructive">No row can be saved. Fix the file and choose it again.</p>}
          </div>
        )}

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
