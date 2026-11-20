"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_CATEGORIES, QUESTION_CATEGORY_LABELS } from "@/lib/constants";
import { useCreateQuestion, useUpdateQuestion } from "../hooks/use-question-mutations";
import { questionSchema } from "../schemas";
import type { QuestionItem } from "../types";

// Form text for the question being edited (or blank for a new one); the order stays a string until submit.
const toValues = (q: QuestionItem | null) => ({
  text: q?.text ?? "",
  category: q?.category ?? "",
  displayOrder: q ? String(q.displayOrder) : "",
  active: q?.active ?? true,
});

/**
 * @component QuestionFormDialog
 * @description Admin form that adds a customer question or edits one. Validated with the same zod schema the API uses; the hooks show the
 * toast and refresh the lists. Edits never touch answers already saved in case history.
 * @param question The question being edited, or null to add a new one.
 */
export const QuestionFormDialog = ({ open, onOpenChange, question }: { open: boolean; onOpenChange: (open: boolean) => void; question: QuestionItem | null }) => {
  const create = useCreateQuestion();
  const update = useUpdateQuestion();
  const isPending = create.isPending || update.isPending;
  const [values, setValues] = useState(() => toValues(question));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fills the form from the question being edited (or blank) each time the dialog opens, so nothing stale carries over.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(toValues(question));
      setErrors({});
    }
  }

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const order = values.displayOrder.trim();
    const parsed = questionSchema.safeParse({
      text: values.text,
      category: values.category || undefined,
      displayOrder: order === "" ? undefined : Number(order),
      active: values.active,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])));
      return;
    }
    setErrors({});
    const done = { onSuccess: () => onOpenChange(false) };
    if (question) update.mutate({ id: question.id, ...parsed.data }, done);
    else create.mutate(parsed.data, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={question ? "Edit question" : "New question"}
      description={question ? "Changes apply to new calls. Answers already saved keep the question as it was asked." : "Agents will see this question on every case while it is active."}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="question-form" variant="accent" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving…" : question ? "Save changes" : "Add question"}
          </Button>
        </>
      }
    >
      <form id="question-form" onSubmit={onSubmit} className="w-full min-w-0 pb-4">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Question</FieldLegend>
            <Field data-invalid={!!errors.text}>
              <FieldLabel htmlFor="question-text">What should the agent ask?</FieldLabel>
              <Textarea id="question-text" rows={3} value={values.text} onChange={(e) => setValues((v) => ({ ...v, text: e.target.value }))} placeholder="Why is your payment delayed?" aria-invalid={!!errors.text} />
              {errors.text && <FieldError>{errors.text}</FieldError>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.category} className="min-w-0">
                <FieldLabel htmlFor="question-category">Category</FieldLabel>
                <FormSelect
                  id="question-category"
                  value={values.category}
                  onChange={(category) => setValues((v) => ({ ...v, category }))}
                  invalid={!!errors.category}
                  placeholder="Choose a category"
                  options={QUESTION_CATEGORIES.map((c) => ({ value: c, label: QUESTION_CATEGORY_LABELS[c] }))}
                />
                {errors.category && <FieldError>{errors.category}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.displayOrder} className="min-w-0">
                <FieldLabel htmlFor="question-order">Display order (optional)</FieldLabel>
                <Input id="question-order" inputMode="numeric" value={values.displayOrder} onChange={(e) => setValues((v) => ({ ...v, displayOrder: e.target.value }))} placeholder="Last in its category" aria-invalid={!!errors.displayOrder} />
                <FieldDescription>Lower numbers are asked first within a category.</FieldDescription>
                {errors.displayOrder && <FieldError>{errors.displayOrder}</FieldError>}
              </Field>
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Visibility</FieldLegend>
            <Field orientation="horizontal">
              <Switch id="question-active" checked={values.active} onCheckedChange={(active) => setValues((v) => ({ ...v, active }))} />
              <FieldLabel htmlFor="question-active">Active (shown to agents)</FieldLabel>
            </Field>
          </FieldSet>
        </FieldGroup>
      </form>
    </FormDialog>
  );
};
