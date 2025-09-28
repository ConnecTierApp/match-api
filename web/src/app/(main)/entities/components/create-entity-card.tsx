"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EntityTypeOption } from "@/modules/entities/hooks/use-entities";
import { EntityInput } from "@/types/matching";

interface CreateEntityCardProps {
  entityOptions: EntityTypeOption[];
  isLoadingEntityTypes: boolean;
  disableSelection?: boolean;
  onSubmit: (input: EntityInput) => Promise<void> | void;
}

const initialDraft: EntityInput = {
  name: "",
  type: "",
  summary: "",
};

export function CreateEntityCard({
  entityOptions,
  isLoadingEntityTypes,
  disableSelection = false,
  onSubmit,
}: CreateEntityCardProps) {
  const [draft, setDraft] = useState<EntityInput>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultType = useMemo(() => entityOptions[0]?.slug ?? "", [entityOptions]);
  const hasEntityTypes = entityOptions.length > 0 && !disableSelection;

  useEffect(() => {
    if (!hasEntityTypes) {
      return;
    }

    setDraft((previous) => {
      if (previous.type) {
        return previous;
      }
      return { ...previous, type: defaultType as EntityInput["type"] };
    });
  }, [defaultType, hasEntityTypes]);

  const isValid = hasEntityTypes && Boolean(draft.name.trim()) && Boolean(draft.type);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(draft);
      setDraft((prev) => ({
        ...initialDraft,
        type: prev.type || (defaultType as EntityInput["type"]),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="create-entity">
      <CardHeader>
        <CardTitle>Register a new entity</CardTitle>
        <CardDescription>
          Add teams, talent pools, or opportunity sets that will power downstream matching.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              placeholder="E.g. Staff ML Engineers, Revenue Leadership Bench"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select
              value={draft.type}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, type: value as EntityInput["type"] }))
              }
              disabled={!hasEntityTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEntityTypes ? "Loading…" : "Select entity type"} />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.slug}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasEntityTypes && !isLoadingEntityTypes ? (
              <p className="text-xs text-muted-foreground">
                Create an entity type first to categorize new entities.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="entity-summary">Summary</Label>
            <Textarea
              id="entity-summary"
              rows={4}
              placeholder="Capture core attributes, current status, or matching guidance for this entity."
              value={draft.summary}
              onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </div>
          <CardFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Creating..." : "Create entity"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
