"use client";

import { FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Entity } from "@/types/matching";

interface EntitySummaryCardProps {
  entity: Entity;
  onUpdateSummary: (summary: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

export function EntitySummaryCard({ entity, onUpdateSummary, onDelete }: EntitySummaryCardProps) {
  const [summary, setSummary] = useState(entity.summary ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSummary(entity.summary ?? "");
  }, [entity.summary]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      await onUpdateSummary(summary);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{entity.type}</Badge>
          <span className="text-xs text-muted-foreground">Last updated {entity.lastUpdated}</span>
        </div>
        <CardTitle className="text-2xl">{entity.name}</CardTitle>
        <CardDescription>
          {entity.summary ? entity.summary : "No summary yet — add context for match reviewers."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="entity-summary" className="text-sm font-medium">
              Edit summary
            </label>
            <Textarea
              id="entity-summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save summary"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Delete entity"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
