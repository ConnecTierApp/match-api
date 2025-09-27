# Data Model Outline

This project should stay lightweight for a hackathon demo, so the models only cover what we need to ingest entity descriptions, embed them, run matching passes, and store match outputs.

## Core Entities
### Entity
- Represents anything we might match (candidate, job, course, student, etc.).
- Fields: `id`, `external_ref` (optional identifier from the source system), `entity_type` (string enum), `name`, `metadata` (JSONB for small structured details), `created_at`, `updated_at`.
- Reasoning: Everything else in the system hangs off an entity; keeping it generic lets us mix types without schema churn.

### Document
- A text document describing an entity (resume, job description, syllabus).
- Fields: `id`, `entity_id` (FK Entity), `source` (where we got it), `title`, `body`, `metadata` (JSONB), `created_at`.
- Reasoning: Separating documents from entities lets us store multiple descriptions per entity and reprocess them when embeddings improve. When `body` is missing but `source` is provided we scrape markdown via Lightpanda before persisting.

### Chunk
- Small slice of a document used for vector search.
- Fields: `id`, `document_id` (FK Document), `chunk_index`, `text`, `weaviate_vector_id` (string reference to the Weaviate object), `metadata` (JSONB for token counts, etc.), `created_at`.
- Reasoning: Chunking keeps embeddings cheap and improves recall. Vectors now live in Weaviate, so the Django model only needs to remember which object to update or delete there. Chunks are generated asynchronously by a Celery task whenever a document is created.

## Matching Setup
### MatchingTemplate
- Describes how to compare a source entity against a candidate pool.
- Fields: `id`, `name`, `description`, `source_entity_type`, `target_entity_type`, `config` (JSONB for scoring weights, filters, prompt snippets), `created_at`.
- Reasoning: Templates let us reuse the same matching logic across hackathon demos without redeploying.

### MatchingJob
- A single execution of a template for a particular source entity and set of targets.
- Fields: `id`, `template_id` (FK MatchingTemplate), `source_entity_id` (FK Entity), `status` (enum: queued/running/complete/failed), `config_override` (JSONB for one-off tweaks), `created_at`, `started_at`, `finished_at`.
- Candidate pool references: simplest approach is a join table `matching_job_targets` with `matching_job_id`, `entity_id`, `ranking_hint`.
- Reasoning: Jobs let us track progress, rerun, and audit what data went into each match.

## Matching Output
### Match
- The outcome of comparing the source entity to one target within a job.
- Fields: `id`, `matching_job_id` (FK MatchingJob), `source_entity_id`, `target_entity_id`, `score` (float), `explanation` (text or JSON), `rank`, `created_at`.
- Reasoning: We need to surface a ranked list with scores and textual justification. Storing the explanation inline keeps the demo simple.

### MatchFeature (optional for MVP)
- If we need transparency per score component.
- Fields: `id`, `match_id`, `label`, `value_numeric`, `value_text`.
- Reasoning: Useful for debugging, but we can skip unless we have bandwidth.

## Data Flow Summary
1. Create or import `Entity` records.
2. Attach `Document`s with raw text; Celery chunking tasks split them into `Chunk`s and follow-up tasks embed each chunk into Weaviate.
3. Define a `MatchingTemplate` describing how to score.
4. Kick off a `MatchingJob` with a source entity and target pool.
5. Produce `Match` records (and optional `MatchFeature`s) storing scores and explanations.

This keeps the schema minimal, yet covers ingestion, embedding-driven search, and traceable match results.
