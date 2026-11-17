"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { BRANCHES, COMPANIES, ROLES, ROLE_LABELS } from "@/lib/constants";
import { createUserSchema, updateUserSchema } from "../schemas";
import { useCreateUser, useUpdateUser } from "../hooks/use-user-mutations";
import { useTeamOptions } from "../hooks/use-team-options";
import type { TeamUser } from "../types";

type Access = { company: string; branch: string };
const key = (a: Access) => `${a.company}|${a.branch}`;

/**
 * @component TeamFormDialog
 * @description Admin-only create/edit form for a user: details, role, agency, reports-to and company/branch access.
 * @param user The user being edited; omit to create a new one.
 */
export const TeamFormDialog = ({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: TeamUser;
}) => {
  const { data: options } = useTeamOptions(open);
  const create = useCreateUser();
  const update = useUpdateUser();
  const isPending = create.isPending || update.isPending;

  // Access grants ticked in the form; the rest of the fields are read from the form on submit.
  const [access, setAccess] = useState<Set<string>>(new Set(user?.access.map(key)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggle = (a: Access, on: boolean) =>
    setAccess((prev) => {
      const next = new Set(prev);
      if (on) next.add(key(a));
      else next.delete(key(a));
      return next;
    });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get("name")),
      email: String(f.get("email")),
      mobile: String(f.get("mobile") ?? ""),
      password: String(f.get("password") ?? ""),
      role: String(f.get("role")),
      agencyId: String(f.get("agencyId") ?? ""),
      reportsToId: String(f.get("reportsToId") ?? ""),
      hubUserId: String(f.get("hubUserId") ?? ""),
      status: user?.status ?? "ACTIVE",
      access: [...access].map((k) => {
        const [company, branch] = k.split("|");
        return { company, branch };
      }),
    };
    const parsed = (user ? updateUserSchema : createUserSchema).safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    const done = { onSuccess: () => onOpenChange(false) };
    if (user) update.mutate({ ...parsed.data, status: input.status, id: user.id } as never, done);
    else create.mutate(parsed.data as never, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? "Edit user" : "New user"}
      description="Roles and access are checked on the server for every request."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="team-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="team-form" onSubmit={onSubmit} className="pb-4">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Details</FieldLegend>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" defaultValue={user?.name} aria-invalid={!!errors.name} />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} aria-invalid={!!errors.email} />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.mobile}>
              <FieldLabel htmlFor="mobile">Mobile</FieldLabel>
              <Input id="mobile" name="mobile" inputMode="numeric" defaultValue={user?.mobile ?? ""} aria-invalid={!!errors.mobile} />
              {errors.mobile && <FieldError>{errors.mobile}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">{user ? "New password" : "Password"}</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
              {user && <FieldDescription>Leave blank to keep the current password.</FieldDescription>}
              {errors.password && <FieldError>{errors.password}</FieldError>}
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Role and reporting</FieldLegend>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <NativeSelect id="role" name="role" defaultValue={user?.role ?? "AGENT"}>
                {ROLES.map((r) => (
                  <NativeSelectOption key={r} value={r}>{ROLE_LABELS[r]}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="agencyId">Agency</FieldLabel>
              <NativeSelect id="agencyId" name="agencyId" defaultValue={user?.agency?.id ?? ""}>
                <NativeSelectOption value="">None</NativeSelectOption>
                {options?.agencies.map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field data-invalid={!!errors.reportsToId}>
              <FieldLabel htmlFor="reportsToId">Reports to</FieldLabel>
              <NativeSelect id="reportsToId" name="reportsToId" defaultValue={user?.reportsTo?.id ?? ""} aria-invalid={!!errors.reportsToId}>
                <NativeSelectOption value="">None (Admin only)</NativeSelectOption>
                {options?.managers
                  .filter((m) => m.id !== user?.id)
                  .map((m) => (
                    <NativeSelectOption key={m.id} value={m.id}>{m.name} · {ROLE_LABELS[m.role]}</NativeSelectOption>
                  ))}
              </NativeSelect>
              {errors.reportsToId && <FieldError>{errors.reportsToId}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.hubUserId}>
              <FieldLabel htmlFor="hubUserId">Hub user ID</FieldLabel>
              <Input id="hubUserId" name="hubUserId" defaultValue={user?.hubUserId ?? ""} aria-invalid={!!errors.hubUserId} />
              <FieldDescription>The user&apos;s ID on hub.kishtope.com. Allocation files are matched to this app user by it.</FieldDescription>
              {errors.hubUserId && <FieldError>{errors.hubUserId}</FieldError>}
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Company and branch access</FieldLegend>
            <div className="grid gap-3">
              {COMPANIES.map((company) => (
                <div key={company} className="grid gap-2">
                  <span className="kicker">{company}</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {BRANCHES.map((branch) => {
                      const id = `${company}-${branch}`;
                      return (
                        <label key={id} htmlFor={id} className="flex items-center gap-2 text-sm">
                          <Checkbox id={id} checked={access.has(key({ company, branch }))} onCheckedChange={(on) => toggle({ company, branch }, !!on)} />
                          {branch}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
