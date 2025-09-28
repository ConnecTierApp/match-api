"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useJob } from "@/modules/jobs/hooks/use-job";
import { useMatch } from "@/modules/matches/hooks/use-match";
import { useMatchMutations } from "@/modules/matches/hooks/use-match-mutations";
import { MatchUpdate } from "@/types/matching";

import { DeveloperApiModal } from "@/modules/developer-examples/components/developer-api-modal";

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const match = useMatch(params.matchId);
  const job = useJob(match?.jobId);
  const { updateMatch, deleteMatch } = useMatchMutations();

  const [formState, setFormState] = useState<MatchUpdate>(() => ({
    summary: match?.summary ?? "",
    status: match?.status ?? "manual_review",
    score: match?.score ?? 90,
    sourceName: match?.sourceName ?? "",
    targetName: match?.targetName ?? "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const developerRequests = [
    {
      title: "Update source entity",
      method: "PATCH" as const,
      path: `entities/${match?.sourceEntityId}/`,
      body: () => ({
        name: formState.sourceName,
        entity_type: job?.sourceEntityType,
        metadata: { summary: formState.summary },
      }),
    },
    {
      title: "Update target entity",
      method: "PATCH" as const,
      path: `entities/${match?.targetEntityId}/`,
      body: () => ({
        name: formState.targetName,
        entity_type: job?.targetEntityType,
        metadata: { summary: formState.summary },
      }),
    },
    {
      title: "Update match",
      method: "PATCH" as const,
      path: `matches/${match?.id}/`,
      body: () => ({
        score: (formState.score ?? 0) > 1 ? (formState.score ?? 0) / 100 : (formState.score ?? 0),
        explanation: formState.summary,
      }),
    },
    {
      title: "Set match status",
      method: "POST" as const,
      path: "match-features/",
      body: () => ({
        match: match?.id,
        label: "status",
        value_text: formState.status,
      }),
    },
    {
      title: "Delete match",
      method: "DELETE" as const,
      path: `matches/${match?.id}/`,
    },
  ];

  if (!match) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match not found</CardTitle>
          <CardDescription>Check the URL or return to the matches list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/matches">Back to matches</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      await updateMatch(match.id, {
        ...formState,
        score: formState.score,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMatch(match.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Match detail</CardTitle>
          <CardDescription>
            Linked to job
            {" "}
            {job ? (
              <Link href={`/jobs/${job.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {job.name}
              </Link>
            ) : (
              "(job removed)"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="font-semibold text-foreground">
            Score {match.score}
          </Badge>
          <Badge
            variant={
              match.status === "auto_approved"
                ? "success"
                : match.status === "manual_review"
                ? "warning"
                : "secondary"
            }
          >
            {match.status === "auto_approved"
              ? "Auto approved"
              : match.status === "manual_review"
              ? "Needs review"
              : "Flagged"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Edit match</CardTitle>
            <DeveloperApiModal requests={developerRequests} triggerLabel="Match API" />
          </div>
          <CardDescription>Refine summary, score, or routing confidence.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="source-name">Source</Label>
              <Textarea
                id="source-name"
                rows={2}
                value={formState.sourceName}
                onChange={(event) => setFormState((prev) => ({ ...prev, sourceName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-name">Target</Label>
              <Textarea
                id="target-name"
                rows={2}
                value={formState.targetName}
                onChange={(event) => setFormState((prev) => ({ ...prev, targetName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="match-summary">Summary</Label>
              <Textarea
                id="match-summary"
                rows={3}
                value={formState.summary}
                onChange={(event) => setFormState((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formState.status}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as typeof prev.status }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_approved">Auto approved</SelectItem>
                  <SelectItem value="manual_review">Needs review</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="match-score">Score</Label>
              <Input
                id="match-score"
                type="number"
                min={0}
                max={100}
                value={formState.score}
                onChange={(event) => setFormState((prev) => ({ ...prev, score: Number(event.target.value) }))}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Removing..." : "Remove match"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
