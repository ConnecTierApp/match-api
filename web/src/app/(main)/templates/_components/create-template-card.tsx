"use client";

import { FormEvent, useState } from "react";
import { PlusCircle } from "lucide-react";

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
import { TemplateInput } from "@/types/matching";

interface CreateTemplateCardProps {
  entityOptions: string[];
  onCreate: (input: TemplateInput) => Promise<void> | void;
}

const initialDraft: TemplateInput = {
  name: "",
  description: "",
  scoringStrategy: "Hybrid semantic + rule weighting",
  defaultSource: "Candidates",
  defaultTarget: "Roles",
};

export function CreateTemplateCard({ entityOptions, onCreate }: CreateTemplateCardProps) {
  const [draft, setDraft] = useState<TemplateInput>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(draft);
      setDraft((prev) => ({
        ...initialDraft,
        scoringStrategy: prev.scoringStrategy,
        defaultSource: prev.defaultSource,
        defaultTarget: prev.defaultTarget,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="create-template">
      <CardHeader>
        <CardTitle>Create a template</CardTitle>
        <CardDescription>
          Capture the reusable criteria to score how two entity types should connect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              placeholder="Senior Product Managers ↔ Open Roles"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-description">Intent & scoring notes</Label>
            <Textarea
              id="template-description"
              placeholder="Outline how to evaluate fit: skill vectors, recency, team overlap, etc."
              value={draft.description}
              rows={4}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Source entity</Label>
              <Select
                value={draft.defaultSource}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, defaultSource: value as TemplateInput["defaultSource"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Target entity</Label>
              <Select
                value={draft.defaultTarget}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, defaultTarget: value as TemplateInput["defaultTarget"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-strategy">Scoring strategy</Label>
            <Input
              id="template-strategy"
              placeholder="Hybrid semantic + structured weighting"
              value={draft.scoringStrategy}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, scoringStrategy: event.target.value }))
              }
            />
          </div>

          <CardFooter className="px-0">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save template"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
