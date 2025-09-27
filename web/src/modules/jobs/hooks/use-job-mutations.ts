"use client";

import { useSWRConfig } from "swr";

import { ENTITIES_KEY } from "@/modules/entities/hooks/use-entities";
import { createEntityApi } from "@/modules/entities/lib/api";
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
    const displayName = input.name.trim() ? input.name.trim() : `${input.templateId} job`;

    const sourceEntity = await createEntityApi({
      name: displayName,
      summary: input.notes ?? `Auto-generated source entity for ${displayName}`,
      type: input.sourceEntity,
    });

    const configOverride = buildJobConfigFromInput({
      ...input,
      name: displayName,
    });

    await createJobApi({
      templateId: input.templateId,
      sourceEntityId: sourceEntity.id,
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

function buildJobConfigFromInput(input: JobInput): JobConfig {
  const config: JobConfig = {
    display_name: input.name,
    source_entity_type: input.sourceEntity,
    target_entity_type: input.targetEntity,
    source_count: input.sourceCount,
    target_count: input.targetCount,
  };

  if (input.notes) {
    config.notes = input.notes;
  }

  return config;
}

function hasConfigUpdates(input: JobUpdate) {
  return (
    input.name !== undefined ||
    input.sourceEntity !== undefined ||
    input.targetEntity !== undefined ||
    input.sourceCount !== undefined ||
    input.targetCount !== undefined ||
    input.notes !== undefined
  );
}

function mergeJobConfig(existing: JobConfig, updates: JobUpdate): JobConfig {
  const next: JobConfig = { ...existing };

  if (updates.name !== undefined) {
    next.display_name = updates.name;
  }
  if (updates.sourceEntity !== undefined) {
    next.source_entity_type = updates.sourceEntity;
  }
  if (updates.targetEntity !== undefined) {
    next.target_entity_type = updates.targetEntity;
  }
  if (updates.sourceCount !== undefined) {
    next.source_count = updates.sourceCount;
  }
  if (updates.targetCount !== undefined) {
    next.target_count = updates.targetCount;
  }
  if (updates.notes !== undefined) {
    if (updates.notes) {
      next.notes = updates.notes;
    } else {
      delete next.notes;
    }
  }

  return next;
}
