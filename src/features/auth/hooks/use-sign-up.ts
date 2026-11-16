import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { signUp } from "../api";

// Creates an account; success toast and error toast here, navigation is left to the component.
export const useSignUp = () =>
  useMutation({
    mutationFn: signUp,
    mutationKey: ["sign-up"],
    onSuccess: () => {
      toast.add({ title: "Account created", description: "Please sign in to continue.", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't create account", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
