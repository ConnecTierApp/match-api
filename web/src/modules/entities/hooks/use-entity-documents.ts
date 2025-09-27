"use client";

import { useMemo } from "react";

import { EntityDocument } from "@/types/matching";
import { useEntities } from "./use-entities";

export function useEntityDocuments(entityId?: string | null) {
  const { data, isLoading } = useEntities();

  const documents = useMemo<EntityDocument[]>(() => {
    if (!entityId) {
      return [];
    }

    return data.find((entity) => entity.id === entityId)?.documents ?? [];
  }, [data, entityId]);

  return {
    data: documents,
    isLoading,
    error: null,
  } as const;
}
