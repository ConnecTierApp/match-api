"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FilePlus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntityTypeOption } from "@/modules/entities/hooks/use-entities";
import { Entity } from "@/types/matching";

interface EntitiesListCardProps {
  entities: Entity[];
  entityTypeOptions: EntityTypeOption[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void> | void;
}

export function EntitiesListCard({ entities, entityTypeOptions, isLoading, onDelete }: EntitiesListCardProps) {
  const typeLabelBySlug = useMemo(() => {
    const map = new Map<string, EntityTypeOption>();
    entityTypeOptions.forEach((option) => {
      map.set(option.slug, option);
    });
    return map;
  }, [entityTypeOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entities</CardTitle>
        <CardDescription>All teams, personas, and datasets ready for matching.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && entities.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
            Loading entities…
          </div>
        ) : null}

        {entities.map((entity) => (
          <div key={entity.id} className="rounded-lg border border-border/70 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <Link
                  href={`/entities/${entity.id}`}
                  className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  {entity.name}
                </Link>
                <p className="text-sm text-muted-foreground">{entity.summary || "No summary yet"}</p>
              </div>
              <Badge variant="secondary">
                {typeLabelBySlug.get(entity.type)?.label ?? entity.type}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {entity.documents.length} document{entity.documents.length === 1 ? "" : "s"}
              </span>
              <span>Updated {entity.lastUpdated}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="secondary" className="gap-2">
                <Link href={`/entities/${entity.id}#documents`}>
                  <FilePlus className="h-4 w-4" /> Attach document
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => onDelete(entity.id)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        ))}

        {!isLoading && entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            <p>No entities yet — create one to start collecting briefs and context.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
