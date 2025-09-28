"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo } from "react";

import { EntityTypeOption } from "@/modules/entities/hooks/use-entities";
import { Template } from "@/types/matching";

interface TemplatesListCardProps {
  templates: Template[];
  entityTypeOptions: EntityTypeOption[];
  onDelete: (id: string) => Promise<void> | void;
}

export function TemplatesListCard({ templates, entityTypeOptions, onDelete }: TemplatesListCardProps) {
  const typeLabelBySlug = useMemo(() => {
    const map = new Map<string, EntityTypeOption>();
    entityTypeOptions.forEach((option) => map.set(option.slug, option));
    return map;
  }, [entityTypeOptions]);

  return (
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
                  className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  {template.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              </div>
              <Badge variant="secondary">{template.lastUpdated}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="uppercase tracking-wide text-xs">
                {typeLabelBySlug.get(template.defaultSource)?.label ?? template.defaultSource}
              </Badge>
              <span>→</span>
              <Badge variant="outline" className="uppercase tracking-wide text-xs">
                {typeLabelBySlug.get(template.defaultTarget)?.label ?? template.defaultTarget}
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
                onClick={() => onDelete(template.id)}
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
  );
}
