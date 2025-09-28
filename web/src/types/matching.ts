export type EntityType = string;

export interface EntityTypeDefinition {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  metadata: Record<string, unknown>;
  workspaceSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntityTypeInput {
  slug: string;
  displayName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export type EntityTypeUpdate = Partial<EntityTypeInput>;

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
  source: string | null;
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
  source?: string | null;
}

export type EntityDocumentUpdate = Partial<EntityDocumentInput>;

export interface MatchingCriterion {
  id: string;
  label: string;
  prompt: string;
  weight: number;
  guidance?: string;
  sourceLimit: number;
  targetLimit: number;
}

export interface MatchingCriterionInput {
  id?: string;
  label: string;
  prompt: string;
  weight?: number;
  guidance?: string;
  sourceLimit?: number;
  targetLimit?: number;
}

export interface MatchingConfiguration {
  scoringStrategy?: string;
  description?: string;
  searchCriteria: MatchingCriterion[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  scoringStrategy: string;
  defaultSource: EntityType;
  defaultTarget: EntityType;
  criteria: MatchingCriterion[];
  lastUpdated: string;
}

export interface TemplateInput {
  name: string;
  description: string;
  scoringStrategy: string;
  defaultSource: EntityType;
  defaultTarget: EntityType;
  criteria: MatchingCriterionInput[];
}

export type TemplateUpdate = Partial<TemplateInput>;

export interface Job {
  id: string;
  name: string;
  templateId: string;
  sourceEntityId: string;
  sourceEntityType: EntityType;
  targetEntityType: EntityType;
  status: JobStatus;
  createdAt: string;
  lastUpdated: string;
  errorMessage?: string;
  config: Record<string, unknown>;
  notes?: string;
}

export interface JobInput {
  displayName: string;
  templateId: string;
  sourceEntityId: string;
  targetEntityType: EntityType;
  status?: JobStatus;
  notes?: string;
  searchCriteria?: MatchingCriterionInput[];
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
