import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * @component FilterSelect
 * @description A labelled dropdown for one list-page toolbar filter; `items` lets the trigger show the label instead of the raw value.
 * @param options Choices, the default ("all") first.
 * @param ariaLabel Accessible name, since the trigger has no visible label.
 */
export const FilterSelect = ({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) => (
  <Select value={value} onValueChange={(v) => v && onChange(v)} items={options}>
    <SelectTrigger aria-label={ariaLabel} className={cn("w-40", className)}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);
