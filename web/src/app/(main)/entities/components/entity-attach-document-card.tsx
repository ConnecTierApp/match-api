"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntityDocumentInput } from "@/types/matching";

interface EntityAttachDocumentCardProps {
  onAttach: (input: EntityDocumentInput) => Promise<void> | void;
}

const initialDocument: EntityDocumentInput = {
  title: "",
  content: "",
  tags: [],
  source: "",
};

export function EntityAttachDocumentCard({ onAttach }: EntityAttachDocumentCardProps) {
  const [draft, setDraft] = useState(initialDocument);
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAttach({
        title: draft.title,
        content: draft.content,
        tags: parseTags(tagsInput),
        source: normalizeSource(draft.source),
      });
      setDraft(initialDocument);
      setTagsInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="documents">
      <CardHeader>
        <CardTitle>Attach new document</CardTitle>
        <CardDescription>Store briefs, personas, or research notes that inform matching quality.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="document-title">Title</Label>
            <Input
              id="document-title"
              placeholder="E.g. Persona brief, Market mapping"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="document-tags">Tags</Label>
            <Input
              id="document-tags"
              placeholder="Comma-separated tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="document-source">Source URL</Label>
            <Input
              id="document-source"
              type="url"
              placeholder="https://"
              value={draft.source ?? ""}
              onChange={(event) => setDraft((prev) => ({ ...prev, source: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="document-content">Content</Label>
            <Textarea
              id="document-content"
              rows={5}
              placeholder="Paste the relevant section of the brief or narrative here."
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
            />
          </div>
          <CardFooter className="px-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Attaching..." : "Attach document"}
            </Button>
          </CardFooter>
        </form>
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

function normalizeSource(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
