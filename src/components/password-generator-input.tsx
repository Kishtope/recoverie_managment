"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { toast } from "@/components/ui/toast";
import { generatePassword } from "@/lib/generate-password";
import { cn } from "@/lib/utils";

/**
 * @component PasswordGeneratorInput
 * @description Password field that can generate a strong password, with Reload (regenerate), show/hide and copy buttons.
 * Keeps its own value so a plain `<form>` reads it by `name`; `onValueChange` mirrors it for callers that need it.
 * @param autoGenerate Fill the field with a generated password on first render (create forms).
 */
export const PasswordGeneratorInput = ({
  className,
  autoGenerate = false,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, "type" | "value" | "defaultValue" | "onChange"> & {
  autoGenerate?: boolean;
  onValueChange?: (value: string) => void;
}) => {
  // Current text; generated lazily once so the first render already shows it.
  const [value, setValue] = useState(() => (autoGenerate ? generatePassword() : ""));
  // Whether the password is shown as plain text (generated passwords start visible so the Admin can hand them over).
  const [visible, setVisible] = useState(autoGenerate);
  // Brief "copied" tick on the copy button.
  const [copied, setCopied] = useState(false);

  const update = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.add({ title: "Couldn't copy", description: "Select the password and copy it manually.", type: "error" });
    }
  };

  return (
    <InputGroup className={cn(className)}>
      <InputGroupInput
        {...props}
        value={value}
        onChange={(e) => update(e.target.value)}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="Generate new password" onClick={() => update(generatePassword())}>
          <RefreshCwIcon />
        </InputGroupButton>
        <InputGroupButton size="icon-xs" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
        <InputGroupButton size="icon-xs" aria-label="Copy password" disabled={!value} onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};
