"use client";

import useSWR from "swr";

import { fetchWorkspaces } from "@/modules/workspaces/lib/api";
import { Workspace } from "@/types/matching";

const WORKSPACES_KEY = "workspaces";

export function useWorkspaces() {
  const { data, error, isLoading, mutate } = useSWR<Workspace[]>(WORKSPACES_KEY, fetchWorkspaces, {
    revalidateOnFocus: false,
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  } as const;
}

export { WORKSPACES_KEY };
