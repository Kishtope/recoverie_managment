"use client";

import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterSelect } from "@/components/filter-select";

// One filter inside the sheet: its URL key, label, choices (the "no filter" choice is value "all") and the current value.
export type FilterField = { key: string; label: string; options: { value: string; label: string }[]; value: string };

/**
 * @component FilterSheet
 * @description Keeps a list page's secondary filters out of the toolbar: a "Filters" button (with a count of what is applied) opens a side
 * sheet holding one labelled dropdown per filter, and every applied filter shows next to the button as a chip that removes just that one.
 * A filter counts as applied when its value is not "all". Used by the Cases list and the team dashboard.
 * @param fields The filters to show, in order.
 * @param onChange Called with the filter key and its new value.
 * @param onClear Resets every filter.
 */
export const FilterSheet = ({
  fields,
  onChange,
  onClear,
  description = "Narrow the list to part of your data.",
}: {
  fields: FilterField[];
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  description?: string;
}) => {
  // What is applied, as chip text: the label of the chosen option.
  const applied = fields.filter((f) => f.value !== "all").map((f) => ({ key: f.key, text: f.options.find((o) => o.value === f.value)?.label ?? f.value }));

  return (
    <>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="medium" />}>
          <SlidersHorizontalIcon data-icon="inline-start" />
          Filters
          {applied.length > 0 && <Badge variant="secondary">{applied.length}</Badge>}
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 gap-4 overflow-y-auto px-4">
            {fields.map((f) => (
              <Field key={f.key}>
                <FieldLabel>{f.label}</FieldLabel>
                <FilterSelect value={f.value} onChange={(v) => onChange(f.key, v)} options={f.options} ariaLabel={`Filter by ${f.label.toLowerCase()}`} className="w-full" />
              </Field>
            ))}
          </FieldGroup>
          <SheetFooter>
            <Button variant="outline" disabled={applied.length === 0} onClick={onClear}>
              Clear all filters
            </Button>
            <SheetClose render={<Button />}>Show results</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {applied.map((a) => (
        <Badge key={a.key} variant="secondary" className="h-8 gap-1 pr-1">
          {a.text}
          <Button variant="ghost" size="icon-xs" aria-label={`Remove filter ${a.text}`} onClick={() => onChange(a.key, "all")}>
            <XIcon />
          </Button>
        </Badge>
      ))}
    </>
  );
};
