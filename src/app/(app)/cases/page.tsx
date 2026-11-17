import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { CasesView } from "@/features/cases/_components/cases-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const CasesPage = () => (
  <Suspense fallback={<LoadingView message="Loading cases…" />}>
    <CasesView />
  </Suspense>
);

export default CasesPage;
