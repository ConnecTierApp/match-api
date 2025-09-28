"use client";

import { useSWRConfig } from "swr";

import {
  createEntityTypeApi,
  deleteEntityTypeApi,
  updateEntityTypeApi,
} from "@/modules/entity-types/lib/api";
import { ENTITY_TYPES_KEY } from "@/modules/entity-types/hooks/use-entity-types";
import { EntityTypeDefinition, EntityTypeInput, EntityTypeUpdate } from "@/types/matching";

export function useEntityTypeMutations(workspaceSlug: string | null) {
  const { mutate } = useSWRConfig();

  const ensureWorkspace = () => {
    if (!workspaceSlug) {
      throw new Error("Workspace is required to mutate entity types.");
    }
    return workspaceSlug;
  };

  const createEntityType = async (input: EntityTypeInput) => {
    const slug = ensureWorkspace();

    await mutate(
      [ENTITY_TYPES_KEY, slug],
      async (current: EntityTypeDefinition[] | undefined) => {
        const created = await createEntityTypeApi(slug, input);
        if (!current) {
          return [created];
        }
        return [created, ...current];
      },
      false,
    );
  };

  const updateEntityType = async (id: string, input: EntityTypeUpdate) => {
    const slug = ensureWorkspace();

    await mutate(
      [ENTITY_TYPES_KEY, slug],
      async (current: EntityTypeDefinition[] | undefined) => {
        if (!current) {
          return current;
        }
        const updated = await updateEntityTypeApi(id, input);
        return current.map((entityType) => (entityType.id === id ? updated : entityType));
      },
      false,
    );
  };

  const deleteEntityType = async (id: string) => {
    const slug = ensureWorkspace();

    await mutate(
      [ENTITY_TYPES_KEY, slug],
      async (current: EntityTypeDefinition[] | undefined) => {
        await deleteEntityTypeApi(id);
        if (!current) {
          return current;
        }
        return current.filter((entityType) => entityType.id !== id);
      },
      false,
    );
  };

  return {
    createEntityType,
    updateEntityType,
    deleteEntityType,
  } as const;
}
