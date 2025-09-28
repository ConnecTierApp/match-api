"use client";

import { DocumentsSearchCard } from "./components/documents-search-card";
import { EntitiesListCard } from "./components/entities-list-card";
import { CreateEntityCard } from "./components/create-entity-card";
import { useEntities, useEntityOptions } from "@/modules/entities/hooks/use-entities";
import { useEntityMutations } from "@/modules/entities/hooks/use-entity-mutations";

export default function EntitiesPage() {
  const { data: entities, isLoading } = useEntities();
  const {
    options: entityTypeOptions,
    isLoading: isLoadingEntityTypes,
    usingFallback,
  } = useEntityOptions();
  const { createEntity, deleteEntity } = useEntityMutations();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-6">
        <DocumentsSearchCard />
        <EntitiesListCard
          entities={entities}
          entityTypeOptions={entityTypeOptions}
          isLoading={isLoading}
          onDelete={deleteEntity}
        />
      </div>
      <CreateEntityCard
        entityOptions={entityTypeOptions}
        isLoadingEntityTypes={isLoadingEntityTypes}
        disableSelection={usingFallback}
        onSubmit={createEntity}
      />
    </div>
  );
}
