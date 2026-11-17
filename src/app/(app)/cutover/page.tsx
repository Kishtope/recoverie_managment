import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { CutoverView } from "@/features/cutover/_components/cutover-view";

// Thin page; Suspense is required because the view reads the URL's search params. The API rejects non-Admins.
const CutoverPage = () => (
  <Suspense fallback={<LoadingView message="Loading cut-over…" />}>
    <CutoverView />
  </Suspense>
);

export default CutoverPage;
