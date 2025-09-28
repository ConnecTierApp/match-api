"use client";

import { useCallback } from "react";

import { CreateEntityTypeCard } from "./_components/create-entity-type-card";
import { EntityTypesListCard } from "./_components/entity-types-list-card";
import { useEntityTypes } from "@/modules/entity-types/hooks/use-entity-types";
import { useEntityTypeMutations } from "@/modules/entity-types/hooks/use-entity-type-mutations";
import { useWorkspaceContext } from "@/modules/workspaces/components/workspace-provider/workspace-provider";
import { EntityTypeInput } from "@/types/matching";

export default function EntityTypesPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceSlug = currentWorkspace?.slug ?? null;

  const { data: entityTypes, isLoading } = useEntityTypes(workspaceSlug);
  const { createEntityType } = useEntityTypeMutations(workspaceSlug);

  const handleCreate = useCallback(
    async (input: EntityTypeInput) => {
      await createEntityType(input);
    },
    [createEntityType],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <EntityTypesListCard entityTypes={entityTypes} />
      <CreateEntityTypeCard onCreate={handleCreate} disableForm={!workspaceSlug || isLoading} />
    </div>
  );
}
