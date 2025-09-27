"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Template } from "@/types/matching";

interface TemplateCoverageCardProps {
  templates: Template[];
  entityOptions: string[];
}

export function TemplateCoverageCard({ templates, entityOptions }: TemplateCoverageCardProps) {
  const coverage = useMemo(() => {
    return entityOptions.reduce<Record<string, number>>((accumulator, entity) => {
      accumulator[entity] = templates.filter(
        (template) => template.defaultSource === entity || template.defaultTarget === entity,
      ).length;
      return accumulator;
    }, {});
  }, [entityOptions, templates]);

  return (
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
              {coverage[entity] ?? 0}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
