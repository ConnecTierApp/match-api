import { EntityType, Job, Match, MatchStatus, Template } from "@/types/matching";

export const entityOptions: EntityType[] = [
  "Candidates",
  "Roles",
  "Companies",
  "Advisors",
  "Projects",
  "Skills",
  "Teams",
];

export function generateId(prefix: string) {
  const randomKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomKey}`;
}

export function getStatusBadgeVariant(status: MatchStatus) {
  switch (status) {
    case "auto_approved":
      return "success";
    case "manual_review":
      return "warning";
    case "flagged":
    default:
      return "secondary";
  }
}

export function generateMatchesForJob(job: Job): Match[] {
  const examplePairs = [
    {
      source: `${job.sourceEntity} prospect ${Math.floor(Math.random() * 300 + 10)}`,
      target: `${job.targetEntity} target ${Math.floor(Math.random() * 60 + 1)}`,
      summary: "High overlap on skills, strong culture signals, and complementary experience.",
    },
    {
      source: `${job.sourceEntity} prospect ${Math.floor(Math.random() * 300 + 310)}`,
      target: `${job.targetEntity} target ${Math.floor(Math.random() * 60 + 61)}`,
      summary: "Alignment on seniority and domain expertise with positive feedback loops.",
    },
    {
      source: `${job.sourceEntity} prospect ${Math.floor(Math.random() * 300 + 610)}`,
      target: `${job.targetEntity} target ${Math.floor(Math.random() * 60 + 121)}`,
      summary: "Strong values fit, relevant outcomes in last two roles, and balanced location/timezone overlap.",
    },
  ];

  return examplePairs.map((pair, index) => ({
    id: generateId("mtch"),
    jobId: job.id,
    sourceEntityId: generateId("src-ent"),
    targetEntityId: generateId("tgt-ent"),
    score: Math.min(99, 86 + index * 3 + Math.floor(Math.random() * 5)),
    sourceName: pair.source,
    targetName: pair.target,
    summary: pair.summary,
    status: index === 1 ? "manual_review" : "auto_approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export const initialTemplates: Template[] = [
  {
    id: "tmpl-1",
    name: "Machine Learning Engineers → Staff Roles",
    description:
      "Prioritize candidates with production ML experience, strong Python, and leadership signals.",
    scoringStrategy: "Hybrid semantic + structured weighting",
    defaultSource: "Candidates",
    defaultTarget: "Roles",
    lastUpdated: "2 days ago",
  },
  {
    id: "tmpl-2",
    name: "Portfolio Company ↔ Advisors",
    description: "Find advisors who have scaled similar GTM motions in the last 5 years.",
    scoringStrategy: "Vector search on deal room signals",
    defaultSource: "Companies",
    defaultTarget: "Advisors",
    lastUpdated: "4 hours ago",
  },
];

export const initialJobs: Job[] = [
  {
    id: "job-1",
    name: "Q1 Bay Area ML Hiring Push",
    templateId: "tmpl-1",
    sourceEntityId: "entity-source-1",
    sourceEntity: "Candidates",
    targetEntity: "Roles",
    sourceCount: 428,
    targetCount: 36,
    status: "Completed",
    createdAt: "2024-10-02",
    lastUpdated: "2 days ago",
    notes: "Focus on hybrid-friendly teams.",
    config: {
      display_name: "Q1 Bay Area ML Hiring Push",
      source_entity_type: "Candidates",
      target_entity_type: "Roles",
      source_count: 428,
      target_count: 36,
      notes: "Focus on hybrid-friendly teams.",
    },
  },
  {
    id: "job-2",
    name: "Advisor refresh for Fintech pod",
    templateId: "tmpl-2",
    sourceEntityId: "entity-source-2",
    sourceEntity: "Companies",
    targetEntity: "Advisors",
    sourceCount: 62,
    targetCount: 147,
    status: "Scoring",
    createdAt: "2024-10-20",
    lastUpdated: "12 hours ago",
    notes: "Prioritize operators who have scaled B2B fintech.",
    config: {
      display_name: "Advisor refresh for Fintech pod",
      source_entity_type: "Companies",
      target_entity_type: "Advisors",
      source_count: 62,
      target_count: 147,
      notes: "Prioritize operators who have scaled B2B fintech.",
    },
  },
];

export const initialMatches: Match[] = [
  {
    id: "mtch-1",
    jobId: "job-1",
    sourceEntityId: "entity-source-1",
    targetEntityId: "entity-target-1",
    score: 94,
    sourceName: "Ada Fernandez",
    targetName: "Staff ML Engineer @ FusionAI",
    summary: "7y applied ML + led vectorization rollout across search stack.",
    status: "auto_approved",
    createdAt: "2024-10-02T10:00:00Z",
    updatedAt: "2024-10-02T12:00:00Z",
  },
  {
    id: "mtch-2",
    jobId: "job-1",
    sourceEntityId: "entity-source-3",
    targetEntityId: "entity-target-2",
    score: 89,
    sourceName: "Rakesh Shah",
    targetName: "Senior Applied Scientist @ Skyline",
    summary: "Deep ranking expertise, worked with similar hiring managers.",
    status: "manual_review",
    createdAt: "2024-10-02T11:00:00Z",
    updatedAt: "2024-10-02T13:00:00Z",
  },
  {
    id: "mtch-3",
    jobId: "job-2",
    sourceEntityId: "entity-source-4",
    targetEntityId: "entity-target-3",
    score: 86,
    sourceName: "Summit Analytics",
    targetName: "Jules Carter",
    summary: "Scaled fintech GTM, exited 2 advisory engagements in 2023.",
    status: "auto_approved",
    createdAt: "2024-10-21T09:00:00Z",
    updatedAt: "2024-10-21T09:30:00Z",
  },
];
