import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { BatchesView } from "@/features/batches/_components/batches-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const BatchesPage = () => (
  <Suspense fallback={<LoadingView message="Loading batches…" />}>
    <BatchesView />
  </Suspense>
);

export default BatchesPage;
