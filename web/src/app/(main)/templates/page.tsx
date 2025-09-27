"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { useEntityOptions, useTemplateMutations, useTemplates } from "@/hooks/use-matching";
import { TemplateInput } from "@/types/matching";

type TemplateDraft = TemplateInput;

const initialDraft: TemplateDraft = {
  name: "",
  description: "",
  scoringStrategy: "Hybrid semantic + rule weighting",
  defaultSource: "Candidates",
  defaultTarget: "Roles",
};

export default function TemplatesPage() {
  const { data: templates } = useTemplates();
  const entityOptions = useEntityOptions();
  const { createTemplate, deleteTemplate } = useTemplateMutations();

  const [draft, setDraft] = useState<TemplateDraft>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createTemplate(draft);
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

  const templatesByEntity = useMemo(() => {
    return entityOptions.reduce<Record<string, number>>((accumulator, entity) => {
      accumulator[entity] = templates.filter(
        (template) => template.defaultSource === entity || template.defaultTarget === entity,
      ).length;
      return accumulator;
    }, {});
  }, [entityOptions, templates]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
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
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, defaultSource: value as TemplateDraft["defaultSource"] }))}
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
                  onValueChange={(value) => setDraft((prev) => ({ ...prev, defaultTarget: value as TemplateDraft["defaultTarget"] }))}
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

      <div className="flex flex-col gap-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>Recently updated blueprints you can reuse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/templates/${template.id}`}
                      className="text-base font-semibold text-foreground hover:underline"
                    >
                      {template.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <Badge variant="secondary">{template.lastUpdated}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="uppercase tracking-wide text-xs">
                    {template.defaultSource}
                  </Badge>
                  <span>→</span>
                  <Badge variant="outline" className="uppercase tracking-wide text-xs">
                    {template.defaultTarget}
                  </Badge>
                  <span className="hidden w-px self-stretch bg-border sm:block" />
                  <span>{template.scoringStrategy}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/jobs?templateId=${template.id}#launch-job`}>New job from template</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}

            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                <p>No templates yet — spin one up to kick off matching jobs.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Entity coverage</CardTitle>
            <CardDescription>See how templates span your core entities.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {entityOptions.map((entity) => (
              <div key={entity} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{entity}</span>
                <Badge variant="outline" className="text-foreground">
                  {templatesByEntity[entity] ?? 0}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
