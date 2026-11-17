"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { useMe } from "@/features/auth/hooks/use-me";
import { AgentDashboard } from "./agent-dashboard";

/**
 * @component HomeView
 * @description The home page picks its dashboard by role. Agents get their own; the other roles get a placeholder until their
 * dashboards are built (manager / agency / admin: Phase 4, field agent: Phase 2B).
 */
export const HomeView = () => {
  const { data: me } = useMe();
  if (me?.role === "AGENT") return <AgentDashboard />;

  return (
    <EntityContainer header={<EntityHeader title="Dashboard" />}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Your dashboard is coming soon</EmptyTitle>
          <EmptyDescription>Use the menu to open the pages available for your role.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </EntityContainer>
  );
};
