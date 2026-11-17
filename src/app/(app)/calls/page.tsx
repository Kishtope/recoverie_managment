import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { CallsView } from "@/features/calls/_components/calls-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const CallsPage = () => (
  <Suspense fallback={<LoadingView message="Loading calls…" />}>
    <CallsView />
  </Suspense>
);

export default CallsPage;
