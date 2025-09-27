"use client";

import { useMemo } from "react";

import { useEntities } from "./use-entities";

export function useEntity(entityId?: string | null) {
  const { data } = useEntities();

  return useMemo(() => {
    if (!entityId) {
      return null;
    }

    return data.find((entity) => entity.id === entityId) ?? null;
  }, [data, entityId]);
}
