"use client";

import { useState } from "react";
import { BadgePercentIcon, HandshakeIcon, LayoutDashboardIcon, RotateCcwIcon, SaveIcon, WaypointsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
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
type Values = { tries: string; grace: string; target: string; escalation: string; reminder: string; settlementLimit: string };

// Form text for the current settings.
const toValues = (s: SettingValues): Values => ({
  tries: String(s["followUp.notReachableTries"]),
  grace: String(s["ptp.graceDays"]),
  escalation: String(s["recruiter.escalationDays"]),
  reminder: String(s["recruiter.reminderDays"]),
  settlementLimit: String(s["settlement.managerLimitPct"]),
  target: s["dashboard.monthlyTargetPct"] === null ? "" : String(s["dashboard.monthlyTargetPct"]),
});

// Empty text is "not filled"; anything else is the number (NaN is left to zod to reject).
const num = (text: string) => (text.trim() === "" ? undefined : Number(text));

// One numeric field with a unit suffix inside the box, plus its hint and error.
const NumberField = ({
  id, label, hint, unit, value, error, onChange,
}: { id: string; label: string; hint?: string; unit: string; value: string; error?: string; onChange: (v: string) => void }) => (
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <InputGroup className="max-w-52">
      <InputGroupInput id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
    {hint && <FieldDescription>{hint}</FieldDescription>}
    {error && <FieldError>{error}</FieldError>}
  </Field>
);

// A settings section: icon, title and explanation on the left, the fields on the right (stacked on small screens).
const Section = ({
  icon: Icon, title, description, aside, children,
}: { icon: React.ElementType; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <Card>
    <CardContent className="grid gap-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {aside}
      </div>
      <FieldGroup>{children}</FieldGroup>
    </CardContent>
  </Card>
);

// The editable form; mounted once the settings have loaded so its fields start from the saved values.
const SettingsForm = ({ initial }: { initial: SettingValues }) => {
  const { mutate, isPending } = useUpdateSettings();
  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Unsaved changes: the form text differs from what is saved.
  const saved = toValues(initial);
  const dirty = (Object.keys(saved) as (keyof Values)[]).some((k) => values[k] !== saved[k]);
  const set = (field: keyof Values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = updateSettingsSchema.safeParse({
      "followUp.notReachableTries": num(values.tries),
      "ptp.graceDays": num(values.grace),
      "recruiter.escalationDays": num(values.escalation),
      "recruiter.reminderDays": num(values.reminder),
      "settlement.managerLimitPct": num(values.settlementLimit),
      "dashboard.monthlyTargetPct": num(values.target) ?? null,
    });
    if (!parsed.success) {
      // Maps each zod issue to the form field it belongs to.
      const fieldOf = (path: PropertyKey[]) =>
        path[0] === "followUp.notReachableTries" ? "tries"
          : path[0] === "ptp.graceDays" ? "grace"
            : path[0] === "recruiter.escalationDays" ? "escalation"
              : path[0] === "recruiter.reminderDays" ? "reminder"
                : path[0] === "settlement.managerLimitPct" ? "settlementLimit"
                : "target";
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [fieldOf(i.path), i.message])));
      return;
    }
    setErrors({});
    mutate(parsed.data);
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <Section icon={WaypointsIcon} title="Follow-up rules" description="When a case needs another touch, and when a promise to pay counts as broken.">
        <NumberField id="tries" label="Not-reachable tries" unit="in a row" value={values.tries} error={errors.tries} onChange={set("tries")} hint="This many not-reachable outcomes in a row flag the case for a field visit." />
        <Separator />
        <NumberField id="grace" label="PTP grace days" unit="days" value={values.grace} error={errors.grace} onChange={set("grace")} hint="A promise to pay counts as broken only after the promised day plus these days." />
      </Section>

      <Section icon={HandshakeIcon} title="Recruiters" description="How long a recruiter keeps a case before it moves to a caller on their team.">
        <NumberField id="escalation" label="Escalate after" unit="days" value={values.escalation} error={errors.escalation} onChange={set("escalation")} hint="Usually 10 or 15. A promise to pay dated after this keeps the timer running until that day." />
        <Separator />
        <NumberField id="reminder" label="Remind the recruiter" unit="days before" value={values.reminder} error={errors.reminder} onChange={set("reminder")} hint="The recruiter gets a notification this many days before the case escalates." />
      </Section>

      <Section icon={BadgePercentIcon} title="Settlements" description="How much of an overdue amount a Manager may waive without an Admin.">
        <NumberField id="settlementLimit" label="Manager approval limit" unit="% waived" value={values.settlementLimit} error={errors.settlementLimit} onChange={set("settlementLimit")} hint="A Manager can approve a settlement that waives up to this share of the overdue amount. Anything above needs an Admin." />
      </Section>

      <Section icon={LayoutDashboardIcon} title="Dashboard" description="What the collection chart is measured against.">
        <NumberField id="target" label="Monthly collection target" unit="%" value={values.target} error={errors.target} onChange={set("target")} hint="Optional. Leave empty for no target line on the collection chart." />
      </Section>

      {/* Save bar: stays in view at the bottom of the page and shows whether anything is unsaved. */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-full border bg-card px-4 py-2 shadow-float">
        <p className="pl-2 text-sm text-muted-foreground">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || isPending}
            onClick={() => {
              setValues(saved);
              setErrors({});
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <Button type="submit" disabled={!dirty || isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
};

/**
 * @component SettingsView
 * @description Admin Settings page: not-reachable tries, PTP grace days and the monthly target. Values are validated with the
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
