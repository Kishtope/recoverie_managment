import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { getNotifications, markNotificationsRead } from "../api";

// The bell's notifications; polled every minute so a new one shows up without a reload.
export const useGetNotifications = () =>
  useQuery({
    queryFn: getNotifications,
    queryKey: ["get-notifications"],
    refetchInterval: 60_000,
  });

// Marks notifications read (some ids, or all), then refreshes the bell.
export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsRead,
    mutationKey: ["mark-notifications-read"],
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-notifications"] }),
    onError: (error) => {
      toast.add({ title: "Couldn't update notifications", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
