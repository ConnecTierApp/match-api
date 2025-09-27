"use client";

import { useSWRConfig } from "swr";

import { ENTITIES_KEY } from "@/modules/entities/hooks/use-entities";
import {
  createDocumentApi,
  createEntityApi,
  deleteDocumentApi,
  deleteEntityApi,
  updateDocumentApi,
  updateEntityApi,
  formatRelativeTime,
} from "@/modules/entities/lib/api";
import { Entity, EntityDocumentInput, EntityInput, EntityUpdate } from "@/types/matching";

export function useEntityMutations() {
  const { mutate } = useSWRConfig();

  const createEntity = async (input: EntityInput) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        const created = await createEntityApi(input);
        if (!current) {
          return [created];
        }
        return [created, ...current];
      },
      false,
    );
  };

  const updateEntity = async (id: string, input: EntityUpdate) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        if (!current) {
          return current;
        }

        const existing = current.find((entity) => entity.id === id);
        if (!existing) {
          return current;
        }

        const updated = await updateEntityApi(id, input, existing);
        return current.map((entity) =>
          entity.id === id
            ? {
                ...updated,
                documents: entity.documents,
              }
            : entity,
        );
      },
      false,
    );
  };

  const deleteEntity = async (id: string) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        await deleteEntityApi(id);
        if (!current) {
          return current;
        }
        return current.filter((entity) => entity.id !== id);
      },
      false,
    );
  };

  const attachDocument = async (entityId: string, input: EntityDocumentInput) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        const created = await createDocumentApi(entityId, input);
        if (!current) {
          return current;
        }

        return current.map((entity) =>
          entity.id === entityId
            ? {
                ...entity,
                documents: [created, ...entity.documents],
                lastUpdated: formatRelativeTime(created.uploadedAt),
                updatedAt: created.uploadedAt,
              }
            : entity,
        );
      },
      false,
    );
  };

  const updateDocument = async (entityId: string, documentId: string, input: EntityDocumentInput) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        if (!current) {
          return current;
        }

        const entity = current.find((item) => item.id === entityId);
        const existingDoc = entity?.documents.find((doc) => doc.id === documentId);

        const payload: EntityDocumentInput = {
          title: input.title ?? existingDoc?.title ?? "",
          content: input.content ?? existingDoc?.content ?? "",
          tags: input.tags ?? existingDoc?.tags ?? [],
        };

        const updated = await updateDocumentApi(documentId, payload);

        return current.map((item) =>
          item.id === entityId
            ? {
                ...item,
                documents: item.documents.map((doc) => (doc.id === documentId ? updated : doc)),
                lastUpdated: formatRelativeTime(updated.uploadedAt),
                updatedAt: updated.uploadedAt,
              }
            : item,
        );
      },
      false,
    );
  };

  const deleteDocument = async (entityId: string, documentId: string) => {
    await mutate(
      ENTITIES_KEY,
      async (current: Entity[] | undefined) => {
        await deleteDocumentApi(documentId);
        if (!current) {
          return current;
        }
        const updatedAt = new Date().toISOString();
        return current.map((entity) =>
          entity.id === entityId
            ? {
                ...entity,
                documents: entity.documents.filter((doc) => doc.id !== documentId),
                lastUpdated: formatRelativeTime(updatedAt),
                updatedAt,
              }
            : entity,
        );
      },
      false,
    );
  };

  return {
    createEntity,
    updateEntity,
    deleteEntity,
    attachDocument,
    updateDocument,
    deleteDocument,
  } as const;
}
