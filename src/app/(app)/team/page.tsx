import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { TeamView } from "@/features/team/_components/team-view";

// Thin page; Suspense is required because the view reads the URL's search params. Errors fall to (app)/error.tsx.
const TeamPage = () => (
  <Suspense fallback={<LoadingView message="Loading team…" />}>
    <TeamView />
  </Suspense>
);

export default TeamPage;
