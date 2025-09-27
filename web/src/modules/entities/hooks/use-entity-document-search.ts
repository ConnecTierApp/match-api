"use client";

import { useMemo } from "react";

import { Entity, EntityDocument } from "@/types/matching";
import { useEntities } from "./use-entities";

interface EntityDocumentSearchResult {
  entity: Entity;
  document: EntityDocument;
}

export function useEntityDocumentSearch(query: string, options?: { entityId?: string; tags?: string[] }) {
  const { data: entities, isLoading } = useEntities();

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedEntityId = options?.entityId ?? "";
  const tags = options?.tags ?? [];
  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  const results = useMemo<EntityDocumentSearchResult[]>(() => {
    return entities
      .filter((entity) => (normalizedEntityId ? entity.id === normalizedEntityId : true))
      .flatMap((entity) => {
        const entityName = entity.name.toLowerCase();

        return entity.documents
          .filter((document) => {
            const tagsLower = document.tags.map((tag) => tag.toLowerCase());

            const matchesTags =
              normalizedTags.length === 0 ||
              normalizedTags.every((tag) => tagsLower.includes(tag));

            if (!matchesTags) {
              return false;
            }

            if (!normalizedQuery) {
              return true;
            }

            const title = document.title.toLowerCase();
            const content = document.content.toLowerCase();

            return (
              title.includes(normalizedQuery) ||
              content.includes(normalizedQuery) ||
              entityName.includes(normalizedQuery) ||
              tagsLower.some((tag) => tag.includes(normalizedQuery))
            );
          })
          .map((document) => ({ entity, document }));
      })
      .sort((a, b) => Date.parse(b.document.uploadedAt) - Date.parse(a.document.uploadedAt));
  }, [entities, normalizedEntityId, normalizedQuery, normalizedTags]);

  return {
    data: results,
    isLoading,
  } as const;
}
