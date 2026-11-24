import { format } from "date-fns";
import { MoreVerticalIcon, PencilIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { DataTableColumn } from "@/components/data-table";
import { QUESTION_CATEGORY_LABELS } from "@/lib/constants";
import type { QuestionItem } from "../types";

// What a row can do. `pendingId` is the question a status change or delete is running for (its button shows a spinner).
export type QuestionRowActions = {
  onEdit: (q: QuestionItem) => void;
  onToggle: (q: QuestionItem) => void;
  onDelete: (q: QuestionItem) => void;
  pendingId: string | null;
};

// Status pill: Active is filled, Inactive is outlined.
export const QuestionStatusBadge = ({ active }: { active: boolean }) => <Badge variant={active ? "secondary" : "outline"}>{active ? "Active" : "Inactive"}</Badge>;

// Columns of the Questions table. The question cell shows its category on a muted line; row actions are Edit, Activate / Deactivate and Delete
// (deleting asks first, in the view).
export const getQuestionsColumns = (actions: QuestionRowActions): DataTableColumn<QuestionItem>[] => [
  {
    key: "question",
    header: "Question",
    cell: (q) => (
      <div className="min-w-64 max-w-xl">
        <div className="wrap-break-word font-medium">{q.text}</div>
        <div className="text-xs text-muted-foreground">{QUESTION_CATEGORY_LABELS[q.category]}</div>
      </div>
    ),
  },
  { key: "order", header: "Order", className: "text-right tabular-nums", cell: (q) => q.displayOrder },
  { key: "status", header: "Status", cell: (q) => <QuestionStatusBadge active={q.active} /> },
  {
    key: "created",
    header: "Created by",
    cell: (q) => (
      <div className="min-w-0">
        <div className="truncate">{q.createdBy.name}</div>
        <div className="text-xs text-muted-foreground">{format(new Date(q.createdAt), "dd MMM yyyy")}</div>
      </div>
    ),
  },
  { key: "updated", header: "Updated", cell: (q) => format(new Date(q.updatedAt), "dd MMM yyyy") },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cell: (q) => {
      const pending = actions.pendingId === q.id;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon" variant="ghost" aria-label="Question actions" />}>
              {pending ? <Spinner /> : <MoreVerticalIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => actions.onEdit(q)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem disabled={pending} onClick={() => actions.onToggle(q)}>
                  {q.active ? <PowerOffIcon /> : <PowerIcon />}
                  {q.active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => actions.onDelete(q)}>
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
