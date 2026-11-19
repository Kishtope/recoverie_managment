import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { RecruitersView } from "@/features/recruiters/_components/recruiters-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const RecruitersPage = () => (
  <Suspense fallback={<LoadingView message="Loading recruiters…" />}>
    <RecruitersView />
  </Suspense>
);

export default RecruitersPage;
