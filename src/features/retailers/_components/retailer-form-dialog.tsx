"use client";

import { useState } from "react";
import { MailIcon, PhoneIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateRetailer } from "../hooks/use-retailer-mutations";
import { updateRetailerSchema } from "../schemas";
import type { RetailerItem } from "../types";

// Form text for the retailer being edited (empty while the dialog is closed); numbers and optional fields stay plain strings until submit.
const toValues = (r: RetailerItem | null) => ({
  name: r?.name ?? "",
  ownerName: r?.ownerName ?? "",
  mobile: r?.mobile ?? "",
  email: r?.email ?? "",
  city: r?.city ?? "",
  address: r?.address ?? "",
});

/**
 * @component RetailerFormDialog
 * @description Admin form that edits a retailer's details. Retailers are not created in the app and the retailer code never changes.
 * Validated with the same zod schema the API uses; the hook shows the toast and refreshes the lists.
 * @param retailer The retailer being edited; the dialog stays closed while it is null.
 */
export const RetailerFormDialog = ({ open, onOpenChange, retailer }: { open: boolean; onOpenChange: (open: boolean) => void; retailer: RetailerItem | null }) => {
  const update = useUpdateRetailer();
  const isPending = update.isPending;
  const [values, setValues] = useState(() => toValues(retailer));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sets one field's text.
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  // Fills the form from the retailer being edited (or blank for a new one) each time the dialog opens, so nothing stale carries over.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(toValues(retailer));
      setErrors({});
    }
  }
  const handleOpenChange = onOpenChange;

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!retailer) return;
    const { name, ownerName, mobile, email, city, address } = values;
    const editable = { name, ownerName, mobile, email, city, address };
    const parsed = updateRetailerSchema.safeParse(editable);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])));
      return;
    }
    setErrors({});
    const done = { onSuccess: () => handleOpenChange(false) };
    update.mutate({ id: retailer.id, retailerName: values.name, ...editable }, done);
  };

  return (
    <FormDialog
      open={open && !!retailer}
      onOpenChange={handleOpenChange}
      title="Edit retailer"
      description={retailer ? `Change the details of ${retailer.name} (${retailer.code}). The code stays the same.` : undefined}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="retailer-form" variant="accent" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="retailer-form" onSubmit={onSubmit} className="w-full min-w-0 pb-4">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Shop</FieldLegend>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="retailer-name">Retailer / shop name</FieldLabel>
              <Input id="retailer-name" value={values.name} onChange={set("name")} placeholder="Sharma Mobiles" aria-invalid={!!errors.name} />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.city}>
              <FieldLabel htmlFor="retailer-city">City</FieldLabel>
              <Input id="retailer-city" value={values.city} onChange={set("city")} placeholder="Indore" aria-invalid={!!errors.city} />
              {errors.city && <FieldError>{errors.city}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="retailer-address">Address</FieldLabel>
              <Textarea id="retailer-address" value={values.address} onChange={set("address")} rows={3} aria-invalid={!!errors.address} />
              {errors.address && <FieldError>{errors.address}</FieldError>}
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Owner and contact</FieldLegend>
            <Field data-invalid={!!errors.ownerName}>
              <FieldLabel htmlFor="retailer-owner">Owner name</FieldLabel>
              <Input id="retailer-owner" value={values.ownerName} onChange={set("ownerName")} placeholder="Ramesh Sharma" aria-invalid={!!errors.ownerName} />
              {errors.ownerName && <FieldError>{errors.ownerName}</FieldError>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.mobile} className="min-w-0">
                <FieldLabel htmlFor="retailer-mobile">Mobile number</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <PhoneIcon />
                  </InputGroupAddon>
                  <InputGroupInput id="retailer-mobile" inputMode="numeric" value={values.mobile} onChange={set("mobile")} placeholder="10 digits" aria-invalid={!!errors.mobile} />
                </InputGroup>
                {errors.mobile && <FieldError>{errors.mobile}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.email} className="min-w-0">
                <FieldLabel htmlFor="retailer-email">Email (optional)</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <MailIcon />
                  </InputGroupAddon>
                  <InputGroupInput id="retailer-email" type="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} />
                </InputGroup>
                {errors.email && <FieldError>{errors.email}</FieldError>}
              </Field>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
