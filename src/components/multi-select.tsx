"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Short text for the trigger: placeholder when empty, "All …" when everything is picked, else the first labels and a "+N" count.
const summarize = (labels: string[], total: number, placeholder: string, allLabel?: string) => {
  if (labels.length === 0) return placeholder;
  if (allLabel && labels.length === total) return allLabel;
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
};

/**
 * @component MultiSelect
 * @description A shadcn Select that lets several options be ticked; the trigger shows a one-line summary so the field never grows or overflows.
 * @param options Choices as { value, label }.
 * @param value Currently picked values; `onChange` receives the new list.
 * @param allLabel Text shown when every option is picked (e.g. "All branches").
 * @param checkboxes Shows a checkbox before each option in the list instead of a check mark on the right.
 */
export const MultiSelect = ({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  allLabel,
  checkboxes,
  disabled,
  invalid,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allLabel?: string;
  checkboxes?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) => (
  <Select multiple value={value} onValueChange={onChange} items={options} disabled={disabled}>
    <SelectTrigger id={id} aria-invalid={invalid} className={cn("w-full", className)}>
      <SelectValue placeholder={placeholder}>
        {(picked: string[]) =>
          summarize(
            options.filter((o) => picked.includes(o.value)).map((o) => o.label),
            options.length,
            placeholder,
            allLabel,
          )
        }
      </SelectValue>
    </SelectTrigger>
    <SelectContent alignItemWithTrigger={false}>
      <SelectGroup>
        {options.map((o) => (
          // With checkboxes the box is the tick, so the item's own check mark (its last child) is hidden.
          <SelectItem key={o.value} value={o.value} className={cn(checkboxes && "[&>span:last-child]:hidden")}>
            {checkboxes && <Checkbox checked={value.includes(o.value)} tabIndex={-1} aria-hidden className="pointer-events-none" />}
            {o.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);
