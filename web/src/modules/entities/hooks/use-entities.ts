"use client";

import useSWR from "swr";

import { entityOptions } from "@/mocks/matching-data";
import { fetchEntitiesWithDocuments } from "@/modules/entities/lib/api";
import { Entity } from "@/types/matching";

const ENTITIES_KEY = "entities-with-documents";

export function useEntityOptions() {
  return entityOptions;
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
