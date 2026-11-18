"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { CheckIcon, CopyIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetReceipt } from "../hooks/use-get-receipt";
import type { Receipt } from "../types";

// The receipt as plain text, for pasting into WhatsApp or SMS.
const receiptText = (r: Receipt, paidOn: string) =>
  [`Payment receipt ${r.receiptNo ?? ""}`.trim(), `Customer: ${r.customerName}`, `Agreement: ${r.agreementNo} (${r.company}, ${r.branch})`, `Amount: ${formatInr(r.amount)}`, `Date: ${paidOn}`, r.mode ? `Paid by: ${r.mode}` : null, r.collectedBy ? `Received by: ${r.collectedBy}` : null]
    .filter(Boolean)
    .join("\n");

// One labelled line of the receipt.
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

/**
 * @component ReceiptDialog
 * @description Shows one payment's digital receipt and lets the user copy it as text to send to the customer. Opens when `paymentId` is set.
 * @param paymentId The payment to show, or null to keep it closed.
 */
export const ReceiptDialog = ({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) => {
  const { data: receipt, isPending, isError, error } = useGetReceipt(paymentId);
  // Brief "copied" tick on the copy button.
  const [copied, setCopied] = useState(false);
  const paidOn = receipt ? format(parse(receipt.paidOn, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : "";

  const copy = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receiptText(receipt, paidOn));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the receipt is still on screen to read out.
    }
  };

  return (
    <FormDialog
      open={!!paymentId}
      onOpenChange={(open) => !open && onClose()}
      title="Payment receipt"
      description={receipt?.receiptNo ?? undefined}
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" disabled={!receipt} onClick={copy}>
            {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
            {copied ? "Copied" : "Copy as text"}
          </Button>
        </>
      }
    >
      <div className="pb-4">
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't load the receipt.")}</p>
        ) : (
          <>
            <p className="display-number pb-2 text-4xl">{formatInr(receipt.amount)}</p>
            <Row label="Customer" value={receipt.customerName} />
            <Row label="Agreement" value={`${receipt.agreementNo} · ${receipt.company} · ${receipt.branch}`} />
            <Row label="Received on" value={paidOn} />
            {receipt.mode && <Row label="Paid by" value={receipt.mode} />}
            {receipt.collectedBy && <Row label="Received by" value={receipt.collectedBy} />}
            {receipt.source === "IMPORT" && <p className="pt-3 text-xs text-muted-foreground">Imported from the payments file, so it has no app receipt number.</p>}
          </>
        )}
      </div>
    </FormDialog>
  );
};
