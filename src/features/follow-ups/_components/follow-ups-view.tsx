"use client";

import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { FollowUpSection } from "./follow-up-section";

/**
 * @component FollowUpsView
 * @description The agent's follow-up agenda in three sections: overdue, today and the next 7 days. Phone friendly (stacked rows, no grid).
 */
export const FollowUpsView = () => (
  <EntityContainer header={<EntityHeader title="Follow-ups" description="Who to call next, grouped by day." />}>
    <div className="flex min-w-0 flex-col gap-4">
      <FollowUpSection title="Overdue" followUp="overdue" viewAllFilter="overdue" />
      <FollowUpSection title="Today" followUp="today" viewAllFilter="today" />
      <FollowUpSection title="Next 7 days" followUp="next7" viewAllFilter="upcoming" groupByDay />
    </div>
  </EntityContainer>
);
