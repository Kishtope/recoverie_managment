"use client";

import { useState } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_CATEGORIES, QUESTION_CATEGORY_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetActiveQuestions } from "@/features/questions/hooks/use-get-questions";
import type { ActiveQuestion } from "@/features/questions/types";

// What the agent typed for one question; sent with the outcome when the answer is not empty.
export type Answer = { response: string; remarks: string };
// Answers by question id; lives in the case page so the outcome panel can save them together with the outcome.
export type Answers = Record<string, Answer>;

// One question with its answer box and an optional remark (revealed on demand so the form stays short).
const QuestionRow = ({ index, question, answer, onChange, disabled }: { index: number; question: ActiveQuestion; answer: Answer; onChange: (patch: Partial<Answer>) => void; disabled?: boolean }) => {
  const [showRemarks, setShowRemarks] = useState(!!answer.remarks);
  return (
    <Field>
      <FieldLabel htmlFor={`answer-${question.id}`} className="leading-snug">
        <span className="text-muted-foreground tabular-nums">{index}.</span> {question.text}
      </FieldLabel>
      <Textarea
        id={`answer-${question.id}`}
        rows={2}
        value={answer.response}
        disabled={disabled}
        onChange={(e) => onChange({ response: e.target.value })}
        placeholder="Customer's answer (leave empty if not asked)"
        maxLength={1000}
      />
      {showRemarks ? (
        <Input aria-label={`Remark for: ${question.text}`} value={answer.remarks} disabled={disabled} onChange={(e) => onChange({ remarks: e.target.value })} placeholder="Remark (optional)" maxLength={500} />
      ) : (
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setShowRemarks(true)} disabled={disabled}>
          <MessageSquarePlusIcon data-icon="inline-start" />
          Add remark
        </Button>
      )}
    </Field>
  );
};

/**
 * @component CustomerQueryCard
 * @description Customer Query & Response: the questions Admin has set up (only the active ones), grouped by category, each with a box for the
 * customer's answer. Agents can only answer them, never add or change a question. The answers are saved with the outcome from the panel on the right.
 * @param answers Answers typed so far, by question id (owned by the case page).
 * @param onChange Called with a question id and the changed part of its answer.
 * @param disabled Locks the boxes while the outcome is being saved.
 */
export const CustomerQueryCard = ({ answers, onChange, disabled }: { answers: Answers; onChange: (questionId: string, patch: Partial<Answer>) => void; disabled?: boolean }) => {
  const { data: questions, isPending, isError, error } = useGetActiveQuestions();

  let body;
  if (isPending) {
    body = (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  } else if (isError) {
    body = <p className="text-sm text-destructive">{getErrorMessage(error, "Couldn't load the questions.")}</p>;
  } else if (questions.length === 0) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No questions are set up</EmptyTitle>
          <EmptyDescription>An admin adds the questions to ask on the Questions page. You can still save the outcome.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    // Questions arrive ordered by category then display order; numbering runs on across the groups.
    let n = 0;
    body = (
      <div className="flex flex-col gap-6">
        {QUESTION_CATEGORIES.map((category) => {
          const inGroup = questions.filter((q) => q.category === category);
          if (inGroup.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-4">
              <h3 className="kicker text-muted-foreground">{QUESTION_CATEGORY_LABELS[category]}</h3>
              {inGroup.map((q) => (
                <QuestionRow key={q.id} index={++n} question={q} answer={answers[q.id] ?? { response: "", remarks: "" }} onChange={(patch) => onChange(q.id, patch)} disabled={disabled} />
              ))}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer query &amp; response</CardTitle>
        <CardDescription>Ask the customer these questions and write down what they say. Questions you skip are not saved.</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};
