import { useQuery } from "@tanstack/react-query";
import { getImport } from "../api";

// One upload with its rejected rows; only fetched once an upload is chosen.
export const useGetImport = (id: string | undefined) =>
  useQuery({
    queryFn: () => getImport(id!),
    queryKey: ["get-import", id],
    enabled: !!id,
  });
