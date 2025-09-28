"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { LaunchJobCard } from "./components/launch-job-card";
import { JobsTableCard } from "./components/jobs-table-card";
import { useEntityOptions, useEntities } from "@/modules/entities/hooks/use-entities";
import { useJobMutations } from "@/modules/jobs/hooks/use-job-mutations";
import { useJobs } from "@/modules/jobs/hooks/use-jobs";
import { useTemplates } from "@/modules/templates/hooks/use-templates";

function JobsPageContent() {
  const searchParams = useSearchParams();
  const templateQuery = searchParams.get("templateId");

  const { data: jobs } = useJobs();
  const { data: templates } = useTemplates();
  const {
    options: entityOptions,
    isLoading: isLoadingEntityTypes,
    usingFallback,
  } = useEntityOptions();
  const { data: entities } = useEntities();
  const { createJob } = useJobMutations();

  const sortedJobs = useMemo(() => {
    const statusOrder = {
      Queued: 1,
      Scoring: 2,
      Completed: 3,
      Failed: 0,
    } as const;

    return [...jobs].sort((a, b) => statusOrder[b.status] - statusOrder[a.status]);
  }, [jobs]);

  const templateNames = useMemo(() => {
    return templates.reduce<Record<string, string>>((accumulator, template) => {
      accumulator[template.id] = template.name;
      return accumulator;
    }, {});
  }, [templates]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <LaunchJobCard
        templates={templates}
        entities={entities}
        entityOptions={entityOptions}
        isLoadingEntityTypes={isLoadingEntityTypes}
        disableSelection={usingFallback}
        defaultTemplateId={templateQuery}
        onCreate={createJob}
      />
      <JobsTableCard jobs={sortedJobs} templateNames={templateNames} />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading jobs...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
