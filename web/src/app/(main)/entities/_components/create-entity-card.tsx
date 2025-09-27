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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EntityInput } from "@/types/matching";

interface CreateEntityCardProps {
  entityOptions: string[];
  onSubmit: (input: EntityInput) => Promise<void> | void;
}

const initialDraft: EntityInput = {
  name: "",
  type: "Candidates",
  summary: "",
};

export function CreateEntityCard({ entityOptions, onSubmit }: CreateEntityCardProps) {
  const [draft, setDraft] = useState<EntityInput>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(draft);
      setDraft((prev) => ({ ...initialDraft, type: prev.type }));
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create entity"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
