"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  useEntityOptions,
  useJobMutations,
  useJobs,
  useTemplate,
  useTemplates,
} from "@/hooks/use-matching";
import { JobInput, JobStatus } from "@/types/matching";

type JobDraft = JobInput;

const initialDraft: JobDraft = {
  name: "",
  templateId: "",
  sourceEntity: "Candidates",
  targetEntity: "Roles",
  sourceCount: 50,
  targetCount: 25,
  notes: "",
  status: "Queued",
};

const jobStatusOrder: Record<JobStatus, number> = {
  Draft: 0,
  Queued: 1,
  Scoring: 2,
  Completed: 3,
};

export default function JobsPage() {
  const searchParams = useSearchParams();
  const templateQuery = searchParams.get("templateId");

  const { data: jobs } = useJobs();
  const { data: templates } = useTemplates();
  const entityOptions = useEntityOptions();
  const { createJob } = useJobMutations();

  const preferredTemplate = useTemplate(templateQuery ?? undefined) ?? templates[0] ?? null;

  const [draft, setDraft] = useState<JobDraft>(() => ({
    ...initialDraft,
    templateId: preferredTemplate?.id ?? "",
    sourceEntity: preferredTemplate?.defaultSource ?? "Candidates",
    targetEntity: preferredTemplate?.defaultTarget ?? "Roles",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preferredTemplate) {
      setDraft((prev) => ({
        ...prev,
        templateId: preferredTemplate.id,
        sourceEntity: preferredTemplate.defaultSource,
        targetEntity: preferredTemplate.defaultTarget,
      }));
    }
  }, [preferredTemplate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.templateId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createJob({
        name: draft.name,
        templateId: draft.templateId,
        sourceEntity: draft.sourceEntity,
        targetEntity: draft.targetEntity,
        sourceCount: draft.sourceCount,
        targetCount: draft.targetCount,
        notes: draft.notes,
        status: draft.status,
      });

      setDraft((prev) => ({
        ...initialDraft,
        templateId: preferredTemplate?.id ?? templates[0]?.id ?? "",
        sourceEntity: preferredTemplate?.defaultSource ?? templates[0]?.defaultSource ?? "Candidates",
        targetEntity: preferredTemplate?.defaultTarget ?? templates[0]?.defaultTarget ?? "Roles",
        sourceCount: prev.sourceCount,
        targetCount: prev.targetCount,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => jobStatusOrder[b.status] - jobStatusOrder[a.status]);
  }, [jobs]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <Card id="launch-job">
        <CardHeader>
          <CardTitle>Launch a matching job</CardTitle>
          <CardDescription>
            Point your template at fresh entities, tweak overrides, and kick off scoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="job-name">Job name</Label>
              <Input
                id="job-name"
                placeholder="Example: EMEA revenue leaders refresh"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Template</Label>
              <Select
                value={draft.templateId}
                onValueChange={(value) => {
                  const selected = templates.find((template) => template.id === value);
                  setDraft((prev) => ({
                    ...prev,
                    templateId: value,
                    sourceEntity: selected?.defaultSource ?? prev.sourceEntity,
                    targetEntity: selected?.defaultTarget ?? prev.targetEntity,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Source entity</Label>
                <Select
                  value={draft.sourceEntity}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, sourceEntity: value as JobDraft["sourceEntity"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Target entity</Label>
                <Select
                  value={draft.targetEntity}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, targetEntity: value as JobDraft["targetEntity"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="source-count">Sources ingested</Label>
                <Input
                  id="source-count"
                  type="number"
                  min={0}
                  value={draft.sourceCount}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, sourceCount: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target-count">Targets available</Label>
                <Input
                  id="target-count"
                  type="number"
                  min={0}
                  value={draft.targetCount}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, targetCount: Number(event.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="job-notes">Overrides & notes</Label>
              <Textarea
                id="job-notes"
                placeholder="Ex: favor IC roles, penalize enterprise-only experience, exclude non-remote teams."
                value={draft.notes}
                rows={3}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <CardFooter className="px-0">
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Queueing..." : "Queue job"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

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
              {sortedJobs.map((job) => (
                <TableRow key={job.id} className="bg-card">
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      {job.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {templates.find((template) => template.id === job.templateId)?.name ?? "–"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {job.sourceCount} → {job.targetCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.status === "Completed" ? "success" : job.status === "Scoring" ? "warning" : "secondary"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedJobs.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
              <p>No jobs yet — launch one to start scoring matches.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
