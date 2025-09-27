"use client";

import { FormEvent, useState } from "react";
import { Check, Edit, FileText, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
import { MarkdownRenderer } from "@/components/markdown-renderer";

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
      <CardHeader className="gap-2 border-b border-border/60 pb-4">
        <CardTitle>Documents ({documents.length})</CardTitle>
        <CardDescription>All knowledge linked to this entity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Loading documents…
          </div>
        ) : null}

        {documents.map((document) => {
          const isEditingCurrent = editingId === document.id;
          return (
            <div
              key={document.id}
              className="w-full rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm shadow-black/[0.02] transition hover:border-border"
            >
              {isEditingCurrent ? (
                <form className="grid gap-5" onSubmit={(event) => handleSubmit(event, document.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="whitespace-nowrap">{new Date(document.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <Input
                        value={draft.title}
                        onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                        className="h-11 min-w-0"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button type="submit" size="sm" disabled={isSaving} className="gap-1">
                        <Check className="h-4 w-4" /> Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={stopEditing}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <Input
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                      placeholder="Comma-separated tags"
                      className="min-w-0"
                    />
                    <Textarea
                      rows={6}
                      value={draft.content}
                      onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                      className="min-h-[180px]"
                    />
                  </div>
                </form>
              ) : (
                <div className="grid gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="whitespace-nowrap">{new Date(document.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-lg font-semibold leading-tight text-foreground">
                        <span className="break-words [overflow-wrap:anywhere]">{document.title}</span>
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                  </div>
                  {document.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {document.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="max-w-full break-words rounded-full border-border/50 bg-muted/30 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground [overflow-wrap:anywhere]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="text-sm leading-relaxed text-muted-foreground/90 overflow-x-scroll markdown-content">
                    <MarkdownRenderer content={document.content} />
                  </div>
                </div>
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
