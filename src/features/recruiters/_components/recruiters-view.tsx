"use client";

import { useState } from "react";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecruitersParams } from "../hooks/use-recruiters-params";
import { RECRUITER_TABS, RECRUITER_TAB_LABELS, type RecruiterTab } from "../types";
import { AssignCasesDialog } from "./assign-cases-dialog";
import { RecruiterCasesTab } from "./recruiter-cases-tab";
import { RecruiterEscalationsTab } from "./recruiter-escalations-tab";
import { RecruiterPerformanceTab } from "./recruiter-performance-tab";
import { RecruiterRulesTab } from "./recruiter-rules-tab";

/**
 * @component RecruitersView
 * @description Recruiters page for Admins and Managers: the cases recruiters hold with their time left, cases that moved on to callers, each
 * recruiter's numbers, and the escalation rules. The active tab, its filters, search and page live in the URL.
 */
export const RecruitersView = () => {
  const params = useRecruitersParams();
  const tab = params.filters.tab as RecruiterTab;
  // Whether the Assign cases form is open.
  const [assigning, setAssigning] = useState(false);

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Recruiters"
          description="Cases our sourcing partners are working, and what happens when their time runs out."
          newButtonLabel="Assign cases"
          onNew={() => setAssigning(true)}
        />
      }
      search={
        <Tabs value={tab} onValueChange={(v) => params.setFilters({ tab: String(v) })}>
          <TabsList>
            {RECRUITER_TABS.map((t) => (
              <TabsTrigger key={t} value={t}>{RECRUITER_TAB_LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {tab === "cases" && <RecruiterCasesTab params={params} />}
      {tab === "escalations" && <RecruiterEscalationsTab params={params} />}
      {tab === "performance" && <RecruiterPerformanceTab params={params} />}
      {tab === "rules" && <RecruiterRulesTab />}
      <AssignCasesDialog open={assigning} onOpenChange={setAssigning} />
    </EntityContainer>
  );
};
