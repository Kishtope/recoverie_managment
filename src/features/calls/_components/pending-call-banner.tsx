"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks/use-me";
import { useGetPendingCall } from "../hooks/use-get-pending-call";

/**
 * @component PendingCallBanner
 * @description Strip under the app header telling an agent that an answered or missed call still has no outcome, with a link to that case.
 * Renders nothing for other roles, when nothing is pending, or on the pending case's own page (which already shows the call).
 */
export const PendingCallBanner = () => {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { data: call } = useGetPendingCall(me?.role === "AGENT");

  if (!call || pathname === `/cases/${call.loanId}`) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b border-border bg-brand-peach px-4 py-2 text-sm text-foreground">
      <PhoneOffIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        You have a call without an outcome: <strong className="font-semibold">{call.customerName}</strong>. Record it before your next call.
      </span>
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/cases/${call.loanId}`} />}>
        Open case
      </Button>
    </div>
  );
};
