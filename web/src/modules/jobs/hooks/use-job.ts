"use client";

import { useMemo } from "react";

import { useJobs } from "./use-jobs";

export function useJob(jobId?: string | null) {
  const { data } = useJobs();

  return useMemo(() => {
    if (!jobId) {
      return null;
    }

    return data.find((job) => job.id === jobId) ?? null;
  }, [data, jobId]);
}
