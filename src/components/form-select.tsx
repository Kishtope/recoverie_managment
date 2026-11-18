"use client";

import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Stand-in for an option whose value is "" (e.g. "None"), because an empty string can't be told apart from "nothing chosen".
const NONE = "__none__";

/**
 * @component FormSelect
 * @description A shadcn Select for form fields. Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`, with `name` so a
 * FormData read still sees the chosen value). An option with value "" is a real choice ("None"); with no such option, "" shows the placeholder.
 * @param options Choices as { value, label }; the trigger shows the label of the chosen one.
 * @param name Set it for forms read through FormData; a hidden input carries the value.
 */
export const FormSelect = ({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  invalid,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) => {
  // Own copy of the choice for uncontrolled use; ignored while `value` is passed.
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const items = options.map((o) => ({ value: o.value === "" ? NONE : o.value, label: o.label }));
  const hasNone = options.some((o) => o.value === "");
  const selected = current === "" ? (hasNone ? NONE : null) : current;

  return (
    <>
      <Select
        value={selected}
        onValueChange={(v) => {
          const next = !v || v === NONE ? "" : v;
          setInner(next);
          onChange?.(next);
        }}
        items={items}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={current} />}
    </>
  );
};
