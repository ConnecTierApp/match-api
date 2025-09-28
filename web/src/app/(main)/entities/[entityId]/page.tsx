"use client";

import { useParams, useRouter } from "next/navigation";

import { EntityAttachDocumentCard } from "../components/entity-attach-document-card";
import { EntityDocumentsCard } from "../components/entity-documents-card";
import { EntitySummaryCard } from "../components/entity-summary-card";
import { useEntity } from "@/modules/entities/hooks/use-entity";
import { useEntityDocuments } from "@/modules/entities/hooks/use-entity-documents";
import { useEntityMutations } from "@/modules/entities/hooks/use-entity-mutations";
import { EntityDocumentInput } from "@/types/matching";

export default function EntityDetailPage() {
  const params = useParams<{ entityId: string }>();
  const router = useRouter();
  const entity = useEntity(params.entityId);
  const { data: documents, isLoading: isLoadingDocuments } = useEntityDocuments(params.entityId);
  const { updateEntity, deleteEntity, attachDocument, updateDocument, deleteDocument } = useEntityMutations();

  if (!entity) {
    return (
      <div className="rounded-lg border border-border/70 bg-card p-6 text-sm text-muted-foreground">
        Loading entity…
      </div>
    );
  }

  const handleSummaryUpdate = async (summary: string) => {
    await updateEntity(entity.id, { summary });
  };

  const handleDeleteEntity = async () => {
    await deleteEntity(entity.id);
    router.push("/entities");
  };

  const handleAttachDocument = async (input: EntityDocumentInput) => {
    await attachDocument(entity.id, input);
  };

  const handleUpdateDocument = async (documentId: string, input: EntityDocumentInput) => {
    await updateDocument(entity.id, documentId, input);
  };

  const handleDeleteDocument = async (documentId: string) => {
    await deleteDocument(entity.id, documentId);
  };

  return (
    <div className="grid gap-6">
      <EntitySummaryCard entity={entity} onUpdateSummary={handleSummaryUpdate} onDelete={handleDeleteEntity} />
      <EntityAttachDocumentCard onAttach={handleAttachDocument} />
      <EntityDocumentsCard
        documents={documents}
        isLoading={isLoadingDocuments}
        onUpdateDocument={handleUpdateDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}
