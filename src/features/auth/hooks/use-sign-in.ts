import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { signIn } from "../api";

// Signs the user in; error toast here, navigation is left to the component's per-call onSuccess.
export const useSignIn = () =>
  useMutation({
    mutationFn: signIn,
    mutationKey: ["sign-in"],
    onError: (error) => {
      toast.add({ title: "Couldn't sign in", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
