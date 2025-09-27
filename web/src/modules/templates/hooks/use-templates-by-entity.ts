"use client";

import { useMemo } from "react";

import { EntityType } from "@/types/matching";
import { useTemplates } from "./use-templates";

export function useTemplatesByEntity(entity: EntityType) {
  const { data } = useTemplates();

  return useMemo(() => {
    return data.filter(
      (template) => template.defaultSource === entity || template.defaultTarget === entity,
    );
  }, [data, entity]);
}
