"use client";

import { ChevronDownIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useStartCall } from "../hooks/use-start-call";

/**
 * @component CallButton
 * @description The "Call" button for a case. With only one number it calls straight away; when the customer has an alternate number it
 * opens a small menu (Primary / Alternate, both masked). The browser sends only "primary" or "alt"; the server looks up the real number.
 * @param canCall False disables the button (the page shows the reason next to it).
 * @param primaryMask / altMask Masked numbers for display; an empty one is not offered.
 */
export const CallButton = ({
  loanId,
  primaryMask,
  altMask,
  canCall,
  className,
}: {
  loanId: string;
  primaryMask: string | null;
  altMask: string | null;
  canCall: boolean;
  className?: string;
}) => {
  const { mutate, isPending } = useStartCall();
  const disabled = !canCall || isPending;
  const icon = isPending ? <Spinner data-icon="inline-start" /> : <PhoneIcon data-icon="inline-start" />;
  const label = isPending ? "Calling…" : "Call";

  // One number: no menu needed.
  if (!primaryMask || !altMask) {
    return (
      <Button variant="accent" size="lg" className={className} disabled={disabled} onClick={() => mutate({ loanId, numberSlot: primaryMask ? "primary" : "alt" })}>
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="accent" size="lg" className={cn(className)} disabled={disabled} />}>
        {icon}
        {label}
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => mutate({ loanId, numberSlot: "primary" })}>Primary · {primaryMask}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => mutate({ loanId, numberSlot: "alt" })}>Alternate · {altMask}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
