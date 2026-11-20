import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateRetailer } from "../api";
import type { UpdateRetailerInput } from "../schemas";

// Edits a retailer or switches it Active / Inactive, then refreshes the lists, that retailer's page and the Overview.
// `retailerName` rides along in the variables only to name the retailer in the toast.
export const useUpdateRetailer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, ownerName, mobile, email, address, city, status }: UpdateRetailerInput & { id: string; retailerName: string }) =>
      updateRetailer({ id, name, ownerName, mobile, email, address, city, status }),
    mutationKey: ["update-retailer"],
    onSuccess: (_retailer, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-retailers"] });
      queryClient.invalidateQueries({ queryKey: ["get-retailer", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["get-retailer-dashboard"] });
      const title = vars.status === "INACTIVE" ? "Retailer deactivated" : vars.status === "ACTIVE" ? "Retailer activated" : "Retailer updated";
      toast.add({ title, description: vars.retailerName, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't update retailer", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
