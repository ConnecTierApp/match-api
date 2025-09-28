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
import { Entity, Template } from "@/types/matching";
import { JobInput, JobStatus } from "@/types/matching";

interface LaunchJobCardProps {
  templates: Template[];
  entities: Entity[];
  entityOptions: EntityTypeOption[];
  isLoadingEntityTypes: boolean;
  disableSelection?: boolean;
  defaultTemplateId?: string | null;
  onCreate: (input: JobInput) => Promise<void> | void;
}

type JobDraft = {
  displayName: string;
  templateId: string;
  sourceEntityId: string;
  targetEntityType: Entity["type"];
  status: JobStatus;
  notes: string;
};

const initialDraft: JobDraft = {
  displayName: "",
  templateId: "",
  sourceEntityId: "",
  targetEntityType: "Candidates" as Entity["type"],
  status: "Queued",
  notes: "",
};

export function LaunchJobCard({
  templates,
  entities,
  entityOptions,
  isLoadingEntityTypes,
  disableSelection = false,
  defaultTemplateId,
  onCreate,
}: LaunchJobCardProps) {
  const preferredTemplate = useMemo(() => {
    if (defaultTemplateId) {
      return templates.find((template) => template.id === defaultTemplateId) ?? templates[0] ?? null;
    }
    return templates[0] ?? null;
  }, [defaultTemplateId, templates]);

  const entityTypeOptionsAvailable = entityOptions.length > 0;
  const hasEntityTypes = entityTypeOptionsAvailable && !disableSelection;

  const [draft, setDraft] = useState<JobDraft>(() => ({
    ...initialDraft,
    templateId: preferredTemplate?.id ?? "",
    targetEntityType: (preferredTemplate?.defaultTarget as Entity["type"]) ?? (entityOptions[0]?.slug as Entity["type"]) ?? "Candidates",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === draft.templateId) ?? preferredTemplate,
    [draft.templateId, preferredTemplate, templates],
  );

  const availableSources = useMemo(() => {
    const typeToMatch = selectedTemplate?.defaultSource ?? null;
    if (!typeToMatch) {
      return entities;
    }
    return entities.filter((entity) => entity.type === typeToMatch);
  }, [entities, selectedTemplate]);

  const hasSourceEntities = availableSources.length > 0;

  useEffect(() => {
    setDraft((previous) => ({
      ...previous,
      templateId: selectedTemplate?.id ?? previous.templateId,
      targetEntityType:
        (selectedTemplate?.defaultTarget as Entity["type"]) ?? previous.targetEntityType,
      sourceEntityId: availableSources.some((entity) => entity.id === previous.sourceEntityId)
        ? previous.sourceEntityId
        : availableSources[0]?.id ?? previous.sourceEntityId,
    }));
  }, [availableSources, selectedTemplate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.displayName.trim() || !draft.templateId || !hasEntityTypes || !hasSourceEntities) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        displayName: draft.displayName,
        templateId: draft.templateId,
        sourceEntityId: draft.sourceEntityId,
        targetEntityType: draft.targetEntityType,
        notes: draft.notes,
        status: draft.status,
      });

      setDraft((previous) => ({
        ...initialDraft,
        templateId: selectedTemplate?.id ?? templates[0]?.id ?? "",
        targetEntityType:
          (selectedTemplate?.defaultTarget as Entity["type"]) ?? previous.targetEntityType,
        sourceEntityId: availableSources[0]?.id ?? previous.sourceEntityId,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="launch-job">
      <CardHeader>
        <CardTitle>Launch a matching job</CardTitle>
        <CardDescription>
          Pick a template, choose an existing source entity, and queue matching for the latest targets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="job-name">Job name</Label>
            <Input
              id="job-name"
              placeholder="Example: EMEA revenue leaders refresh"
              value={draft.displayName}
              onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Template</Label>
            <Select
              value={draft.templateId}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, templateId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Source entity</Label>
              <Select
                value={draft.sourceEntityId}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, sourceEntityId: value }))}
                disabled={!hasSourceEntities}
              >
                <SelectTrigger>
                  <SelectValue placeholder={hasSourceEntities ? "Select entity" : "No entities available"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSources.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!hasSourceEntities ? (
                <p className="text-xs text-muted-foreground">
                  Create an entity matching the template source type before launching this job.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Target entity type</Label>
              <Select
                value={draft.targetEntityType}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, targetEntityType: value as Entity["type"] }))}
                disabled={!hasEntityTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingEntityTypes ? "Loading…" : "Select entity type"} />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((option) => (
                    <SelectItem key={option.id} value={option.slug}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!hasEntityTypes && !isLoadingEntityTypes ? (
            <p className="text-xs text-muted-foreground">
              Create entity types before configuring target categories for this job.
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="job-notes">Overrides & notes</Label>
            <Textarea
              id="job-notes"
              placeholder="Ex: favor IC roles, penalize enterprise-only experience, exclude non-remote teams."
              value={draft.notes}
              rows={3}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as JobStatus }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Queued">Queued</SelectItem>
                <SelectItem value="Scoring">Scoring</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardFooter className="px-0">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                isSubmitting ||
                !draft.displayName.trim() ||
                !draft.templateId ||
                !hasEntityTypes ||
                !hasSourceEntities
              }
            >
              {isSubmitting ? "Queueing..." : "Queue job"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
