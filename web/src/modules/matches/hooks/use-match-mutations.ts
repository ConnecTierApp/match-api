"use client";

import { useSWRConfig } from "swr";

import { ENTITIES_KEY } from "@/modules/entities/hooks/use-entities";
import { createEntityApi, updateEntityApi } from "@/modules/entities/lib/api";
import { fetchJob } from "@/modules/jobs/lib/api";
import { MATCHES_KEY } from "@/modules/matches/hooks/use-matches";
import {
  createMatchApi,
  deleteMatchApi,
  fetchMatch,
  updateMatchApi,
} from "@/modules/matches/lib/api";
import { EntityType, MatchInput, MatchUpdate } from "@/types/matching";

export function useMatchMutations() {
  const { mutate } = useSWRConfig();

  const createMatch = async (input: MatchInput) => {
    const job = await fetchJob(input.jobId);
    const config = (job.config_override ?? {}) as Record<string, unknown>;

    const sourceEntityType = resolveEntityType(config.source_entity_type, "Candidates");
    const targetEntityType = resolveEntityType(config.target_entity_type, "Roles");

    const sourceEntity = await createEntityApi({
      name: input.sourceName || `${sourceEntityType} candidate`,
      summary: input.summary,
      type: sourceEntityType,
    });

    const targetEntity = await createEntityApi({
      name: input.targetName || `${targetEntityType} target`,
      summary: input.summary,
      type: targetEntityType,
    });

    await createMatchApi({
      jobId: input.jobId,
      sourceEntityId: sourceEntity.id,
      targetEntityId: targetEntity.id,
      score: input.score,
      summary: input.summary,
      status: input.status,
    });

    await Promise.all([mutate(MATCHES_KEY), mutate(ENTITIES_KEY)]);
  };

  const updateMatch = async (id: string, input: MatchUpdate) => {
    const existing = await fetchMatch(id);
    const job = await fetchJob(existing.matching_job);
    const config = (job.config_override ?? {}) as Record<string, unknown>;

    const sourceEntityType = resolveEntityType(config.source_entity_type, "Candidates");
    const targetEntityType = resolveEntityType(config.target_entity_type, "Roles");

    if (input.sourceName) {
      await updateEntityApi(existing.source_entity, {
        name: input.sourceName,
        type: sourceEntityType,
        summary: input.summary,
      });
    }

    if (input.targetName) {
      await updateEntityApi(existing.target_entity, {
        name: input.targetName,
        type: targetEntityType,
        summary: input.summary,
      });
    }

    await updateMatchApi(id, {
      score: input.score,
      summary: input.summary,
      status: input.status,
    });

    await Promise.all([mutate(MATCHES_KEY), mutate(ENTITIES_KEY)]);
  };

  const deleteMatch = async (id: string) => {
    await deleteMatchApi(id);
    await mutate(MATCHES_KEY);
  };

  return {
    createMatch,
    updateMatch,
    deleteMatch,
  } as const;
}

function resolveEntityType(value: unknown, fallback: EntityType): EntityType {
  if (typeof value === "string" && value.trim()) {
    return value as EntityType;
  }
  return fallback;
}
