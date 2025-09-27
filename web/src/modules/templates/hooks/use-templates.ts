"use client";

import useSWR from "swr";

import { fetchTemplates } from "@/modules/templates/lib/api";
import { Template } from "@/types/matching";

const TEMPLATES_KEY = "templates";

export function useTemplates() {
  const { data, error, isLoading, mutate } = useSWR<Template[]>(
    TEMPLATES_KEY,
    fetchTemplates,
    { revalidateOnFocus: false },
  );

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  } as const;
}

export { TEMPLATES_KEY };
