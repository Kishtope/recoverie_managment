import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { addDisposition } from "../api";

// Describes what a saved outcome did to the case, so the agent sees the automatic follow-up rules working.
const describeEffects = (e: { nextFollowUpOn: string | null; fieldVisitFlag: boolean; escalated: boolean; callLinked: boolean; answers: number }) => {
  const parts: string[] = [];
  if (e.answers) parts.push(`${e.answers} customer ${e.answers === 1 ? "answer" : "answers"} saved`);
  if (e.nextFollowUpOn) parts.push(`Follow-up set for ${format(parse(e.nextFollowUpOn, "yyyy-MM-dd", new Date()), "dd MMM")}`);
  if (e.escalated) parts.push("Escalated to manager");
  if (e.fieldVisitFlag) parts.push("Marked for field visit");
  return parts.join(" · ") || undefined;
};

// Saves an interaction (outcome + the customer's answers), then refreshes the case, the lists and the dashboard that read from it.
export const useAddDisposition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addDisposition,
    mutationKey: ["add-disposition"],
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] });
      // The outcome may have cleared a call that was waiting for one (banner, call list, case page).
      queryClient.invalidateQueries({ queryKey: ["get-pending-call"] });
      queryClient.invalidateQueries({ queryKey: ["get-calls"] });
      toast.add({ title: "Interaction saved", description: describeEffects(result.effects), type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't save interaction", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
