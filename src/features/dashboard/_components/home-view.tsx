"use client";

import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components/loading-view";
import { useMe } from "@/features/auth/hooks/use-me";
import { AgentDashboard } from "./agent-dashboard";
import { TeamDashboard } from "./team-dashboard";

/**
 * @component HomeView
 * @description The home page picks its dashboard by role: agents get their own, Admin / Manager / Agency owner get the team dashboard.
 * The team dashboard keeps its filters in the URL, so it is wrapped in Suspense.
 */
export const HomeView = () => {
  const { data: me } = useMe();
  if (!me) return <LoadingView message="Loading dashboard…" />;
  if (me.role === "AGENT") return <AgentDashboard />;
  return (
    <Suspense fallback={<LoadingView message="Loading dashboard…" />}>
      <TeamDashboard />
    </Suspense>
  );
};
