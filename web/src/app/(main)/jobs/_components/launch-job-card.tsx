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
import { Template } from "@/types/matching";
import { JobInput, JobStatus } from "@/types/matching";

interface LaunchJobCardProps {
  templates: Template[];
  entityOptions: string[];
  defaultTemplateId?: string | null;
  onCreate: (input: JobInput) => Promise<void> | void;
}

type JobDraft = JobInput;

const initialDraft: JobDraft = {
  name: "",
  templateId: "",
  sourceEntity: "Candidates",
  targetEntity: "Roles",
  sourceCount: 50,
  targetCount: 25,
  notes: "",
  status: "Queued",
};

export function LaunchJobCard({ templates, entityOptions, defaultTemplateId, onCreate }: LaunchJobCardProps) {
  const preferredTemplate = useMemo(() => {
    if (defaultTemplateId) {
      return templates.find((template) => template.id === defaultTemplateId) ?? templates[0] ?? null;
    }
    return templates[0] ?? null;
  }, [defaultTemplateId, templates]);

  const [draft, setDraft] = useState<JobDraft>(() => ({
    ...initialDraft,
    templateId: preferredTemplate?.id ?? "",
    sourceEntity: preferredTemplate?.defaultSource ?? "Candidates",
    targetEntity: preferredTemplate?.defaultTarget ?? "Roles",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preferredTemplate) {
      setDraft((prev) => ({
        ...prev,
        templateId: preferredTemplate.id,
        sourceEntity: preferredTemplate.defaultSource,
        targetEntity: preferredTemplate.defaultTarget,
      }));
    }
  }, [preferredTemplate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.templateId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        name: draft.name,
        templateId: draft.templateId,
        sourceEntity: draft.sourceEntity,
        targetEntity: draft.targetEntity,
        sourceCount: draft.sourceCount,
        targetCount: draft.targetCount,
        notes: draft.notes,
        status: draft.status,
      });

      setDraft((prev) => ({
        ...initialDraft,
        templateId: preferredTemplate?.id ?? templates[0]?.id ?? "",
        sourceEntity: preferredTemplate?.defaultSource ?? templates[0]?.defaultSource ?? "Candidates",
        targetEntity: preferredTemplate?.defaultTarget ?? templates[0]?.defaultTarget ?? "Roles",
        sourceCount: prev.sourceCount,
        targetCount: prev.targetCount,
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
          Point your template at fresh entities, tweak overrides, and kick off scoring.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="job-name">Job name</Label>
            <Input
              id="job-name"
              placeholder="Example: EMEA revenue leaders refresh"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Template</Label>
            <Select
              value={draft.templateId}
              onValueChange={(value) => {
                const selected = templates.find((template) => template.id === value);
                setDraft((prev) => ({
                  ...prev,
                  templateId: value,
                  sourceEntity: selected?.defaultSource ?? prev.sourceEntity,
                  targetEntity: selected?.defaultTarget ?? prev.targetEntity,
                }));
              }}
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
                value={draft.sourceEntity}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, sourceEntity: value as JobDraft["sourceEntity"] }))
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
                value={draft.targetEntity}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, targetEntity: value as JobDraft["targetEntity"] }))
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="source-count">Sources ingested</Label>
              <Input
                id="source-count"
                type="number"
                min={0}
                value={draft.sourceCount}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, sourceCount: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-count">Targets available</Label>
              <Input
                id="target-count"
                type="number"
                min={0}
                value={draft.targetCount}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, targetCount: Number(event.target.value) }))
                }
              />
            </div>
          </div>

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
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, status: value as JobStatus }))
              }
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
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Queueing..." : "Queue job"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
