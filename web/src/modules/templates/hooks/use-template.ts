"use client";

import { useMemo } from "react";

import { useTemplates } from "./use-templates";

export function useTemplate(templateId?: string | null) {
  const { data } = useTemplates();

  return useMemo(() => {
    if (!templateId) {
      return null;
    }

    return data.find((template) => template.id === templateId) ?? null;
  }, [data, templateId]);
}
