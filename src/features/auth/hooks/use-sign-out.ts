import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { signOut } from "../api";

// Minimum time the sign-out loader stays up so the transition doesn't flash.
const MIN_SIGN_OUT_MS = 1000;

// Signs the user out, wipes cached data, and leaves redirecting to the component's per-call onSuccess.
export const useSignOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => Promise.all([signOut(), new Promise((resolve) => setTimeout(resolve, MIN_SIGN_OUT_MS))]),
    mutationKey: ["sign-out"],
    onSuccess: () => queryClient.clear(),
    onError: (error) => {
      toast.add({ title: "Couldn't sign out", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
