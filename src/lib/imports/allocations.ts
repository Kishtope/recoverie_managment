import type { Role, UserStatus } from "@/generated/prisma/client";
import type { AllocationRow } from "@/features/imports/schemas";
import type { ImportRowError } from "@/features/imports/types";
import { prisma } from "@/lib/prisma";
import { applyInChunks, chunk, sequential, type ApplyResult } from "./shared";

export type ValidAllocationRow = { row: number; data: AllocationRow };

// Roles a case can be allocated to.
const ALLOCATABLE: Role[] = ["AGENT", "AGENCY_OWNER", "RECRUITER"];

export type PlanInput = {
  rows: ValidAllocationRow[];
  loans: Map<string, string>; // agreementNo -> loan id
  users: Map<string, { id: string; role: Role; status: UserStatus; agencyId: string | null }>; // lower-cased email -> app user
  agencies: Map<string, string>; // lower-cased agency name -> agency id
  active: Map<string, { id: string; agentId: string | null; validTill: Date | null }>; // loan id -> its active allocation
  now: Date;
};

type Target = { row: number; agreementNo: string; loanId: string; agentId: string; agencyId: string | null; assignedOn: Date; validTill: Date | null };
export type AllocationAction =
  | ({ kind: "create" } & Target)
  | ({ kind: "reassign"; closeId: string } & Target)
  | { kind: "set-valid-till"; row: number; agreementNo: string; allocationId: string; validTill: Date | null }
  | { kind: "close"; row: number; agreementNo: string; allocationId: string };

export type AllocationPlan = { actions: AllocationAction[]; errors: ImportRowError[]; unchanged: number };

// Same moment (or both empty)?
const sameDate = (a: Date | null | undefined, b: Date | null | undefined) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

// Decides what each allocation row should do, with no database access: create, reassign (old one is closed, history kept),
// change valid-till, close (blank agent email), or nothing. Rows that cannot be matched become errors, never silent skips.
export const planAllocationChanges = ({ rows, loans, users, agencies, active, now }: PlanInput): AllocationPlan => {
  const plan: AllocationPlan = { actions: [], errors: [], unchanged: 0 };

  for (const { row, data } of rows) {
    const { agreementNo, agentEmail, agency, assignedOn, validTill } = data;
    const fail = (reason: string, extra?: { agentEmail: string }) => void plan.errors.push({ row, agreementNo, reason, ...extra });

    const loanId = loans.get(agreementNo);
    if (!loanId) { fail("Loan not found; import Loans first"); continue; }
    const current = active.get(loanId);

    if (!agentEmail) {
      if (current) plan.actions.push({ kind: "close", row, agreementNo, allocationId: current.id });
      else plan.unchanged++;
      continue;
    }

    const email = agentEmail.toLowerCase();
    const user = users.get(email);
    if (!user) { fail(`No app user with email ${agentEmail}`, { agentEmail: email }); continue; }
    if (user.status !== "ACTIVE") { fail(`User ${agentEmail} is disabled`); continue; }
    if (!ALLOCATABLE.includes(user.role)) { fail(`User ${agentEmail} has a role that cannot hold cases`); continue; }

    let agencyId = user.agencyId;
    if (agency) {
      const found = agencies.get(agency.toLowerCase());
      if (!found) { fail(`Agency "${agency}" not found`); continue; }
      agencyId = found;
    }

    if (current?.agentId === user.id) {
      if (validTill !== undefined && !sameDate(current.validTill, validTill)) {
        plan.actions.push({ kind: "set-valid-till", row, agreementNo, allocationId: current.id, validTill });
      } else plan.unchanged++;
      continue;
    }

    const target: Target = { row, agreementNo, loanId, agentId: user.id, agencyId, assignedOn: assignedOn ?? now, validTill: validTill ?? null };
    plan.actions.push(current ? { kind: "reassign", closeId: current.id, ...target } : { kind: "create", ...target });
  }
  return plan;
};

// Loads everything the plan needs, builds it, then writes it. `userId` is recorded as the assigner.
export const applyAllocations = async (rows: ValidAllocationRow[], userId: string, importId: string): Promise<ApplyResult> => {
  const loans = new Map<string, string>();
  const active: PlanInput["active"] = new Map();
  for (const part of chunk(rows.map((r) => r.data.agreementNo), 1000)) {
    const found = await prisma.loan.findMany({ where: { agreementNo: { in: part } }, select: { id: true, agreementNo: true } });
    found.forEach((l) => loans.set(l.agreementNo, l.id));
    const current = await prisma.allocation.findMany({
      where: { active: true, loanId: { in: found.map((l) => l.id) } },
      select: { id: true, loanId: true, agentId: true, validTill: true },
    });
    current.forEach((a) => active.set(a.loanId, a));
  }
  const appUsers = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, role: true, status: true, agencyId: true },
  });
  const users = new Map(appUsers.map((u) => [u.email!.toLowerCase(), u]));
  const agencies = new Map((await prisma.agency.findMany({ select: { id: true, name: true } })).map((a) => [a.name.toLowerCase(), a.id]));

  const now = new Date();
  const plan = planAllocationChanges({ rows, loans, users, agencies, active, now });

  const written = await applyInChunks(
    plan.actions,
    (tx, actions) => sequential(actions, async (action) => {
      if (action.kind === "set-valid-till") {
        await tx.allocation.update({ where: { id: action.allocationId }, data: { validTill: action.validTill } });
        return "updated";
      }
      if (action.kind === "close") {
        await tx.allocation.update({ where: { id: action.allocationId }, data: { active: false, activeLoanId: null, endedAt: now } });
        return "updated";
      }
      // Reassign closes the old allocation first (its history stays), then both kinds open a new active one.
      if (action.kind === "reassign") {
        await tx.allocation.update({ where: { id: action.closeId }, data: { active: false, activeLoanId: null, endedAt: now } });
      }
      const { loanId, agentId, agencyId, assignedOn, validTill } = action;
      await tx.allocation.create({
        data: { loanId, activeLoanId: loanId, agentId, agencyId, assignedById: userId, assignedOn, validTill, importRunId: importId },
      });
      return action.kind === "create" ? "created" : "updated";
    }),
    (action) => action.agreementNo,
  );

  return {
    created: written.created,
    updated: written.updated,
    unchanged: written.unchanged + plan.unchanged,
    errors: [...plan.errors, ...written.errors],
  };
};
