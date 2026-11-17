import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { ImportsView } from "@/features/imports/_components/imports-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const ImportsPage = () => (
  <Suspense fallback={<LoadingView message="Loading imports…" />}>
    <ImportsView />
  </Suspense>
);

export default ImportsPage;
