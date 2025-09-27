"use client";

import { useMemo } from "react";

import { useMatches } from "./use-matches";

export function useMatch(matchId?: string | null) {
  const { data } = useMatches();

  return useMemo(() => {
    if (!matchId) {
      return null;
    }

    return data.find((match) => match.id === matchId) ?? null;
  }, [data, matchId]);
}
