"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useJob,
  useJobs,
  useMatchMutations,
  useMatches,
} from "@/hooks/use-matching";
import { MatchInput } from "@/types/matching";

const defaultMatchDraft: MatchInput = {
  jobId: "",
  score: 90,
  sourceName: "",
  targetName: "",
  summary: "",
  status: "manual_review",
};

export default function MatchesPage() {
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches();
  const { createMatch } = useMatchMutations();

  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [draft, setDraft] = useState<MatchInput>({
    ...defaultMatchDraft,
    jobId: jobs[0]?.id ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeJob = useJob(selectedJobId !== "all" ? selectedJobId : draft.jobId);

  const filteredMatches = useMemo(() => {
    if (selectedJobId === "all") {
      return matches;
    }
    return matches.filter((match) => match.jobId === selectedJobId);
  }, [matches, selectedJobId]);

  const totalAutoApproved = useMemo(
    () => filteredMatches.filter((match) => match.status === "auto_approved").length,
    [filteredMatches],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.jobId || !draft.sourceName.trim() || !draft.targetName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createMatch(draft);
      setDraft((prev) => ({
        ...defaultMatchDraft,
        jobId: prev.jobId,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Review matches</CardTitle>
          <CardDescription>
            Filter by job and spot-check high-value connections before they sync downstream.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Job</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Summary</Label>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" /> {filteredMatches.length} matches surfaced ({totalAutoApproved} auto-approved)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[45%]">Why it works</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/matches/${match.id}`} className="hover:underline">
                        {match.sourceName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground">{match.targetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold text-foreground">
                        {match.score}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{match.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredMatches.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                <Sparkles className="h-5 w-5" />
                <p>No matches yet — queue a job to start seeing recommendations.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Add a manual match</CardTitle>
          <CardDescription>Drop in curated connections to jump-start workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label>Job</Label>
              <Select
                value={draft.jobId}
                onValueChange={(value) => {
                  setDraft((prev) => ({ ...prev, jobId: value }));
                  setSelectedJobId((current) => (current === "all" ? current : value));
                }}
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
                onChange={(event) => setDraft((prev) => ({ ...prev, sourceName: event.target.value }))}
                placeholder="E.g. Ada Fernandez"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="match-target">Target name</Label>
              <Textarea
                id="match-target"
                rows={2}
                value={draft.targetName}
                onChange={(event) => setDraft((prev) => ({ ...prev, targetName: event.target.value }))}
                placeholder="E.g. Staff ML Engineer @ FusionAI"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="match-summary">Why it works</Label>
              <Textarea
                id="match-summary"
                rows={3}
                value={draft.summary}
                onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Highlight the shared context, skills, and signals that make this pairing strong."
              />
            </div>

            <div className="grid gap-2">
              <Label>Confidence</Label>
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, status: value as MatchInput["status"] }))
                }
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
                onChange={(event) => setDraft((prev) => ({ ...prev, score: Number(event.target.value) }))}
              />
            </div>

            {activeJob ? (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                Pushing to <span className="font-medium text-foreground">{activeJob.name}</span> with
                <span className="font-medium text-foreground"> {activeJob.sourceEntity}</span> ↔
                <span className="font-medium text-foreground"> {activeJob.targetEntity}</span> context.
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting || !draft.jobId}>
              {isSubmitting ? "Adding..." : "Add match"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
