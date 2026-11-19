import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fromDbDate, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { recruiterDeadline } from "@/lib/recruiter-deadline";
import { heldByRecruiterWhere, loanSearchWhere } from "@/lib/recruiters";
import { getAllSettings } from "@/lib/settings";
import { RECRUITER_STAGES, type RecruiterCaseItem, type RecruiterCasesResponse, type RecruiterStage } from "@/features/recruiters/types";

// Cases recruiters hold right now, most urgent first, with how many days each has left before it moves to a caller. The deadline depends on
// open promises (see recruiterDeadline), so it is worked out here rather than in SQL: the recruiter caseload is small enough to read in one go
// and page in memory. Stage "due-soon" keeps cases at or below the reminder days (including any past the limit). Admin and Manager.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const stage = (RECRUITER_STAGES as readonly string[]).includes(sp.get("stage") ?? "") ? (sp.get("stage") as RecruiterStage) : "with-recruiter";
  const recruiter = sp.get("recruiter")?.trim() || undefined;
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const settings = await getAllSettings();
  const limit = settings["recruiter.escalationDays"];
  const reminderDays = settings["recruiter.reminderDays"];
  const today = todayIst();

  const rows = await prisma.allocation.findMany({
    where: { AND: [heldByRecruiterWhere(auth.user, recruiter), loanSearchWhere(q)] },
    select: {
      id: true,
      assignedOn: true,
      agent: { select: { id: true, name: true } },
      loan: { select: { id: true, agreementNo: true, dpd: true, overdueAmount: true, lastOutcome: true, nextFollowUpOn: true, customer: { select: { name: true } } } },
    },
  });

  const all: RecruiterCaseItem[] = rows
    .filter((r) => r.agent)
    .map((r) => {
      // An open promise (or part payment with a follow-up) keeps the timer running, same rule as the daily escalation job.
      const promisedFor = r.loan.lastOutcome === "PTP" || r.loan.lastOutcome === "PART_PAID" ? fromDbDate(r.loan.nextFollowUpOn) : null;
      const d = recruiterDeadline(r.assignedOn, limit, today, promisedFor);
      return {
        allocationId: r.id,
        loanId: r.loan.id,
        agreementNo: r.loan.agreementNo,
        customerName: r.loan.customer.name,
        recruiter: { id: r.agent!.id, name: r.agent!.name },
        assignedOn: r.assignedOn.toISOString(),
        deadline: d.deadline,
        daysLeft: d.daysLeft,
        overdue: d.overdue,
        dpd: r.loan.dpd,
        overdueAmount: r.loan.overdueAmount?.toNumber() ?? null,
        lastOutcome: r.loan.lastOutcome,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft || a.agreementNo.localeCompare(b.agreementNo));

  const dueSoon = all.filter((c) => c.daysLeft <= reminderDays);
  const shown = stage === "due-soon" ? dueSoon : all;
  const body: RecruiterCasesResponse = {
    items: shown.slice((page - 1) * pageSize, page * pageSize),
    total: shown.length,
    page,
    pageSize,
    counts: { "with-recruiter": all.length, "due-soon": dueSoon.length },
  };
  return NextResponse.json(body);
};
