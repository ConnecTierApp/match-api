"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type {
  JobStreamConnectionState,
  JobStreamEntry,
} from "@/modules/jobs/hooks/use-job-stream";

interface JobUpdatesFeedProps {
  events: JobStreamEntry[];
  connectionState: JobStreamConnectionState;
  error?: string | null;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatConnectionState(state: JobStreamConnectionState) {
  switch (state) {
    case "idle":
      return "Waiting to connect";
    case "connecting":
      return "Connecting…";
    case "open":
      return "Streaming live updates";
    case "closed":
      return "Disconnected";
    case "error":
      return "Connection error";
    default:
      return "";
  }
}

function simplifyType(type: string) {
  const token = type.split(".").pop() ?? type;
  return token.replace(/_/g, " ");
}

export function JobUpdatesFeed({ events, connectionState, error }: JobUpdatesFeedProps) {
  const connectionLabel = formatConnectionState(connectionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Realtime updates</CardTitle>
        <CardDescription>
          {connectionLabel}
          {error ? ` — ${error}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No websocket messages yet. Updates will appear here as the job runs.
          </p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const timestamp = formatTimestamp(event.timestamp);
              return (
                <li key={event.id} className="relative border-l border-border pl-4">
                  <span className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
                    <Badge variant="outline" className="text-xs uppercase tracking-wide">
                      {simplifyType(event.type)}
                    </Badge>
                  </div>
                  {timestamp ? (
                    <div className="text-xs text-muted-foreground">{timestamp}</div>
                  ) : null}
                  {event.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
