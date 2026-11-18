import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { getSettings, updateSettings } from "../api";

// Every setting for the Settings page (Admin only).
export const useGetSettings = (enabled = true) =>
  useQuery({
    queryFn: getSettings,
    queryKey: ["get-settings"],
    enabled,
  });

// Saves settings, then refreshes them (and any case page whose Call button depends on the calling window, and the dashboards that show the monthly target).
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    mutationKey: ["update-settings"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-settings"] });
      queryClient.invalidateQueries({ queryKey: ["get-loan"] });
      // The monthly target feeds the dashboard charts, so refetch every dashboard query (keys match by prefix, whatever the filters).
      ["team-summary", "team-users", "team-charts", "agent-dashboard"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.add({ title: "Settings saved", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't save settings", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
