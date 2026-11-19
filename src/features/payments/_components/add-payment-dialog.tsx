"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useGetLoans } from "@/features/cases/hooks/use-get-loans";
import { formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { ReceiptDialog } from "./receipt-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";

// Fewest typed characters before the case search runs.
const MIN_SEARCH = 2;

/**
 * @component AddPaymentDialog
 * @description Records a payment from a list page where no case is open yet: step 1 finds the case by agreement number or customer name, step 2 is
 * the usual Record a payment form, then the receipt opens. Reuses RecordPaymentDialog and ReceiptDialog so the rules are the same as on the case page.
 */
export const AddPaymentDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [text, setText] = useState("");
  // The search text after a short pause, so a request is not sent on every keystroke.
  const [search, setSearch] = useState("");
  const [loanId, setLoanId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const searching = open && !loanId && search.length >= MIN_SEARCH;
  const { data, isFetching, isError, error } = useGetLoans({ q: search, agentId: "", company: "", branch: "", followUp: "", outcome: "", flag: "", page: 1, pageSize: 6 }, searching);

  // Resets the search whenever the whole flow closes.
  const close = () => {
    setText("");
    setSearch("");
    setLoanId(null);
    onOpenChange(false);
  };

  return (
    <>
      <FormDialog
        open={open && !loanId}
        onOpenChange={(next) => !next && close()}
        title="Add a payment"
        description="Find the case the customer paid for."
        footer={<Button type="button" variant="outline" onClick={close}>Cancel</Button>}
      >
        <div className="flex min-h-48 flex-col gap-3 pb-4">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Agreement number or customer name" aria-label="Find a case" autoFocus />
            {isFetching && searching && (
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            )}
          </InputGroup>

          {search.length < MIN_SEARCH ? (
            <p className="text-sm text-muted-foreground">Type at least {MIN_SEARCH} characters.</p>
          ) : isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't search cases.")}</p>
          ) : data && data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No case matches “{search}”.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(data?.items ?? []).map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    onClick={() => setLoanId(l.id)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.agreementNo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{l.customerName}{l.agent ? ` · ${l.agent.name}` : ""}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatInr(l.overdueAmount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FormDialog>

      <RecordPaymentDialog
        loanId={loanId ?? ""}
        open={!!loanId}
        onOpenChange={(next) => !next && close()}
        onRecorded={(payment) => setReceiptId(payment.id)}
      />
      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </>
  );
};
