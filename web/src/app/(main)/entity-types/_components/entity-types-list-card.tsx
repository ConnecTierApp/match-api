"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityTypeDefinition } from "@/types/matching";

interface EntityTypesListCardProps {
  entityTypes: EntityTypeDefinition[];
}

export function EntityTypesListCard({ entityTypes }: EntityTypesListCardProps) {
  const sorted = useMemo(
    () => [...entityTypes].sort((a, b) => a.slug.localeCompare(b.slug)),
    [entityTypes],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity types</CardTitle>
        <CardDescription>Workspace-wide taxonomy used by templates and jobs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No entity types yet — add one to unlock template configuration.
          </div>
        ) : null}
        {sorted.map((entityType) => (
          <div key={entityType.id} className="grid gap-2 rounded-lg border border-border/70 bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium text-foreground">{entityType.displayName || entityType.slug}</span>
              <Badge variant="outline" className="uppercase tracking-wide">{entityType.slug}</Badge>
            </div>
            {entityType.description ? (
              <p className="text-sm text-muted-foreground">{entityType.description}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
