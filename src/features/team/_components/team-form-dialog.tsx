"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { MultiSelect } from "@/components/multi-select";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordGeneratorInput } from "@/components/password-generator-input";
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

  // Replaces one company's ticked branches, leaving the other companies' grants untouched.
  const setCompanyBranches = (company: string, branches: readonly string[]) =>
    setAccess((prev) => {
      const next = new Set([...prev].filter((k) => !k.startsWith(`${company}|`)));
      branches.forEach((branch) => next.add(key({ company, branch })));
      return next;
    });

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get("name")),
      email: String(f.get("email")),
      // No mobile field in the form any more; an existing number is sent back unchanged so editing a user never wipes it.
      mobile: user?.mobile ?? "",
      password: String(f.get("password") ?? ""),
      role: String(f.get("role")),
      agencyId: String(f.get("agencyId") ?? ""),
      reportsToId: String(f.get("reportsToId") ?? ""),
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
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">{user ? "New password" : "Password"}</FieldLabel>
              <PasswordGeneratorInput id="password" name="password" autoGenerate={!user} aria-invalid={!!errors.password} />
              <FieldDescription>
                {user
                  ? "Leave blank to keep the current password, or press Reload to set a new one."
                  : "Generated for you. Press Reload for another, then copy it and share it with the user. It cannot be viewed after saving."}
              </FieldDescription>
              {errors.password && <FieldError>{errors.password}</FieldError>}
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Role and reporting</FieldLegend>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <FormSelect id="role" name="role" defaultValue={user?.role ?? "AGENT"} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="agencyId">Agency</FieldLabel>
              <FormSelect
                id="agencyId"
                name="agencyId"
                defaultValue={user?.agency?.id ?? ""}
                options={[{ value: "", label: "None" }, ...(options?.agencies ?? []).map((a) => ({ value: a.id, label: a.name }))]}
              />
            </Field>
            <Field data-invalid={!!errors.reportsToId}>
              <FieldLabel htmlFor="reportsToId">Reports to</FieldLabel>
              <FormSelect
                id="reportsToId"
                name="reportsToId"
                defaultValue={user?.reportsTo?.id ?? ""}
                invalid={!!errors.reportsToId}
                options={[
                  { value: "", label: "None (Admin only)" },
                  ...(options?.managers ?? []).filter((m) => m.id !== user?.id).map((m) => ({ value: m.id, label: `${m.name} · ${ROLE_LABELS[m.role]}` })),
                ]}
              />
              {errors.reportsToId && <FieldError>{errors.reportsToId}</FieldError>}
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Company and branch access</FieldLegend>
            <FieldDescription>Pick the branches this user can see for each company.</FieldDescription>
            <FieldGroup className="gap-4">
              {COMPANIES.map((company) => {
                const picked = BRANCHES.filter((branch) => access.has(key({ company, branch })));
                return (
                  <Field key={company}>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor={`access-${company}`}>{company}</FieldLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCompanyBranches(company, picked.length === BRANCHES.length ? [] : [...BRANCHES])}
                      >
                        {picked.length === BRANCHES.length ? "Clear" : "Select all"}
                      </Button>
                    </div>
                    <MultiSelect
                      id={`access-${company}`}
                      value={picked}
                      onChange={(branches) => setCompanyBranches(company, branches)}
                      options={BRANCHES.map((branch) => ({ value: branch, label: branch }))}
                      placeholder="No access"
                      allLabel="All branches"
                    />
                  </Field>
                );
              })}
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
