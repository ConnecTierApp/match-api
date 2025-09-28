"use client";

import { FormEvent, useMemo, useState } from "react";

import { ManualMatchCard } from "./components/manual-match-card";
import { MatchesReviewCard } from "./components/matches-review-card";
import { useJobs } from "@/modules/jobs/hooks/use-jobs";
import { useMatchMutations } from "@/modules/matches/hooks/use-match-mutations";
import { useMatches } from "@/modules/matches/hooks/use-matches";
import { MatchInput } from "@/types/matching";

const defaultMatchDraft: MatchInput = {
  jobId: "",
  score: 90,
  sourceName: "",
  targetName: "",
  summary: "",
  status: "manual_review",
};

export default function MatchesPage() {
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches();
  const { createMatch } = useMatchMutations();

  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [draft, setDraft] = useState<MatchInput>({
    ...defaultMatchDraft,
    jobId: jobs[0]?.id ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMatches = useMemo(() => {
    if (selectedJobId === "all") {
      return matches;
    }
    return matches.filter((match) => match.jobId === selectedJobId);
  }, [matches, selectedJobId]);

  const totalAutoApproved = useMemo(
    () => filteredMatches.filter((match) => match.status === "auto_approved").length,
    [filteredMatches],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.jobId || !draft.sourceName.trim() || !draft.targetName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createMatch(draft);
      setDraft((prev) => ({
        ...defaultMatchDraft,
        jobId: prev.jobId,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <MatchesReviewCard
        jobs={jobs}
        matches={filteredMatches}
        selectedJobId={selectedJobId}
        onSelectJob={setSelectedJobId}
        totalAutoApproved={totalAutoApproved}
      />
      <ManualMatchCard
        jobs={jobs}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
