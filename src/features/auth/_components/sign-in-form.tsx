"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { signInSchema } from "../schemas";
import { useSignIn } from "../hooks/use-sign-in";
import { PasswordInput } from "./password-input";

/**
 * @component SignInForm
 * @description Email + password sign-in card.
 */
export const SignInForm = () => {
  const router = useRouter();
  const { mutate, isPending } = useSignIn();
  // Per-field validation messages from the zod schema.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutate(parsed.data, { onSuccess: () => router.replace("/") });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} />
              </InputGroup>
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Your password" aria-invalid={!!errors.password} />
              {errors.password && <FieldError>{errors.password}</FieldError>}
            </Field>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" />}
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">Accounts are created by an admin.</p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
