import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { createUser, updateUser } from "../api";

// Creates a user, then refreshes the list.
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    mutationKey: ["create-user"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-users"] });
      toast.add({ title: "User created", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't create user", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};

// Updates a user (edit form, enable/disable), then refreshes the list. `me` is refreshed too in case the user edited themselves.
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    mutationKey: ["update-user"],
    onSuccess: (_user, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-users"] });
      queryClient.invalidateQueries({ queryKey: ["get-me"] });
      toast.add({ title: vars.status === "DISABLED" ? "User disabled" : "User saved", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't save user", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
