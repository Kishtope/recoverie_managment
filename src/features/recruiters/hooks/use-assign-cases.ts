import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { assignCases } from "../api";

// Hands a recruiter cases, then refreshes the recruiter pages, the Cases list and the team numbers.
export const useAssignCases = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignCases,
    mutationKey: ["assign-cases"],
    onSuccess: (result) => {
      ["get-recruiter-cases", "get-recruiter-performance", "get-loans", "team-summary", "team-users"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.add({
        title: `${result.assigned} ${result.assigned === 1 ? "case" : "cases"} assigned`,
        description: `${result.recruiterName}'s timer starts today.`,
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't assign cases", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
