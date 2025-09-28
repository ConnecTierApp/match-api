"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

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
import { useJob } from "@/modules/jobs/hooks/use-job";
import { useJobMutations } from "@/modules/jobs/hooks/use-job-mutations";
import { useJobStream, createJobStreamEntry, resolveWebSocketUrl } from "@/modules/jobs/hooks/use-job-stream";
import { useJobUpdates } from "@/modules/jobs/hooks/use-job-updates";
import { useMatchesByJob } from "@/modules/matches/hooks/use-matches-by-job";
import { useTemplate } from "@/modules/templates/hooks/use-template";

import { DeveloperApiModal } from "@/modules/developer-examples/components/developer-api-modal";
import { JOB_STATUS_FROM_API, JOB_STATUS_TO_API } from "@/modules/jobs/lib/api";
import { JobUpdatesFeed } from "./components/job-updates-feed/job-updates-feed";

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const job = useJob(params.jobId);
  const template = useTemplate(job?.templateId);
  const { data: matches } = useMatchesByJob(job?.id);
  const { updateJob, deleteJob } = useJobMutations();
  const stream = useJobStream(params.jobId);
  const { data: persistedUpdates, isLoading: isLoadingPersistedUpdates } = useJobUpdates(job?.id);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayStatus = useMemo(() => {
    if (stream.status) {
      const label = JOB_STATUS_FROM_API[stream.status.status] ?? job?.status;
      return label ?? "Queued";
    }
    return job?.status ?? "Queued";
  }, [job?.status, stream.status]);

  const statusVariant = displayStatus === "Completed"
    ? "success"
    : displayStatus === "Scoring"
    ? "warning"
    : displayStatus === "Failed"
    ? "destructive"
    : "secondary";

  const displayErrorMessage = stream.status?.errorMessage ?? job?.errorMessage;

  const persistedEntries = useMemo(() => {
    return (persistedUpdates ?? []).map((update) => {
      const payload = (update.payload ?? {}) as Record<string, unknown>;
      return createJobStreamEntry(payload, {
        idPrefix: "db",
        stableId: update.id,
        fallbackTimestamp: update.created_at,
      });
    });
  }, [persistedUpdates]);

  const eventsForFeed = useMemo(() => {
    const combined = [...persistedEntries, ...stream.events];
    const seen = new Set<string>();
    const parseTime = (value?: string) => {
      if (!value) {
        return 0;
      }
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? 0 : ms;
    };

    combined.sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));

    return combined.filter((entry) => {
      const key = `${entry.type}-${entry.timestamp ?? ""}-${entry.title}-${entry.description ?? ""}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [persistedEntries, stream.events]);

  const developerRequests = job
    ? (() => {
        const websocketUrl = resolveWebSocketUrl(job.id);
        return [
          {
            title: "Stream realtime updates",
            method: "WS" as const,
            path: websocketUrl,
            methodLabel: "WS",
            description: "Subscribe to the websocket feed to receive job events as they happen.",
            codeSamples: {
              curl: () =>
                [
                  "# Requires websocat (https://github.com/vi/websocat)",
                  `websocat "${websocketUrl}"`,
                ].join("\n"),
              javascript: () =>
                [
                  `const socket = new WebSocket("${websocketUrl}");`,
                  "",
                  'socket.addEventListener("open", () => {',
                  '  console.log("connected");',
                  '});',
                  "",
                  'socket.addEventListener("message", (event) => {',
                  '  const payload = JSON.parse(event.data);',
                  '  console.log("job event", payload);',
                  '});',
                  "",
                  'socket.addEventListener("close", () => {',
                  '  console.log("socket closed");',
                  '});',
                ].join("\n"),
              python: () =>
                [
                  "import asyncio",
                  "import json",
                  "import websockets",
                  "",
                  `async def main():`,
                  `    url = "${websocketUrl}"`,
                  "    async with websockets.connect(url) as websocket:",
                  "        async for message in websocket:",
                  "            payload = json.loads(message)",
                  '            print("job event", payload)',
                  "",
                  "asyncio.run(main())",
                ].join("\n"),
              go: () =>
                [
                  "package main",
                  "",
                  "import (",
                  '  "fmt"',
                  '  "log"',
                  '  "net/url"',
                  '  "github.com/gorilla/websocket"',
                  ")",
                  "",
                  "func main() {",
                  '  u, err := url.Parse("${websocketUrl}")',
                  "  if err != nil {",
                  "    log.Fatal(err)",
                  "  }",
                  "",
                  "  conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)",
                  "  if err != nil {",
                  "    log.Fatal(err)",
                  "  }",
                  "  defer conn.Close()",
                  "",
                  "  for {",
                  "    _, message, err := conn.ReadMessage()",
                  "    if err != nil {",
                  "      log.Fatal(err)",
                  "    }",
                  '    fmt.Printf("job event %s\n", message)',
                  "  }",
                  "}",
                ].join("\n"),
            },
          },
          {
            title: "Mark job completed",
            method: "PATCH" as const,
            path: `matching-jobs/${job.id}/`,
            body: { status: JOB_STATUS_TO_API["Completed"] },
          },
          {
            title: "Delete job",
            method: "DELETE" as const,
            path: `matching-jobs/${job.id}/`,
          },
        ];
      })()
    : [];

  if (!job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job not found</CardTitle>
          <CardDescription>Check the URL or return to the jobs list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/jobs">Back to jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleComplete = async () => {
    setIsUpdating(true);
    try {
      await updateJob(job.id, { status: "Completed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteJob(job.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant}>{displayStatus}</Badge>
            <span className="text-xs text-muted-foreground">
              Created {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
          <CardTitle className="text-2xl">{job.name}</CardTitle>
          <CardDescription>
            {template ? (
              <span>
                Based on template
                {" "}
                <Link href={`/templates/${template.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {template.name}
                </Link>
              </span>
            ) : (
              "Template removed"
            )}
          </CardDescription>
          <div className="text-sm text-muted-foreground">
            Last updated {job.lastUpdated}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="uppercase tracking-wide">
            {job.sourceEntityType}
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="uppercase tracking-wide">
            {job.targetEntityType}
          </Badge>
          {job.notes ? (
            <span className="italic text-muted-foreground/80">“{job.notes}”</span>
          ) : null}
          {displayErrorMessage ? (
            <span className="text-destructive">Error: {displayErrorMessage}</span>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleComplete} disabled={isUpdating || job.status === "Completed"}>
          {isUpdating ? "Updating..." : job.status === "Completed" ? "Completed" : "Mark as completed"}
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Removing..." : "Remove job"}
        </Button>
        <DeveloperApiModal requests={developerRequests} triggerLabel="Job API" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
          <CardDescription>{matches.length} surfaced connections.</CardDescription>
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
              {matches.map((match) => (
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
              {matches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No matches yet — queue scoring to populate results.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <JobUpdatesFeed
        events={eventsForFeed}
        connectionState={stream.connectionState}
        error={stream.error}
        isLoading={isLoadingPersistedUpdates && eventsForFeed.length === 0}
      />
    </div>
  );
}
