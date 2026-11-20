import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { createQuestion, deleteQuestion, updateQuestion } from "../api";
import type { UpdateQuestionInput } from "../schemas";

// Both the Admin list and the agents' active list read from the questions, so every change refreshes both.
const useRefreshQuestions = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["get-questions"] });
    queryClient.invalidateQueries({ queryKey: ["get-active-questions"] });
  };
};

// Adds a question, then refreshes the lists.
export const useCreateQuestion = () => {
  const refresh = useRefreshQuestions();
  return useMutation({
    mutationFn: createQuestion,
    mutationKey: ["create-question"],
    onSuccess: () => {
      refresh();
      toast.add({ title: "Question added", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't add question", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};

// Edits a question or switches it active / inactive, then refreshes the lists. A call that sends only `active` gets the activate / deactivate toast.
export const useUpdateQuestion = () => {
  const refresh = useRefreshQuestions();
  return useMutation({
    mutationFn: (vars: UpdateQuestionInput & { id: string }) => updateQuestion(vars),
    mutationKey: ["update-question"],
    onSuccess: (_question, vars) => {
      refresh();
      const onlyActive = vars.active !== undefined && Object.keys(vars).filter((k) => k !== "id").length === 1;
      const title = onlyActive ? (vars.active ? "Question activated" : "Question deactivated") : "Question updated";
      toast.add({ title, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't update question", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};

// Deletes a question, then refreshes the lists. Saved interactions keep their own copy of the text.
export const useDeleteQuestion = () => {
  const refresh = useRefreshQuestions();
  return useMutation({
    mutationFn: deleteQuestion,
    mutationKey: ["delete-question"],
    onSuccess: () => {
      refresh();
      toast.add({ title: "Question deleted", description: "Past interactions keep the question as it was asked.", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't delete question", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
