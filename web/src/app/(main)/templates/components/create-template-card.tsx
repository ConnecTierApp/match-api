"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { EntityTypeOption } from "@/modules/entities/hooks/use-entities";
import { MatchingCriterionInput, TemplateInput } from "@/types/matching";
import { DeveloperApiModal } from "@/modules/developer-examples/components/developer-api-modal";

interface CreateTemplateCardProps {
  entityOptions: EntityTypeOption[];
  isLoadingEntityTypes: boolean;
  disableSelection?: boolean;
  onCreate: (input: TemplateInput) => Promise<void> | void;
}

const emptyCriterion: MatchingCriterionInput = {
  label: "",
  prompt: "",
  weight: 1,
  sourceLimit: 3,
  targetLimit: 3,
};

const initialDraft: TemplateInput = {
  name: "",
  description: "",
  scoringStrategy: "Hybrid semantic + rule weighting",
  defaultSource: "",
  defaultTarget: "",
  criteria: [{ ...emptyCriterion }],
};

export function CreateTemplateCard({
  entityOptions,
  isLoadingEntityTypes,
  disableSelection = false,
  onCreate,
}: CreateTemplateCardProps) {
  const [draft, setDraft] = useState<TemplateInput>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCriterion = (index: number, updates: Partial<MatchingCriterionInput>) => {
    setDraft((previous) => ({
      ...previous,
      criteria: previous.criteria.map((criterion, idx) =>
        idx === index ? { ...criterion, ...updates } : criterion,
      ),
    }));
  };

  const addCriterion = () => {
    setDraft((previous) => ({
      ...previous,
      criteria: [...previous.criteria, { ...emptyCriterion }],
    }));
  };

  const removeCriterion = (index: number) => {
    setDraft((previous) => ({
      ...previous,
      criteria: previous.criteria.length > 1
        ? previous.criteria.filter((_, idx) => idx !== index)
        : previous.criteria,
    }));
  };

  const defaultSource = useMemo(() => entityOptions[0]?.slug ?? "", [entityOptions]);
  const defaultTarget = useMemo(() => entityOptions[1]?.slug ?? entityOptions[0]?.slug ?? "", [entityOptions]);
  const hasEntityTypes = entityOptions.length > 0 && !disableSelection;

  useEffect(() => {
    setDraft((previous) => ({
      ...previous,
      defaultSource: previous.defaultSource || (defaultSource as TemplateInput["defaultSource"]),
      defaultTarget: previous.defaultTarget || (defaultTarget as TemplateInput["defaultTarget"]),
    }));
  }, [defaultSource, defaultTarget]);

  const hasValidCriteria = draft.criteria.length > 0 && draft.criteria.every((criterion) => criterion.label.trim() && criterion.prompt.trim());
  const isValid = Boolean(draft.name.trim()) && hasEntityTypes && hasValidCriteria;

  const developerRequests = [
    {
      title: "Create template",
      method: "POST" as const,
      path: "matching-templates/",
      body: () => ({
        name: draft.name.trim(),
        description: draft.description.trim(),
        source_entity_type: draft.defaultSource,
        target_entity_type: draft.defaultTarget,
        config: {
          scoring_strategy: draft.scoringStrategy,
          search_criteria: draft.criteria.map((criterion, index) => ({
            id: criterion.id || `criterion-${index + 1}`,
            label: criterion.label.trim(),
            prompt: criterion.prompt,
            weight: criterion.weight ?? 1,
            guidance: criterion.guidance,
            source_snippet_limit: criterion.sourceLimit ?? 3,
            target_snippet_limit: criterion.targetLimit ?? 3,
          })),
        },
      }),
      description: "Define the scoring strategy and criteria used when launching jobs.",
    },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(draft);
      setDraft((prev) => ({
        ...initialDraft,
        scoringStrategy: prev.scoringStrategy,
        defaultSource: prev.defaultSource || (defaultSource as TemplateInput["defaultSource"]),
        defaultTarget: prev.defaultTarget || (defaultTarget as TemplateInput["defaultTarget"]),
        criteria: prev.criteria.length ? prev.criteria.map((criterion) => ({ ...criterion })) : [{ ...emptyCriterion }],
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="create-template">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Create a template</CardTitle>
          <DeveloperApiModal requests={developerRequests} triggerLabel="Template API" />
        </div>
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
                disabled={!hasEntityTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingEntityTypes ? "Loading…" : "Select entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((entity) => (
                    <SelectItem key={entity.id} value={entity.slug}>
                      {entity.label}
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
                disabled={!hasEntityTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingEntityTypes ? "Loading…" : "Select entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((entity) => (
                    <SelectItem key={entity.id} value={entity.slug}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>Search criteria</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
                Add criterion
              </Button>
            </div>
            <div className="grid gap-6">
              {draft.criteria.map((criterion, index) => (
                <div key={`criterion-${index}`} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`criterion-${index}-label`}>Label</Label>
                      <Input
                        id={`criterion-${index}-label`}
                        placeholder="Ex: Culture fit alignment"
                        value={criterion.label}
                        onChange={(event) => updateCriterion(index, { label: event.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-6"
                      onClick={() => removeCriterion(index)}
                      disabled={draft.criteria.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`criterion-${index}-prompt`}>Prompt</Label>
                    <Textarea
                      id={`criterion-${index}-prompt`}
                      rows={3}
                      placeholder="Describe what this search should look for."
                      value={criterion.prompt}
                      onChange={(event) => updateCriterion(index, { prompt: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`criterion-${index}-guidance`}>LLM guidance (optional)</Label>
                    <Textarea
                      id={`criterion-${index}-guidance`}
                      rows={2}
                      placeholder="Pointers you want the LLM to emphasize when scoring."
                      value={criterion.guidance ?? ""}
                      onChange={(event) => updateCriterion(index, { guidance: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`criterion-${index}-weight`}>Weight</Label>
                      <Input
                        id={`criterion-${index}-weight`}
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={criterion.weight ?? 1}
                        onChange={(event) => updateCriterion(index, { weight: Number(event.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`criterion-${index}-source-limit`}>Source snippets</Label>
                      <Input
                        id={`criterion-${index}-source-limit`}
                        type="number"
                        min={1}
                        max={10}
                        value={criterion.sourceLimit ?? 3}
                        onChange={(event) => updateCriterion(index, { sourceLimit: Number(event.target.value) || 3 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`criterion-${index}-target-limit`}>Target snippets</Label>
                      <Input
                        id={`criterion-${index}-target-limit`}
                        type="number"
                        min={1}
                        max={10}
                        value={criterion.targetLimit ?? 3}
                        onChange={(event) => updateCriterion(index, { targetLimit: Number(event.target.value) || 3 })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!hasEntityTypes && !isLoadingEntityTypes ? (
            <p className="text-xs text-muted-foreground">
              Create entity types before wiring a new template.
            </p>
          ) : null}

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
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !isValid}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save template"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
