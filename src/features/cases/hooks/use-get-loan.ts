import { useQuery } from "@tanstack/react-query";
import { getLoan } from "../api";

// One case with its history; the key is shared with the outcome mutation so it refreshes after a save.
export const useGetLoan = (id: string) =>
  useQuery({
    queryFn: () => getLoan(id),
    queryKey: ["get-loan", id],
  });
