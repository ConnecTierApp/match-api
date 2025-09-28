"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { entityOptions as legacyEntityOptions } from "@/mocks/matching-data";
import { fallbackEntityTypeLabel, normalizeEntityTypeSlug } from "@/modules/entity-types/lib/format";
import { useEntityTypes as useWorkspaceEntityTypes } from "@/modules/entity-types/hooks/use-entity-types";
import { useWorkspaceContext } from "@/modules/workspaces/components/workspace-provider/workspace-provider";
import { fetchEntitiesWithDocuments } from "@/modules/entities/lib/api";
import { Entity } from "@/types/matching";

export interface EntityTypeOption {
  id: string;
  slug: string;
  label: string;
  description: string;
}

const ENTITIES_KEY = "entities-with-documents";

export function useEntityOptions() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceSlug = currentWorkspace?.slug ?? null;
  const {
    data: entityTypes,
    isLoading,
    error,
    mutate,
  } = useWorkspaceEntityTypes(workspaceSlug);

  const usingFallback = entityTypes.length === 0;

  const options = useMemo<EntityTypeOption[]>(() => {
    if (!usingFallback) {
      return entityTypes.map((entityType) => ({
        id: entityType.id,
        slug: entityType.slug,
        label: fallbackEntityTypeLabel(entityType.slug, entityType.displayName),
        description: entityType.description,
      }));
    }

    return legacyEntityOptions.map((legacyLabel) => {
      const slug = normalizeEntityTypeSlug(legacyLabel);
      return {
        id: `legacy-${slug}`,
        slug,
        label: legacyLabel,
        description: "",
      };
    });
  }, [entityTypes, usingFallback]);

  return {
    data: entityTypes,
    options,
    isLoading,
    error,
    mutate,
    usingFallback,
  } as const;
}

export function useEntities() {
  const { data, error, isLoading, mutate } = useSWR<Entity[]>(ENTITIES_KEY, fetchEntitiesWithDocuments, {
    revalidateOnFocus: false,
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  } as const;
}

export { ENTITIES_KEY };
