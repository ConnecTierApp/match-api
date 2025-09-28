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
import { normalizeEntityTypeSlug } from "@/modules/entity-types/lib/format";
import { EntityTypeInput } from "@/types/matching";

interface CreateEntityTypeCardProps {
  onCreate: (input: EntityTypeInput) => Promise<void> | void;
  disableForm?: boolean;
}

const initialDraft: EntityTypeInput = {
  slug: "",
  displayName: "",
  description: "",
  metadata: {},
};

export function CreateEntityTypeCard({ onCreate, disableForm = false }: CreateEntityTypeCardProps) {
  const [draft, setDraft] = useState<EntityTypeInput>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = Boolean(draft.slug.trim());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid || disableForm) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        slug: draft.slug.trim(),
        displayName: draft.displayName?.trim() || undefined,
        description: draft.description?.trim() || undefined,
        metadata: draft.metadata,
      });
      setDraft(initialDraft);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="create-entity-type">
      <CardHeader>
        <CardTitle>Create entity type</CardTitle>
        <CardDescription>Define reusable labels to group entities for matching templates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="entity-type-name">Display name</Label>
            <Input
              id="entity-type-name"
              placeholder="Example: Candidates"
              value={draft.displayName}
              disabled={disableForm}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((previous) => ({
                  ...previous,
                  displayName: value,
                  slug: previous.slug || normalizeEntityTypeSlug(value),
                }));
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="entity-type-slug">Slug</Label>
            <Input
              id="entity-type-slug"
              placeholder="candidates"
              value={draft.slug}
              disabled={disableForm}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  slug: normalizeEntityTypeSlug(event.target.value),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">Lowercase identifier used in URLs and templates.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="entity-type-description">Description</Label>
            <Textarea
              id="entity-type-description"
              placeholder="Optional context for teammates."
              value={draft.description}
              disabled={disableForm}
              rows={3}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <CardFooter className="px-0">
            <Button type="submit" className="w-full sm:w-auto" disabled={disableForm || !isValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save entity type"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
