"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useRequestOtp, useVerifyOtp } from "../hooks/use-otp";
import { otpRequestSchema, otpVerifySchema } from "../schemas";

/**
 * @component OtpSignInForm
 * @description Agent sign-in with a code texted to their mobile, in two steps: enter the mobile, then the 6-digit code. The resend button
 * counts down the server's cooldown. In development with the mock SMS provider the server also returns the code, shown as a test hint.
 * The same message is shown for every kind of wrong code, matching the server, so nothing about the mobile is revealed.
 */
export const OtpSignInForm = () => {
  const router = useRouter();
  const request = useRequestOtp();
  const verify = useVerifyOtp();
  // Which step is showing, and the mobile typed in the first one.
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Seconds until another code may be requested, and the dev-only test code.
  const [wait, setWait] = useState(0);
  const [devCode, setDevCode] = useState<string>();

  // Ticks the resend countdown down once a second while it is running.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  // Asks for a code (first time or resend) and moves to the code step.
  const askForCode = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const parsed = otpRequestSchema.safeParse({ mobile });
    if (!parsed.success) return setErrors({ mobile: parsed.error.issues[0].message });
    setErrors({});
    request.mutate(parsed.data, {
      onSuccess: (res) => {
        setStep("code");
        setWait(res.resendAfterSec);
        setDevCode(res.devCode);
      },
    });
  };

  const onVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = otpVerifySchema.safeParse({ mobile, code: new FormData(e.currentTarget).get("code") });
    if (!parsed.success) return setErrors({ code: parsed.error.issues[0].message });
    setErrors({});
    verify.mutate(parsed.data, { onSuccess: () => router.replace("/") });
  };

  if (step === "mobile") {
    return (
      <form onSubmit={askForCode} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.mobile}>
            <FieldLabel htmlFor="otp-mobile">Mobile number</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <SmartphoneIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="otp-mobile"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                aria-invalid={!!errors.mobile}
              />
            </InputGroup>
            <FieldDescription>We text a code to the number your admin saved for you.</FieldDescription>
            {errors.mobile && <FieldError>{errors.mobile}</FieldError>}
          </Field>
          <Button type="submit" disabled={request.isPending}>
            {request.isPending && <Spinner data-icon="inline-start" />}
            {request.isPending ? "Sending…" : "Send code"}
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="otp-code">6-digit code</FieldLabel>
          <InputGroup>
            <InputGroupInput id="otp-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" autoFocus aria-invalid={!!errors.code} />
          </InputGroup>
          <FieldDescription>Sent to {mobile}. It works for 5 minutes.</FieldDescription>
          {devCode && <FieldDescription>Test code (development only): {devCode}</FieldDescription>}
          {errors.code && <FieldError>{errors.code}</FieldError>}
        </Field>
        <Button type="submit" disabled={verify.isPending}>
          {verify.isPending && <Spinner data-icon="inline-start" />}
          {verify.isPending ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep("mobile")}>
            Change number
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={wait > 0 || request.isPending} onClick={() => askForCode()}>
            {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};
