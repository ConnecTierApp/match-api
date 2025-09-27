"use client";

import { FormEvent, useState } from "react";
import { Check, Edit, FileText, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityDocument, EntityDocumentInput } from "@/types/matching";

interface EntityDocumentsCardProps {
  documents: EntityDocument[];
  isLoading: boolean;
  onUpdateDocument: (documentId: string, input: EntityDocumentInput) => Promise<void> | void;
  onDeleteDocument: (documentId: string) => Promise<void> | void;
}

const emptyDraft: EntityDocumentInput = {
  title: "",
  content: "",
  tags: [],
};

export function EntityDocumentsCard({
  documents,
  isLoading,
  onUpdateDocument,
  onDeleteDocument,
}: EntityDocumentsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EntityDocumentInput>(emptyDraft);
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = (document: EntityDocument) => {
    setEditingId(document.id);
    setDraft({
      title: document.title,
      content: document.content,
      tags: document.tags,
    });
    setTagsInput(document.tags.join(", "));
  };

  const stopEditing = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setTagsInput("");
    setIsSaving(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, documentId: string) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      await onUpdateDocument(documentId, {
        title: draft.title,
        content: draft.content,
        tags: parseTags(tagsInput),
      });
      stopEditing();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    await onDeleteDocument(documentId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
        <CardDescription>All knowledge linked to this entity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Loading documents…
          </div>
        ) : null}

        {documents.map((document) => {
          const isEditingCurrent = editingId === document.id;
          return (
            <div key={document.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs uppercase tracking-wide">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              {isEditingCurrent ? (
                <form className="mt-3 grid gap-3" onSubmit={(event) => handleSubmit(event, document.id)}>
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <Input
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="Comma-separated tags"
                  />
                  <Textarea
                    rows={4}
                    value={draft.content}
                    onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={isSaving} className="gap-1">
                      <Check className="h-4 w-4" /> Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={stopEditing}>
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{document.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{document.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => startEditing(document)}
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(document.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {!isLoading && documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            No documents yet — attach research, briefs, or interview notes to give match reviewers more context.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
