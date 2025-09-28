"use client";

import useSWR from "swr";

import { ApiJobUpdate, fetchJobUpdates } from "@/modules/jobs/lib/api";

const JOB_UPDATES_KEY_PREFIX = "job-updates";

export function useJobUpdates(jobId?: string | null, limit = 50) {
  const key = jobId ? `${JOB_UPDATES_KEY_PREFIX}:${jobId}:${limit}` : null;

  const { data, error, isLoading, mutate } = useSWR<ApiJobUpdate[]>(
    key,
    () => fetchJobUpdates(jobId as string, limit),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  } as const;
}

export type { ApiJobUpdate };
export { JOB_UPDATES_KEY_PREFIX };
