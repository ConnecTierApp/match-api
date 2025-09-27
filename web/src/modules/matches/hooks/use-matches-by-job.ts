"use client";

import { useMatches } from "./use-matches";

export function useMatchesByJob(jobId?: string | null) {
  const { data, isLoading, error } = useMatches();

  const filtered = jobId ? data.filter((match) => match.jobId === jobId) : data;

  return {
    data: filtered,
    isLoading,
    error,
  } as const;
}
