"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useBatchOptions } from "../hooks/use-get-batches";
import { useUpdateBatch } from "../hooks/use-batch-mutations";
import type { BatchListItem } from "../types";

/**
 * @component AssignBatchDialog
 * @description Starts an Open batch: pick the agency that works it, or keep it in-house. The batch moves to In progress and its collected
 * money is counted from now. The hook shows the toast and refreshes the lists.
 * @param batch The batch being assigned; the dialog is closed while it is null.
 */
export const AssignBatchDialog = ({ batch, onClose }: { batch: BatchListItem | null; onClose: () => void }) => {
  const { data: options, isPending: loadingOptions } = useBatchOptions(!!batch);
  const { mutate, isPending } = useUpdateBatch();
  const [agencyId, setAgencyId] = useState("");

  // Forgets the choice when the dialog closes so the next batch starts at In-house.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAgencyId("");
      onClose();
    }
  };

  return (
    <FormDialog
      open={!!batch}
      onOpenChange={handleOpenChange}
      title={`Assign ${batch?.name ?? "batch"}`}
      description="The batch moves to In progress. Choose who works it."
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            disabled={isPending || loadingOptions || !batch}
            onClick={() => batch && mutate({ id: batch.id, batchName: batch.name, action: "start", agencyId }, { onSuccess: () => handleOpenChange(false) })}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Assigning…" : "Assign and start"}
          </Button>
        </>
      }
    >
      <FieldGroup className="pb-4">
        <Field>
          <FieldLabel htmlFor="assign-agency">Assigned agency</FieldLabel>
          <FormSelect
            id="assign-agency"
            value={agencyId}
            onChange={setAgencyId}
            disabled={loadingOptions}
            options={[{ value: "", label: "In-house" }, ...(options?.agencies ?? []).map((a) => ({ value: a.id, label: a.name }))]}
          />
          <FieldDescription>In-house means your own team works this batch.</FieldDescription>
        </Field>
      </FieldGroup>
    </FormDialog>
  );
};
