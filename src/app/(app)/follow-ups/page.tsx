import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FollowUpsView } from "@/features/follow-ups/_components/follow-ups-view";

// Thin page; Suspense is required because the view reads the URL's search params (tab, search, page).
const FollowUpsPage = () => (
  <Suspense fallback={<LoadingView message="Loading follow-ups…" />}>
    <FollowUpsView />
  </Suspense>
);

export default FollowUpsPage;
