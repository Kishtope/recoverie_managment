import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { QuestionsView } from "@/features/questions/_components/questions-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const QuestionsPage = () => (
  <Suspense fallback={<LoadingView message="Loading questions…" />}>
    <QuestionsView />
  </Suspense>
);

export default QuestionsPage;
