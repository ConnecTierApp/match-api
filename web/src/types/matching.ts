export type EntityType =
  | "Candidates"
  | "Roles"
  | "Companies"
  | "Advisors"
  | "Projects"
  | "Skills"
  | "Teams";

export type JobStatus = "Queued" | "Scoring" | "Completed" | "Failed";

export type MatchStatus = "manual_review" | "auto_approved" | "flagged";

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntityDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  summary: string;
  lastUpdated: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  documents: EntityDocument[];
}

export interface EntityInput {
  name: string;
  type: EntityType;
  summary: string;
}

export type EntityUpdate = Partial<EntityInput>;

export interface EntityDocumentInput {
  title: string;
  content: string;
  tags: string[];
}

export type EntityDocumentUpdate = Partial<EntityDocumentInput>;

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
  sourceEntityId: string;
  sourceEntity: EntityType;
  targetEntity: EntityType;
  sourceCount: number;
  targetCount: number;
  status: JobStatus;
  createdAt: string;
  lastUpdated: string;
  errorMessage?: string;
  config: Record<string, unknown>;
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
  sourceEntityId: string;
  targetEntityId: string;
  createdAt: string;
  updatedAt: string;
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
