"use client";

import { FormEvent } from "react";

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
import { Job, MatchInput } from "@/types/matching";

interface ManualMatchCardProps {
  jobs: Job[];
  draft: MatchInput;
  onDraftChange: (draft: MatchInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  isSubmitting: boolean;
}

export function ManualMatchCard({ jobs, draft, onDraftChange, onSubmit, isSubmitting }: ManualMatchCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Add a manual match</CardTitle>
        <CardDescription>Drop in curated connections to jump-start workflows.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label>Job</Label>
            <Select
              value={draft.jobId}
              onValueChange={(value) => onDraftChange({ ...draft, jobId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="match-source">Source name</Label>
            <Textarea
              id="match-source"
              rows={2}
              value={draft.sourceName}
              onChange={(event) => onDraftChange({ ...draft, sourceName: event.target.value })}
              placeholder="E.g. Ada Fernandez"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="match-target">Target name</Label>
            <Textarea
              id="match-target"
              rows={2}
              value={draft.targetName}
              onChange={(event) => onDraftChange({ ...draft, targetName: event.target.value })}
              placeholder="E.g. Staff ML Engineer @ FusionAI"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="match-summary">Why it works</Label>
            <Textarea
              id="match-summary"
              rows={3}
              value={draft.summary}
              onChange={(event) => onDraftChange({ ...draft, summary: event.target.value })}
              placeholder="Highlight the shared context, skills, and signals that make this pairing strong."
            />
          </div>

          <div className="grid gap-2">
            <Label>Confidence</Label>
            <Select
              value={draft.status}
              onValueChange={(value) => onDraftChange({ ...draft, status: value as MatchInput["status"] })}
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
              value={draft.score}
              onChange={(event) => onDraftChange({ ...draft, score: Number(event.target.value) })}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || !draft.jobId}>
            {isSubmitting ? "Adding..." : "Add match"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
