"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobs } from "@/modules/jobs/hooks/use-jobs";
import { useMatches } from "@/modules/matches/hooks/use-matches";
import { useTemplate } from "@/modules/templates/hooks/use-template";

export default function TemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const template = useTemplate(params.templateId);
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches();

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Template not found</CardTitle>
          <CardDescription>Check the URL or return to the templates list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/templates">Back to templates</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const relatedJobs = jobs.filter((job) => job.templateId === template.id);
  const relatedMatches = matches.filter((match) => relatedJobs.some((job) => job.id === match.jobId));

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="uppercase tracking-wide">
              {template.defaultSource}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="uppercase tracking-wide">
              {template.defaultTarget}
            </Badge>
          </div>
          <CardTitle className="text-2xl">{template.name}</CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Scoring strategy:</span> {template.scoringStrategy}
          </div>
          <div>
            <span className="font-medium text-foreground">Last updated:</span> {template.lastUpdated}
          </div>
          <Button asChild variant="secondary" className="w-fit">
            <Link href={`/jobs?templateId=${template.id}#launch-job`}>Launch job from template</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs using this template</CardTitle>
          <CardDescription>{relatedJobs.length} jobs have been launched.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      {job.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.status === "Completed" ? "success" : job.status === "Scoring" ? "warning" : "secondary"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {relatedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No jobs yet — queue one to start scoring matches.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent matches</CardTitle>
          <CardDescription>Combined view across jobs for this template.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedMatches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/matches/${match.id}`} className="hover:underline">
                      {match.sourceName}
                    </Link>
                  </TableCell>
                  <TableCell>{match.targetName}</TableCell>
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
                </TableRow>
              ))}
              {relatedMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No matches yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
