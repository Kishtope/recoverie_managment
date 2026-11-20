"use client";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * @component MultiCombobox
 * @description Searchable multi-select: picked options show as removable chips, typing filters the list, and an optional first row picks (or clears)
 * every option at once. Use it instead of MultiSelect when the list is long enough that people need to search.
 * @param options Choices as { value, label }.
 * @param value Currently picked values; `onChange` receives the new list.
 * @param placeholder Hint inside the search box while nothing is picked.
 * @param selectAllLabel Text of the row that picks every option; it flips to "Clear all" once everything is picked.
 * @param emptyLabel Text shown when the search matches nothing.
 */
export const MultiCombobox = ({
  id,
  value,
  onChange,
  options,
  placeholder = "Search…",
  selectAllLabel,
  emptyLabel = "No match.",
  disabled,
  invalid,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
  selectAllLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) => {
  // The chips box is the popup's anchor, so the list opens exactly as wide as the field.
  const anchor = useComboboxAnchor();
  const picked = options.filter((o) => value.includes(o.value));
  const allPicked = options.length > 0 && picked.length === options.length;

  return (
    <Combobox
      multiple
      autoHighlight
      items={options}
      value={picked}
      onValueChange={(next: Option[]) => onChange(next.map((o) => o.value))}
      isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className={cn("max-h-28 min-h-11 overflow-y-auto rounded-[14px]", className)}>
        <ComboboxValue>
          {(chosen: Option[]) => (
            <>
              {chosen.map((o) => (
                <ComboboxChip key={o.value} className="rounded-full">
                  {o.label}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput id={id} aria-invalid={invalid} placeholder={chosen.length ? undefined : placeholder} />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        {selectAllLabel && options.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-border p-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(allPicked ? [] : options.map((o) => o.value))}>
              {allPicked ? "Clear all" : selectAllLabel}
            </Button>
            <span className="pr-2 text-xs text-muted-foreground tabular-nums">
              {picked.length} of {options.length}
            </span>
          </div>
        )}
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(o: Option) => (
            <ComboboxItem key={o.value} value={o}>
              {o.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
