"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useScopeAgents } from "@/features/team/hooks/use-scope-agents";
import { useReassignLoan } from "../hooks/use-reassign-loan";
import { reassignSchema } from "../schemas";

/**
 * @component ReassignDialog
 * @description Lets a Manager, Agency owner or Admin move a case to another agent inside their scope. Validated with the same zod schema the
 * API uses; the hook shows the toast and refreshes the case.
 * @param currentAgentId The agent who holds the case now (left out of the choices).
 */
export const ReassignDialog = ({
  loanId,
  currentAgentId,
  open,
  onOpenChange,
}: {
  loanId: string;
  currentAgentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { data: agents, isPending: loadingAgents } = useScopeAgents(open);
  const { mutate, isPending } = useReassignLoan();
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
    const parsed = reassignSchema.safeParse({ agentId });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Choose an agent");
    setError("");
    const agentName = agents?.find((a) => a.id === agentId)?.name ?? "the new agent";
    mutate({ loanId, agentId, agentName }, { onSuccess: () => handleOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Reassign case"
      description="The case moves to the agent you choose. Its history stays; the old allocation is kept as a record."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="reassign-form" disabled={isPending || loadingAgents}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </>
      }
    >
      <form id="reassign-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="reassign-agent">New agent</FieldLabel>
            <NativeSelect id="reassign-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-invalid={!!error} disabled={loadingAgents}>
              <NativeSelectOption value="">{loadingAgents ? "Loading agents…" : "Choose an agent"}</NativeSelectOption>
              {(agents ?? []).filter((a) => a.id !== currentAgentId).map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
