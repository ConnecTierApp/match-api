export type EntityType =
  | "Candidates"
  | "Roles"
  | "Companies"
  | "Advisors"
  | "Projects"
  | "Skills"
  | "Teams";

export type JobStatus = "Draft" | "Queued" | "Scoring" | "Completed";

export type MatchStatus = "manual_review" | "auto_approved" | "flagged";

export interface Template {
  id: string;
  name: string;
  description: string;
  scoringStrategy: string;
  defaultSource: EntityType;
  defaultTarget: EntityType;
  lastUpdated: string;
}

export interface TemplateInput {
  name: string;
  description: string;
  scoringStrategy: string;
  defaultSource: EntityType;
  defaultTarget: EntityType;
}

export type TemplateUpdate = Partial<TemplateInput>;

export interface Job {
  id: string;
  name: string;
  templateId: string;
  sourceEntity: EntityType;
  targetEntity: EntityType;
  sourceCount: number;
  targetCount: number;
  status: JobStatus;
  createdAt: string;
  notes?: string;
}

export interface JobInput {
  name: string;
  templateId: string;
  sourceEntity: EntityType;
  targetEntity: EntityType;
  sourceCount: number;
  targetCount: number;
  notes?: string;
  status?: JobStatus;
}

export type JobUpdate = Partial<JobInput>;

export interface Match {
  id: string;
  jobId: string;
  score: number;
  sourceName: string;
  targetName: string;
  summary: string;
  status: MatchStatus;
}

export interface MatchInput {
  jobId: string;
  score: number;
  sourceName: string;
  targetName: string;
  summary: string;
  status: MatchStatus;
}

export type MatchUpdate = Partial<Omit<MatchInput, "jobId">>;
