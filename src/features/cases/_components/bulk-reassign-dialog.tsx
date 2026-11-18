"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { useBulkReassign } from "../hooks/use-bulk-reassign";
import { bulkReassignSchema } from "../schemas";

/**
 * @component BulkReassignDialog
 * @description Moves the selected cases to one agent inside the caller's scope. Same idea as ReassignDialog but for many cases at once;
 * cases that cannot move are skipped and named in the result toast.
 * @param loanIds The selected case ids.
 * @param onDone Called after a successful move (the page clears its selection).
 */
export const BulkReassignDialog = ({
  loanIds,
  open,
  onOpenChange,
  onDone,
}: {
  loanIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) => {
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const { mutate, isPending } = useBulkReassign();
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAgentId("");
      setError("");
    }
    onOpenChange(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = bulkReassignSchema.safeParse({ loanIds, agentId });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Choose an agent");
    setError("");
    const agentName = agents?.find((a) => a.id === agentId)?.name ?? "the new agent";
    mutate({ loanIds, agentId, agentName }, { onSuccess: () => { handleOpenChange(false); onDone(); } });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Reassign ${loanIds.length} ${loanIds.length === 1 ? "case" : "cases"}`}
      description="The selected cases move to the agent you choose. History stays; each old allocation is kept as a record."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="bulk-reassign-form" disabled={isPending || loadingAgents}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </>
      }
    >
      <form id="bulk-reassign-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="bulk-reassign-agent">New agent</FieldLabel>
            <FormSelect
              id="bulk-reassign-agent"
              value={agentId}
              onChange={setAgentId}
              invalid={!!error}
              disabled={loadingAgents}
              placeholder={loadingAgents ? "Loading agents…" : "Choose an agent"}
              options={(agents ?? []).map((a) => ({ value: a.id, label: a.name }))}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
