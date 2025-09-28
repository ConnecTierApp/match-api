"use client";

import { useSWRConfig } from "swr";

import { ENTITIES_KEY } from "@/modules/entities/hooks/use-entities";
import { JOBS_KEY } from "@/modules/jobs/hooks/use-jobs";
import {
  createJobApi,
  deleteJobApi,
  fetchJob,
  updateJobApi,
} from "@/modules/jobs/lib/api";
import { MATCHES_KEY } from "@/modules/matches/hooks/use-matches";
import { JobInput, JobUpdate } from "@/types/matching";
import type { JobConfig, UpdateJobPayload } from "@/modules/jobs/lib/api";

export function useJobMutations() {
  const { mutate } = useSWRConfig();

  const createJob = async (input: JobInput) => {
    const displayName = input.displayName.trim() ? input.displayName.trim() : `${input.templateId} job`;

    const configOverride = buildJobConfigFromInput({
      ...input,
      displayName,
    });

    await createJobApi({
      templateId: input.templateId,
      sourceEntityId: input.sourceEntityId,
      status: input.status ?? "Queued",
      configOverride,
    });

    await Promise.all([mutate(JOBS_KEY), mutate(ENTITIES_KEY)]);
  };

  const updateJob = async (id: string, input: JobUpdate) => {
    const payload: UpdateJobPayload = {};

    if (input.status) {
      payload.status = input.status;
    }

    if (hasConfigUpdates(input)) {
      const existing = await fetchJob(id);
      const existingConfig = (existing.config_override ?? {}) as JobConfig;
      payload.configOverride = mergeJobConfig(existingConfig, input);
    }

    await updateJobApi(id, payload);
    await mutate(JOBS_KEY);
  };

  const deleteJob = async (id: string) => {
    await deleteJobApi(id);
    await Promise.all([mutate(JOBS_KEY), mutate(MATCHES_KEY)]);
  };

  return {
    createJob,
    updateJob,
    deleteJob,
  } as const;
}

function buildJobConfigFromInput(input: JobInput & { displayName: string }): JobConfig {
  const config: JobConfig = {
    display_name: input.displayName,
    target_entity_type: input.targetEntityType,
  };

  if (input.notes) {
    config.notes = input.notes;
  }

  if (input.searchCriteria && input.searchCriteria.length) {
    config.search_criteria = input.searchCriteria.map((criterion) => ({
      label: criterion.label,
      prompt: criterion.prompt,
      weight: criterion.weight ?? 1,
      guidance: criterion.guidance,
      source_snippet_limit: criterion.sourceLimit ?? 3,
      target_snippet_limit: criterion.targetLimit ?? 3,
      ...(criterion.id ? { id: criterion.id } : {}),
    }));
  }

  return config;
}

function hasConfigUpdates(input: JobUpdate) {
  return (
    input.displayName !== undefined ||
    input.targetEntityType !== undefined ||
    input.notes !== undefined ||
    input.searchCriteria !== undefined
  );
}

function mergeJobConfig(existing: JobConfig, updates: JobUpdate): JobConfig {
  const next: JobConfig = { ...existing };

  if (updates.displayName !== undefined) {
    next.display_name = updates.displayName;
  }
  if (updates.targetEntityType !== undefined) {
    next.target_entity_type = updates.targetEntityType;
  }
  if (updates.notes !== undefined) {
    if (updates.notes) {
      next.notes = updates.notes;
    } else {
      delete next.notes;
    }
  }
  if (updates.searchCriteria !== undefined) {
    if (updates.searchCriteria && updates.searchCriteria.length) {
      next.search_criteria = updates.searchCriteria.map((criterion) => ({
        label: criterion.label,
        prompt: criterion.prompt,
        weight: criterion.weight ?? 1,
        guidance: criterion.guidance,
        source_snippet_limit: criterion.sourceLimit ?? 3,
        target_snippet_limit: criterion.targetLimit ?? 3,
        ...(criterion.id ? { id: criterion.id } : {}),
      }));
    } else {
      delete next.search_criteria;
    }
  }

  return next;
}
