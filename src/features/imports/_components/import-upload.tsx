"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useUploadImport } from "../hooks/use-upload-import";
import type { ImportKind } from "../types";
import { ImportSummary } from "./import-summary";

// Template file and hint per import type.
const KINDS: { value: ImportKind; label: string; template: string }[] = [
  { value: "LOANS", label: "Loans", template: "/templates/loans.csv" },
  { value: "ALLOCATIONS", label: "Allocations", template: "/templates/allocations.csv" },
  { value: "PAYMENTS", label: "Payments", template: "/templates/payments.csv" },
];

/**
 * @component ImportUpload
 * @description Admin upload panel: pick Loans or Allocations, choose an .xlsx/.csv file, import it and see the summary of the run.
 * @param onOpenErrors Called with the run id when the Admin wants to see the rejected rows.
 */
export const ImportUpload = ({ onOpenErrors, className }: { onOpenErrors: (runId: string) => void; className?: string }) => {
  const { mutate, isPending, data: run } = useUploadImport();
  const [type, setType] = useState<ImportKind>("LOANS");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const kind = KINDS.find((k) => k.value === type)!;

  // Sends the file; clears the picker once the import is done so the same file is not uploaded twice by accident.
  const submit = () => {
    if (!file) return;
    mutate(
      { type, file },
      {
        onSuccess: () => {
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            variant="outline"
            value={[type]}
            onValueChange={(v) => v[0] && setType(v[0] as ImportKind)}
            aria-label="Import type"
          >
            {KINDS.map((k) => (
              <ToggleGroupItem key={k.value} value={k.value}>{k.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="ghost" size="sm" nativeButton={false} render={<a href={kind.template} download />}>
            <DownloadIcon data-icon="inline-start" />
            Download template
          </Button>
          <p className="text-sm text-muted-foreground">Import Loans first, then Allocations and Payments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            aria-label="Import file"
            className="max-w-sm"
            disabled={isPending}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={submit} disabled={!file || isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
            {isPending ? "Importing…" : "Upload"}
          </Button>
        </div>

        {run && <ImportSummary run={run} onOpenErrors={() => onOpenErrors(run.id)} />}
      </CardContent>
    </Card>
  );
};
