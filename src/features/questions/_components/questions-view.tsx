"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { EntityPagination } from "@/components/entity-components/entity-pagination";
import { EntitySearch } from "@/components/entity-components/entity-search";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSelect } from "@/components/filter-select";
import { QUESTION_CATEGORIES, QUESTION_CATEGORY_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useGetQuestions } from "../hooks/use-get-questions";
import { useDeleteQuestion, useUpdateQuestion } from "../hooks/use-question-mutations";
import { useQuestionsParams } from "../hooks/use-questions-params";
import { QUESTION_FILTERS, type QuestionFilter, type QuestionItem } from "../types";
import { QuestionFormDialog } from "./question-form-dialog";
import { getQuestionsColumns } from "./questions-table";

const PAGE_SIZE = 10;

const FILTER_LABELS: Record<QuestionFilter, string> = { all: "All", active: "Active", inactive: "Inactive" };
const CATEGORY_OPTIONS = [{ value: "all", label: "All categories" }, ...QUESTION_CATEGORIES.map((c) => ({ value: c, label: QUESTION_CATEGORY_LABELS[c] }))];

/**
 * @component QuestionsView
 * @description Questions page (Admin): the questions agents ask customers on collection calls. Admin adds, edits, activates / deactivates and
 * deletes them and sets their category and order; agents only see the active ones on a case. Status, category, search and page live in the URL.
 */
export const QuestionsView = () => {
  const params = useQuestionsParams();
  const status = params.filters.status as QuestionFilter;
  const category = params.filters.category;

  const { data, isPending, isError, error, isPlaceholderData } = useGetQuestions({ status, category, q: params.q, page: params.page, pageSize: PAGE_SIZE });
  const update = useUpdateQuestion();
  const remove = useDeleteQuestion();

  // Which dialog is open: the form (a new question, or the one being edited) or the delete confirmation.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionItem | null>(null);
  const [deleting, setDeleting] = useState<QuestionItem | null>(null);

  const openForm = (q: QuestionItem | null) => {
    setEditing(q);
    setFormOpen(true);
  };

  const columns = useMemo(
    () =>
      getQuestionsColumns({
        onEdit: openForm,
        onToggle: (q) => update.mutate({ id: q.id, active: !q.active }),
        onDelete: setDeleting,
        pendingId: update.isPending ? (update.variables?.id ?? null) : remove.isPending ? (remove.variables ?? null) : null,
      }),
    [update, remove],
  );

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const toolbar = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup variant="outline" aria-label="Status" value={[status]} onValueChange={(v) => v[0] && params.setFilter("status", v[0])}>
          {QUESTION_FILTERS.map((f) => (
            <ToggleGroupItem key={f} value={f}>
              {FILTER_LABELS[f]}
              {data && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{data.counts[f]}</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FilterSelect ariaLabel="Category" value={category} onChange={(v) => params.setFilter("category", v)} options={CATEGORY_OPTIONS} className="w-52" />
        {params.hasActiveFilters && <Button variant="ghost" size="sm" onClick={params.clearFilters}>Clear filters</Button>}
        <EntitySearch value={params.searchInput} onChange={params.setSearchInput} placeholder="Search question text" />
      </div>
      {data && <p className="text-sm text-muted-foreground">{data.total ? `Showing ${from}–${to} of ${data.total} questions` : "No questions"}</p>}
    </div>
  );

  return (
    <EntityContainer
      header={<EntityHeader title="Customer questions" description="Questions agents ask customers on collection calls. Agents see the active ones on every case and record the customer's answers." newButtonLabel="New question" onNew={() => openForm(null)} />}
      search={toolbar}
      pagination={<EntityPagination page={params.page} totalPages={totalPages} onPageChange={params.setPage} disabled={isPlaceholderData} />}
    >
      {isPending ? (
        <LoadingView message="Loading questions…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load questions.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView
          empty_label="No questions"
          message={params.hasActiveFilters ? "No questions match these filters." : "Add the questions agents should ask customers."}
          label="New question"
          onNew={() => openForm(null)}
        />
      ) : (
        <DataTable className={cn(isPlaceholderData && "opacity-60")} columns={columns} rows={data.items} getRowKey={(q) => q.id} />
      )}

      <QuestionFormDialog open={formOpen} onOpenChange={setFormOpen} question={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents will no longer see it. Answers already saved on cases keep the question as it was asked. To hide it for now without losing it, deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EntityContainer>
  );
};
