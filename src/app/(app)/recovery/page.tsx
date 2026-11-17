import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { RecoveryView } from "@/features/recovery/_components/recovery-view";

// Thin page; Suspense is required because the view reads the URL's search params. The API rejects agents.
const RecoveryPage = () => (
  <Suspense fallback={<LoadingView message="Loading recovery…" />}>
    <RecoveryView />
  </Suspense>
);

export default RecoveryPage;
