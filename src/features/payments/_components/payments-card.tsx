"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { PlusIcon, ReceiptTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { ReceiptDialog } from "./receipt-dialog";
import type { PaymentItem } from "../types";

/**
 * @component PaymentsCard
 * @description Payments received on a case, newest first, each with a receipt button; the "Record payment" button appears for people who may record one.
 * @param payments The case's payments (imported and recorded in the app).
 * @param canRecord Whether the signed-in user may record a payment on this case.
 */
export const PaymentsCard = ({ loanId, payments, canRecord, className }: { loanId: string; payments: PaymentItem[]; canRecord: boolean; className?: string }) => {
  const [recordOpen, setRecordOpen] = useState(false);
  // The payment whose receipt is open; set right after recording one so the receipt shows at once.
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>{payments.length ? `${formatInr(total)} received in ${payments.length} ${payments.length === 1 ? "payment" : "payments"}` : "Money received on this loan."}</CardDescription>
        {canRecord && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setRecordOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Record
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyTitle>No payments yet</EmptyTitle>
              <EmptyDescription>{canRecord ? "Record one when the customer pays." : "Payments appear here once they are recorded or imported."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{formatInr(p.amount)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {format(parse(p.paidOn, "yyyy-MM-dd", new Date()), "dd MMM yyyy")}
                    {p.mode ? ` · ${p.mode}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.source === "IMPORT" && <Badge variant="outline">Imported</Badge>}
                  <Button size="sm" variant="ghost" aria-label={`Receipt for ${formatInr(p.amount)}`} onClick={() => setReceiptId(p.id)}>
                    <ReceiptTextIcon data-icon="inline-start" />
                    Receipt
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {canRecord && <RecordPaymentDialog loanId={loanId} open={recordOpen} onOpenChange={setRecordOpen} onRecorded={(p) => setReceiptId(p.id)} />}
      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </Card>
  );
};
