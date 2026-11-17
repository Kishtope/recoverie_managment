"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SettingValues } from "@/lib/settings-defaults";
import { useGetSettings, useUpdateSettings } from "../hooks/use-settings";
import { updateSettingsSchema } from "../schemas";

// Raw form text; converted to numbers only when validating on submit.
type Values = { startHour: string; endHour: string; tries: string; grace: string; target: string };

// Form text for the current settings.
const toValues = (s: SettingValues): Values => ({
  startHour: String(s["calling.window"].startHour),
  endHour: String(s["calling.window"].endHour),
  tries: String(s["followUp.notReachableTries"]),
  grace: String(s["ptp.graceDays"]),
  target: s["dashboard.monthlyTargetPct"] === null ? "" : String(s["dashboard.monthlyTargetPct"]),
});

// Empty text is "not filled"; anything else is the number (NaN is left to zod to reject).
const num = (text: string) => (text.trim() === "" ? undefined : Number(text));

// One numeric field with its label, hint and error.
const NumberField = ({
  id, label, hint, value, error, onChange,
}: { id: string; label: string; hint?: string; value: string; error?: string; onChange: (v: string) => void }) => (
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className="max-w-40" />
    {hint && <FieldDescription>{hint}</FieldDescription>}
    {error && <FieldError>{error}</FieldError>}
  </Field>
);

// The editable form; mounted once the settings have loaded so its fields start from the saved values.
const SettingsForm = ({ initial }: { initial: SettingValues }) => {
  const { mutate, isPending } = useUpdateSettings();
  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (field: keyof Values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = updateSettingsSchema.safeParse({
      "calling.window": { startHour: num(values.startHour), endHour: num(values.endHour) },
      "followUp.notReachableTries": num(values.tries),
      "ptp.graceDays": num(values.grace),
      "dashboard.monthlyTargetPct": num(values.target) ?? null,
    });
    if (!parsed.success) {
      // Maps each zod issue to the form field it belongs to.
      const fieldOf = (path: PropertyKey[]) =>
        path[0] === "calling.window" ? (path[1] === "endHour" ? "endHour" : "startHour") : path[0] === "followUp.notReachableTries" ? "tries" : path[0] === "ptp.graceDays" ? "grace" : "target";
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [fieldOf(i.path), i.message])));
      return;
    }
    setErrors({});
    mutate(parsed.data);
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calling</CardTitle>
          <CardDescription>Agents can only start calls inside this window (Indian time). The server enforces it.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Calling window</FieldLegend>
              <div className="flex flex-wrap gap-4">
                <NumberField id="startHour" label="Opens at (hour, 0–23)" value={values.startHour} error={errors.startHour} onChange={set("startHour")} />
                <NumberField id="endHour" label="Closes at (hour, 1–24)" value={values.endHour} error={errors.endHour} onChange={set("endHour")} hint="Calls stop being allowed from this hour." />
              </div>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up rules</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <NumberField id="tries" label="Not-reachable tries" value={values.tries} error={errors.tries} onChange={set("tries")} hint="This many not-reachable outcomes in a row flag the case for a field visit." />
            <NumberField id="grace" label="PTP grace days" value={values.grace} error={errors.grace} onChange={set("grace")} hint="A promise to pay counts as broken only after the promised day plus these days." />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <NumberField id="target" label="Monthly collection target (%)" value={values.target} error={errors.target} onChange={set("target")} hint="Optional. Leave empty for no target line on the collection chart." />
        </CardContent>
      </Card>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner data-icon="inline-start" />}
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
};

/**
 * @component SettingsView
 * @description Admin Settings page: calling window, not-reachable tries, PTP grace days and the monthly target. Values are validated with the
 * same zod schema the API uses; the hook shows the toast.
 */
export const SettingsView = () => {
  const { data, isPending, isError, error } = useGetSettings();
  return (
    <EntityContainer header={<EntityHeader title="Settings" description="Rules the whole team works by. Only Admins can change them." />}>
      {isPending ? (
        <LoadingView message="Loading settings…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load settings.")} />
      ) : (
        <SettingsForm initial={data} />
      )}
    </EntityContainer>
  );
};
