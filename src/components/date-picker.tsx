"use client";

import { format, parse } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FORMAT = "yyyy-MM-dd";
const toDate = (value?: string) => (value ? parse(value, FORMAT, new Date()) : undefined);

/**
 * @component DatePicker
 * @description Calendar in a popover; takes and returns "yyyy-MM-dd" strings. Use instead of <input type="date">.
 * @param clearable Shows an X to reset to "" (for optional filters).
 * @param min Earliest selectable day ("yyyy-MM-dd").
 * @param max Latest selectable day ("yyyy-MM-dd").
 */
export const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) => {
  const minDate = toDate(min);
  const maxDate = toDate(max);
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" className={cn("justify-start font-normal", !value && "text-muted-foreground")} />}>
          <CalendarIcon data-icon="inline-start" />
          {value ? format(toDate(value)!, "dd MMM yyyy") : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate(value)}
            onSelect={(day) => day && onChange(format(day, FORMAT))}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button variant="ghost" size="icon" aria-label="Clear date" onClick={() => onChange("")}>
          <XIcon />
        </Button>
      )}
    </div>
  );
};
