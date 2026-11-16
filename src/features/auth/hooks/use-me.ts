import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api";

// The signed-in user; shared by anything that needs name/email.
export const useMe = () =>
  useQuery({
    queryFn: getMe,
    queryKey: ["get-me"],
  });
