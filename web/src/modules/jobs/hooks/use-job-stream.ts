"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import { MATCHES_KEY } from "@/modules/matches/hooks/use-matches";
import { JOB_STATUS_FROM_API, type ApiJobStatus } from "@/modules/jobs/lib/api";
import { JOBS_KEY } from "@/modules/jobs/hooks/use-jobs";

interface StatusEventState {
  status: ApiJobStatus;
  errorMessage: string | null;
  timestamp: string | null;
}

export type JobStreamConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

export interface JobStreamEntry {
  id: string;
  type: string;
  timestamp?: string;
  title: string;
  description?: string;
  raw: Record<string, unknown>;
}

interface UseJobStreamResult {
  events: JobStreamEntry[];
  status: StatusEventState | null;
  connectionState: JobStreamConnectionState;
  error: string | null;
}

const STATUS_LABELS: Record<ApiJobStatus, string> = {
  queued: JOB_STATUS_FROM_API.queued,
  running: JOB_STATUS_FROM_API.running,
  complete: JOB_STATUS_FROM_API.complete,
  failed: JOB_STATUS_FROM_API.failed,
};

function resolveWebSocketUrl(jobId: string): string {
  const explicitBase = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (explicitBase) {
    const base = explicitBase.endsWith("/") ? explicitBase.slice(0, -1) : explicitBase;
    return `${base}/matching-jobs/${jobId}/`;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const apiUrl = new URL(apiBase);
  const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = new URL(`/ws/matching-jobs/${jobId}/`, apiUrl.origin);
  wsUrl.protocol = wsProtocol;
  return wsUrl.toString();
}

function formatPercentage(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value.toFixed(2);
}

function describeEvent(data: Record<string, unknown>): { title: string; description?: string } {
  const type = typeof data.type === "string" ? data.type : "event";

  switch (type) {
    case "matching.job.status": {
      const status = typeof data.status === "string" ? (data.status as ApiJobStatus) : "queued";
      const label = STATUS_LABELS[status] ?? status;
      const errorMessage = typeof data.error_message === "string" && data.error_message ? data.error_message : undefined;
      return {
        title: `Status updated to ${label}`,
        description: errorMessage ? `Error: ${errorMessage}` : undefined,
      };
    }
    case "matching.job.criteria": {
      const criteria = Array.isArray(data.criteria) ? (data.criteria as Record<string, unknown>[]) : [];
      const labels = criteria
        .map((criterion) => (typeof criterion.label === "string" ? criterion.label : null))
        .filter(Boolean) as string[];
      const title = criteria.length === 1 ? "Prepared 1 search criterion" : `Prepared ${criteria.length} search criteria`;
      const description = labels.length ? labels.join(", ") : undefined;
      return { title, description };
    }
    case "matching.job.source_snippets": {
      const snippets = Array.isArray(data.snippets) ? (data.snippets as Record<string, unknown>[]) : [];
      const parts = snippets
        .map((item) => {
          const id = typeof item.criterion_id === "string" ? item.criterion_id : "criterion";
          const count = typeof item.snippet_count === "number" ? item.snippet_count : 0;
          return `${id}: ${count}`;
        })
        .join(", ");
      return {
        title: "Collected source snippets",
        description: parts || undefined,
      };
    }
    case "matching.job.target.search": {
      const target = (data.target ?? {}) as Record<string, unknown>;
      const name = typeof target.target_name === "string" ? target.target_name : "Target";
      const totalHits = typeof target.total_hits === "number" ? target.total_hits : 0;
      const hits = Array.isArray(target.hits) ? (target.hits as Record<string, unknown>[]) : [];
      const details = hits
        .map((item) => {
          const id = typeof item.criterion_id === "string" ? item.criterion_id : "criterion";
          const count = typeof item.hit_count === "number" ? item.hit_count : 0;
          return `${id}: ${count}`;
        })
        .join(", ");
      return {
        title: `Search completed for ${name} (${totalHits} hits)`,
        description: details || undefined,
      };
    }
    case "matching.job.target.evaluation": {
      const name = typeof data.target_name === "string" ? data.target_name : "Target";
      const average = formatScore(data.average_score);
      const coverage = formatPercentage(data.coverage);
      const descriptionParts = [average ? `Score ${average}` : null, coverage ? `Coverage ${coverage}` : null].filter(Boolean) as string[];
      return {
        title: `Evaluated ${name}`,
        description: descriptionParts.join(" · ") || undefined,
      };
    }
    case "matching.job.target.candidate": {
      const name = typeof data.target_name === "string" ? data.target_name : "Target";
      const score = formatScore(data.score);
      const hitRatio = formatPercentage(data.search_hit_ratio);
      const summary = typeof data.summary_reason === "string" ? data.summary_reason : undefined;
      const descriptionParts = [score ? `Score ${score}` : null, hitRatio ? `Hit ratio ${hitRatio}` : null].filter(Boolean) as string[];
      const description = [descriptionParts.join(" · ") || undefined, summary].filter(Boolean).join(" — ") || undefined;
      return {
        title: `Aggregated candidate ${name}`,
        description,
      };
    }
    case "matching.job.match.persisted": {
      const name = typeof data.target_name === "string" ? data.target_name : "Target";
      const rank = typeof data.rank === "number" ? data.rank : undefined;
      const score = formatScore(data.score);
      const parts = [rank ? `#${rank}` : null, score ? `Score ${score}` : null].filter(Boolean) as string[];
      return {
        title: `Match saved for ${name}`,
        description: parts.join(" · ") || undefined,
      };
    }
    default:
      return {
        title: `Received ${type}`,
      };
  }
}

interface CreateEntryOptions {
  idPrefix?: string;
  stableId?: string;
  fallbackTimestamp?: string;
}

export function createJobStreamEntry(
  data: Record<string, unknown>,
  options: CreateEntryOptions = {},
): JobStreamEntry {
  const { title, description } = describeEvent(data);
  const { idPrefix = "ws", stableId, fallbackTimestamp } = options;
  const timestamp = typeof data.timestamp === "string" ? data.timestamp : fallbackTimestamp;
  const unique = stableId ?? Math.random().toString(36).slice(2);
  return {
    id: `${idPrefix}-${data.type ?? "event"}-${unique}`,
    type: typeof data.type === "string" ? (data.type as string) : "event",
    timestamp,
    title,
    description,
    raw: data,
  };
}

export function useJobStream(jobId?: string | null): UseJobStreamResult {
  const { mutate } = useSWRConfig();
  const [events, setEvents] = useState<JobStreamEntry[]>([]);
  const [status, setStatus] = useState<StatusEventState | null>(null);
  const [connectionState, setConnectionState] = useState<JobStreamConnectionState>(jobId ? "connecting" : "idle");
  const [error, setError] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      jobIdRef.current = null;
      setEvents([]);
      setStatus(null);
      setConnectionState("idle");
      setError(null);
      return;
    }

    jobIdRef.current = jobId;
    let isMounted = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!isMounted || jobIdRef.current !== jobId) {
        return;
      }

      setConnectionState("connecting");
      setError(null);

      const url = resolveWebSocketUrl(jobId);
      try {
        socket = new WebSocket(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open websocket");
        setConnectionState("error");
        return;
      }

      socket.addEventListener("open", () => {
        if (!isMounted) {
          return;
        }
        setConnectionState("open");
      });

      socket.addEventListener("message", (event) => {
        if (!isMounted) {
          return;
        }
        try {
          const parsed = JSON.parse(event.data ?? "{}");
          if (!parsed || typeof parsed !== "object") {
            return;
          }
          const data = parsed as Record<string, unknown>;

          if (data.type === "matching.job.status") {
            const statusValue = typeof data.status === "string" ? (data.status as ApiJobStatus) : "queued";
            const errorMessage = typeof data.error_message === "string" ? data.error_message : null;
            const timestampValue = typeof data.timestamp === "string" ? data.timestamp : null;
            setStatus({ status: statusValue, errorMessage, timestamp: timestampValue });
            mutate(JOBS_KEY);
            if (statusValue === "complete" || statusValue === "failed") {
              mutate(MATCHES_KEY);
            }
          }

          if (data.type === "matching.job.match.persisted") {
            mutate(MATCHES_KEY);
          }

          const entry = createJobStreamEntry(data);
          setEvents((previous) => [entry, ...previous].slice(0, 50));
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      });

      socket.addEventListener("close", (event) => {
        if (!isMounted) {
          return;
        }
        setConnectionState("closed");
        if (event.code !== 1000 && !event.wasClean) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      });

      socket.addEventListener("error", () => {
        if (!isMounted) {
          return;
        }
        setConnectionState("error");
        setError("Connection error");
      });
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Component unmounted");
      } else if (socket && socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [jobId, mutate]);

  const sortedEvents = useMemo(() => {
    const next = [...events];
    next.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (a.timestamp) {
        return -1;
      }
      if (b.timestamp) {
        return 1;
      }
      return 0;
    });
    return next;
  }, [events]);

  return {
    events: sortedEvents,
    status,
    connectionState,
    error,
  };
}
