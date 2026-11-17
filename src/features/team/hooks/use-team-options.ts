import { useQuery } from "@tanstack/react-query";
import { getTeamOptions } from "../api";

// Agencies and managers for the form; only fetched while the form is open (Admin only endpoint).
export const useTeamOptions = (enabled: boolean) =>
  useQuery({
    queryFn: getTeamOptions,
    queryKey: ["get-team-options"],
    enabled,
  });
