"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetUnmatchedHubUsers } from "../hooks/use-get-imports";

/**
 * @component UnmatchedHubUsers
 * @description Hub users from recent allocation files that have no app account, with the rows each one blocked.
 * Hidden when there are none. The Admin sets the Hub user ID on the Team page, then uploads the allocations again.
 */
export const UnmatchedHubUsers = () => {
  const { data } = useGetUnmatchedHubUsers();
  if (!data?.length) return null;

  return (
    <Alert>
      <AlertTitle>{data.length} hub {data.length === 1 ? "user has" : "users have"} no app account</AlertTitle>
      <AlertDescription>
        <p>Their allocation rows were not imported. Create or edit the user on the Team page, set the Hub user ID, then upload the allocations again.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.map((u) => (
            <Badge key={u.hubUserId} variant="secondary">{u.hubUserId} · {u.rows} {u.rows === 1 ? "row" : "rows"}</Badge>
          ))}
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/team" />}>Open Team</Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
