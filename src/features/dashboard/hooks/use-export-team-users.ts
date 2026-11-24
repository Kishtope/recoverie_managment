import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { saveBlob } from "@/lib/download-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadTeamUsers } from "../api/team";

// Downloads the user-wise recovery table as Excel: fetches the file, then saves it. The toast lives here, not in the component.
export const useExportTeamUsers = () =>
  useMutation({
    mutationFn: downloadTeamUsers,
    mutationKey: ["export-team-users"],
    onSuccess: ({ blob, name }) => {
      saveBlob(blob, name);
      toast.add({ title: "Recovery downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't export recovery", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
