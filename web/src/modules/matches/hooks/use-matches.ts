"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { useEntities } from "@/modules/entities/hooks/use-entities";
import { fetchMatches, mapApiMatch } from "@/modules/matches/lib/api";
import type { MatchesResponse, ApiMatchFeature } from "@/modules/matches/lib/api";
import { Match } from "@/types/matching";

const MATCHES_KEY = "matches";

export function useMatches() {
  const { data: response, error, isLoading, mutate } = useSWR<MatchesResponse>(MATCHES_KEY, fetchMatches, {
    revalidateOnFocus: false,
  });

  const { data: entities } = useEntities();

  const entitiesById = useMemo(() => {
    return new Map(entities.map((entity) => [entity.id, entity]));
  }, [entities]);

  const statusFeatures = useMemo(() => {
    if (!response) {
      return new Map<string, ApiMatchFeature>();
    }

    const featureMap = new Map<string, ApiMatchFeature>();
    response.features.forEach((feature) => {
      if (feature.label === "status") {
        featureMap.set(feature.match, feature);
      }
    });
    return featureMap;
  }, [response]);

  const matches = useMemo<Match[]>(() => {
    if (!response) {
      return [];
    }

    return response.matches.map((match) =>
      mapApiMatch(match, {
        sourceEntity: entitiesById.get(match.source_entity) ?? null,
        targetEntity: entitiesById.get(match.target_entity) ?? null,
        statusFeature: statusFeatures.get(match.id) ?? null,
      }),
    );
  }, [response, entitiesById, statusFeatures]);

  return {
    data: matches,
    isLoading,
    error,
    mutate,
  } as const;
}

export { MATCHES_KEY };
