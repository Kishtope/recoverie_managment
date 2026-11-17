import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { PerformanceView } from "@/features/performance/_components/performance-view";

// Thin page; Suspense is required because the view reads the URL's search params. The API rejects agents.
const PerformancePage = () => (
  <Suspense fallback={<LoadingView message="Loading performance…" />}>
    <PerformanceView />
  </Suspense>
);

export default PerformancePage;
