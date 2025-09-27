"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { useEntities } from "@/modules/entities/hooks/use-entities";
import { useTemplates } from "@/modules/templates/hooks/use-templates";
import { fetchJobs, mapApiJob } from "@/modules/jobs/lib/api";
import { Job } from "@/types/matching";
import type { ApiJob } from "@/modules/jobs/lib/api";

const JOBS_KEY = "jobs";

export function useJobs() {
  const { data: apiJobs, error, isLoading, mutate } = useSWR<ApiJob[]>(JOBS_KEY, fetchJobs, {
    revalidateOnFocus: false,
  });

  const { data: templates } = useTemplates();
  const { data: entities } = useEntities();

  const templatesById = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template]));
  }, [templates]);

  const entitiesById = useMemo(() => {
    return new Map(entities.map((entity) => [entity.id, entity]));
  }, [entities]);

  const jobs = useMemo<Job[]>(() => {
    if (!apiJobs) {
      return [];
    }

    return apiJobs.map((apiJob) =>
      mapApiJob(apiJob, {
        template: templatesById.get(apiJob.template),
        sourceEntity: entitiesById.get(apiJob.source_entity) ?? null,
      }),
    );
  }, [apiJobs, templatesById, entitiesById]);

  return {
    data: jobs,
    isLoading,
    error,
    mutate,
  } as const;
}

export { JOBS_KEY };
