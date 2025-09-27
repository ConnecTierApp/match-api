"use client";

import { useMemo } from "react";

import { useMatchingContext } from "@/providers/mock-matching-provider";
import {
  EntityType,
  Job,
  JobInput,
  JobUpdate,
  Match,
  MatchInput,
  MatchUpdate,
  Template,
  TemplateInput,
  TemplateUpdate,
} from "@/types/matching";

export function useEntityOptions() {
  const { entities } = useMatchingContext();
  return entities;
}

export function useTemplates() {
  const { templates } = useMatchingContext();
  return {
    data: templates,
    isLoading: false,
    error: null,
  } as const;
}

export function useTemplate(templateId?: string | null) {
  const { templates } = useMatchingContext();

  return useMemo<Template | null>(() => {
    if (!templateId) {
      return null;
    }
    return templates.find((template) => template.id === templateId) ?? null;
  }, [templateId, templates]);
}

export function useTemplateMutations() {
  const { createTemplate, updateTemplate, deleteTemplate } = useMatchingContext();

  return {
    createTemplate: (input: TemplateInput) => createTemplate(input),
    updateTemplate: (id: string, input: TemplateUpdate) => updateTemplate(id, input),
    deleteTemplate: (id: string) => deleteTemplate(id),
  } as const;
}

export function useJobs() {
  const { jobs } = useMatchingContext();

  return {
    data: jobs,
    isLoading: false,
    error: null,
  } as const;
}

export function useJob(jobId?: string | null) {
  const { jobs } = useMatchingContext();

  return useMemo<Job | null>(() => {
    if (!jobId) {
      return null;
    }

    return jobs.find((job) => job.id === jobId) ?? null;
  }, [jobId, jobs]);
}

export function useJobMutations() {
  const { createJob, updateJob, deleteJob } = useMatchingContext();

  return {
    createJob: (input: JobInput) => createJob(input),
    updateJob: (id: string, input: JobUpdate) => updateJob(id, input),
    deleteJob: (id: string) => deleteJob(id),
  } as const;
}

export function useMatches(options?: { jobId?: string }) {
  const { matches } = useMatchingContext();

  const filtered = useMemo(() => {
    if (!options?.jobId) {
      return matches;
    }

    return matches.filter((match) => match.jobId === options.jobId);
  }, [matches, options?.jobId]);

  return {
    data: filtered,
    isLoading: false,
    error: null,
  } as const;
}

export function useMatch(matchId?: string | null) {
  const { matches } = useMatchingContext();

  return useMemo<Match | null>(() => {
    if (!matchId) {
      return null;
    }

    return matches.find((match) => match.id === matchId) ?? null;
  }, [matchId, matches]);
}

export function useMatchMutations() {
  const { createMatch, updateMatch, deleteMatch } = useMatchingContext();

  return {
    createMatch: (input: MatchInput) => createMatch(input),
    updateMatch: (id: string, input: MatchUpdate) => updateMatch(id, input),
    deleteMatch: (id: string) => deleteMatch(id),
  } as const;
}

export function useMatchesByJob(jobId?: string | null) {
  return useMatches(jobId ? { jobId } : undefined);
}

export function useTemplatesByEntity(entity: EntityType) {
  const { data: templates } = useTemplates();

  return useMemo(() => {
    return templates.filter(
      (template) => template.defaultSource === entity || template.defaultTarget === entity,
    );
  }, [entity, templates]);
}

export function useMatchingStats() {
  const { data: templates } = useTemplates();
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches();

  const totalAutoApproved = useMemo(
    () => matches.filter((match) => match.status === "auto_approved").length,
    [matches],
  );

  return {
    templates,
    jobs,
    matches,
    totalAutoApproved,
  } as const;
}
