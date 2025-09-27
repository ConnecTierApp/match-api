"use client";

import { useMemo } from "react";

import { useEntities } from "@/modules/entities/hooks/use-entities";
import { useJobs } from "@/modules/jobs/hooks/use-jobs";
import { useMatches } from "@/modules/matches/hooks/use-matches";
import { useTemplates } from "@/modules/templates/hooks/use-templates";

export function useMatchingStats() {
  const { data: templates } = useTemplates();
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches();
  const { data: entities } = useEntities();

  const totalAutoApproved = useMemo(
    () => matches.filter((match) => match.status === "auto_approved").length,
    [matches],
  );

  return {
    templates,
    jobs,
    matches,
    entities,
    totalAutoApproved,
  } as const;
}
