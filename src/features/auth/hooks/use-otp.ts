import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { requestOtp, verifyOtp } from "../api";

// Asks for a login code; the error toast (too many codes, SMS failed) is shown here, the next step is the component's per-call onSuccess.
export const useRequestOtp = () =>
  useMutation({
    mutationFn: requestOtp,
    mutationKey: ["request-otp"],
    onError: (error) => {
      toast.add({ title: "Couldn't send the code", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });

// Signs in with the code; error toast here, navigation is left to the component's per-call onSuccess.
export const useVerifyOtp = () =>
  useMutation({
    mutationFn: verifyOtp,
    mutationKey: ["verify-otp"],
    onError: (error) => {
      toast.add({ title: "Couldn't sign in", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
