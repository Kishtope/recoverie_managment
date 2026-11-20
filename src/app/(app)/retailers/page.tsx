import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { RetailersView } from "@/features/retailers/_components/retailers-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const RetailersPage = () => (
  <Suspense fallback={<LoadingView message="Loading retailers…" />}>
    <RetailersView />
  </Suspense>
);

export default RetailersPage;
