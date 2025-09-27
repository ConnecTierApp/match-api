"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { wait } from "@/lib/wait";
import {
  entityOptions,
  generateId,
  generateMatchesForJob,
  initialJobs,
  initialMatches,
  initialTemplates,
} from "@/mocks/matching-data";
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

export interface MatchingContextValue {
  templates: Template[];
  jobs: Job[];
  matches: Match[];
  entities: EntityType[];
  createTemplate: (input: TemplateInput) => Promise<Template>;
  updateTemplate: (id: string, input: TemplateUpdate) => Promise<Template | null>;
  deleteTemplate: (id: string) => Promise<void>;
  createJob: (input: JobInput) => Promise<{ job: Job; matches: Match[] }>;
  updateJob: (id: string, input: JobUpdate) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<void>;
  createMatch: (input: MatchInput) => Promise<Match>;
  updateMatch: (id: string, input: MatchUpdate) => Promise<Match | null>;
  deleteMatch: (id: string) => Promise<void>;
}

const MatchingContext = createContext<MatchingContextValue | null>(null);

export function MatchingProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  const createTemplate = useCallback(async (input: TemplateInput) => {
    await wait();

    const newTemplate: Template = {
      id: generateId("tmpl"),
      ...input,
      lastUpdated: "just now",
    };

    setTemplates((current) => [newTemplate, ...current]);

    return newTemplate;
  }, []);

  const updateTemplate = useCallback(async (id: string, input: TemplateUpdate) => {
    await wait();

    let updatedTemplate: Template | null = null;

    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== id) {
          return template;
        }

        updatedTemplate = {
          ...template,
          ...input,
          lastUpdated: "just now",
        };
        return updatedTemplate;
      }),
    );

    return updatedTemplate;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await wait();

    setTemplates((current) => current.filter((template) => template.id !== id));
    setJobs((currentJobs) => {
      const removedJobIds = new Set(currentJobs.filter((job) => job.templateId === id).map((job) => job.id));
      const remainingJobs = currentJobs.filter((job) => !removedJobIds.has(job.id));

      if (removedJobIds.size > 0) {
        setMatches((currentMatches) => currentMatches.filter((match) => !removedJobIds.has(match.jobId)));
      }

      return remainingJobs;
    });
  }, []);

  const createJob = useCallback(async (input: JobInput) => {
    await wait();

    const newJob: Job = {
      id: generateId("job"),
      name: input.name,
      templateId: input.templateId,
      sourceEntity: input.sourceEntity,
      targetEntity: input.targetEntity,
      sourceCount: input.sourceCount,
      targetCount: input.targetCount,
      status: input.status ?? "Queued",
      createdAt: new Date().toISOString().split("T")[0],
      notes: input.notes,
    };

    const generatedMatches = generateMatchesForJob(newJob);

    setJobs((current) => [newJob, ...current]);
    setMatches((current) => [...generatedMatches, ...current]);

    return { job: newJob, matches: generatedMatches };
  }, []);

  const updateJob = useCallback(async (id: string, input: JobUpdate) => {
    await wait();

    let updatedJob: Job | null = null;

    setJobs((current) =>
      current.map((job) => {
        if (job.id !== id) {
          return job;
        }

        updatedJob = {
          ...job,
          ...input,
          status: input.status ?? job.status,
        };

        return updatedJob;
      }),
    );

    return updatedJob;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    await wait();

    setJobs((current) => current.filter((job) => job.id !== id));
    setMatches((current) => current.filter((match) => match.jobId !== id));
  }, []);

  const createMatch = useCallback(async (input: MatchInput) => {
    await wait();

    const newMatch: Match = {
      id: generateId("mtch"),
      ...input,
    };

    setMatches((current) => [newMatch, ...current]);

    return newMatch;
  }, []);

  const updateMatch = useCallback(async (id: string, input: MatchUpdate) => {
    await wait();

    let updatedMatch: Match | null = null;

    setMatches((current) =>
      current.map((match) => {
        if (match.id !== id) {
          return match;
        }

        updatedMatch = {
          ...match,
          ...input,
        };

        return updatedMatch;
      }),
    );

    return updatedMatch;
  }, []);

  const deleteMatch = useCallback(async (id: string) => {
    await wait();

    setMatches((current) => current.filter((match) => match.id !== id));
  }, []);

  const value = useMemo<MatchingContextValue>(
    () => ({
      templates,
      jobs,
      matches,
      entities: entityOptions,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createJob,
      updateJob,
      deleteJob,
      createMatch,
      updateMatch,
      deleteMatch,
    }),
    [createJob, createMatch, createTemplate, deleteJob, deleteMatch, deleteTemplate, jobs, matches, templates, updateJob, updateMatch, updateTemplate],
  );

  return <MatchingContext.Provider value={value}>{children}</MatchingContext.Provider>;
}

export function useMatchingContext() {
  const context = useContext(MatchingContext);

  if (!context) {
    throw new Error("useMatchingContext must be used within a MatchingProvider");
  }

  return context;
}
