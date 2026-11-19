import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { ScorecardsView } from "@/features/scorecards/_components/scorecards-view";

// Thin page; Suspense is required because the view reads the URL's search params. The API rejects agents.
const PerformancePage = () => (
  <Suspense fallback={<LoadingView message="Loading performance…" />}>
    <ScorecardsView />
  </Suspense>
);

export default PerformancePage;
