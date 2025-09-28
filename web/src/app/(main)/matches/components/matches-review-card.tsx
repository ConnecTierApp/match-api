"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Job, Match } from "@/types/matching";

import { DeveloperApiModal } from "@/modules/developer-examples/components/developer-api-modal";

interface MatchesReviewCardProps {
  jobs: Job[];
  matches: Match[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  totalAutoApproved: number;
}

export function MatchesReviewCard({ jobs, matches, selectedJobId, onSelectJob, totalAutoApproved }: MatchesReviewCardProps) {
  const developerRequests = [
    {
      title: "List matches",
      method: "GET" as const,
      path: "matches/",
    },
    {
      title: "List match features",
      method: "GET" as const,
      path: "match-features/",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Review matches</CardTitle>
          <DeveloperApiModal requests={developerRequests} triggerLabel="Matches API" />
        </div>
        <CardDescription>
          Filter by job and spot-check high-value connections before they sync downstream.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Job</Label>
            <Select value={selectedJobId} onValueChange={onSelectJob}>
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
              <Sparkles className="h-4 w-4" /> {matches.length} matches surfaced ({totalAutoApproved} auto-approved)
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
              {matches.map((match) => (
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
          {matches.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5" />
              <p>No matches yet — queue a job to start seeing recommendations.</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
