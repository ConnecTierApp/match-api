"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Job } from "@/types/matching";

interface JobsTableCardProps {
  jobs: Job[];
  templateNames: Record<string, string>;
}

export function JobsTableCard({ jobs, templateNames }: JobsTableCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Latest jobs</CardTitle>
        <CardDescription>Monitor progress and hop back into the scoring stream.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Template</TableHead>
              <TableHead className="hidden whitespace-nowrap md:table-cell">Entities</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="bg-card">
                <TableCell className="font-medium text-foreground">
                  <Link href={`/jobs/${job.id}`} className="hover:underline">
                    {job.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {templateNames[job.templateId] ?? job.templateId}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {job.sourceEntityType} → {job.targetEntityType}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {new Date(job.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {jobs.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            <p>No jobs yet — launch one to start scoring matches.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: Job["status"]) {
  if (status === "Completed") {
    return "success";
  }
  if (status === "Scoring") {
    return "warning";
  }
  if (status === "Failed") {
    return "destructive";
  }
  return "secondary";
}
