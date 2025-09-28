"use client";

import useSWR from "swr";

import { fetchEntityTypes } from "@/modules/entity-types/lib/api";
import { EntityTypeDefinition } from "@/types/matching";

const ENTITY_TYPES_KEY = "entity-types";

export function useEntityTypes(workspaceSlug: string | null) {
  const shouldFetch = Boolean(workspaceSlug);
  const { data, error, isLoading, mutate } = useSWR<EntityTypeDefinition[] | undefined>(
    shouldFetch ? [ENTITY_TYPES_KEY, workspaceSlug] : null,
    () => fetchEntityTypes(workspaceSlug as string),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: data ?? [],
    isLoading: shouldFetch ? Boolean(isLoading && !data) : false,
    error,
    mutate,
  } as const;
}

export { ENTITY_TYPES_KEY };
