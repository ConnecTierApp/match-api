# Connectier Match API

Connectier's matching service ingests structured and unstructured entity data, creates semantic embeddings, and produces explainable rankings between a source entity (for example, a job) and a pool of targets (such as candidates). The goal is to provide a reusable pipeline that turns raw documents into vector-searchable chunks, runs templated matching jobs, and exposes the results through a REST API and an operator-facing web app.

## What this service does
- Manage generic `Entity` records and the documents that describe them.
- Chunk and embed document text asynchronously, storing vectors in Weaviate Cloud.
- Define reusable `MatchingTemplate`s that capture scoring prompts, weights, and guardrails.
- Launch `MatchingJob`s that compare a source entity to a target pool and persist ranked `Match` results (with optional per-feature breakdowns).
- Serve CRUD endpoints via Django REST Framework and lay groundwork for realtime updates with Django Channels.
- Provide a Next.js dashboard for exploring entities, jobs, and matches.

## Tech stack
**Backend** – Django 4.2 + Django REST Framework, Celery 5 for async work, Django Channels 4 (with Daphne) for websocket support, and psycopg for Postgres access.

**Data & infrastructure** – Postgres 16 for relational data, Redis 6 for Celery broker/result and channel layers, Weaviate Cloud (via `WEAVIATE_ENDPOINT`) as the vector store, all orchestrated locally with Docker Compose (`compose.local.yaml`).

**AI integrations** – OpenAI's Python SDK powers embeddings (default `text-embedding-3-small`) and future LLM-based scoring paths; Weaviate client SDK manages vector inserts/updates.

**Frontend** – Next.js 15 + React 19 UI in `web/`, using Tailwind v4 and Radix primitives. It talks to the API through the `NEXT_PUBLIC_API_BASE_URL` environment variable.

## Architecture at a glance
1. Create or import `Entity` records representing jobs, candidates, courses, etc.
2. Attach one or more `Document`s; saving a document queues `chunk_document_task`, which produces ordered `DocumentChunk`s with metadata about the slice.
3. `embed_document_chunk_task` pushes each chunk to Weaviate, persisting the vector id back onto the chunk for future updates.
4. Configure `MatchingTemplate`s to describe entity pairings, prompt snippets, and scoring weights.
5. Launch `MatchingJob`s with a source entity and a set of `MatchingJobTarget`s; as jobs complete they emit ordered `Match` rows (and optional `MatchFeature`s) for explainability.
6. REST endpoints in `api/core/views.py` expose CRUD operations, while Channels is ready for streaming job-level events once producers publish to the channel layer.

For more domain context, see `docs/models.md`.

## Local development
### Prerequisites
- Docker and Docker Compose
- `.env.local` populated with runtime secrets (see below)
- Node.js 20+ if you plan to run the web app outside Docker

### Start the stack
```bash
docker compose --env-file .env.local -f ./compose.local.yaml up --build
```
This brings up Postgres, Redis, the Django API (served at `http://localhost:8000`), a Celery worker with file watching, and the optional web frontend.

### Django management commands
```bash
docker compose --env-file .env.local -f ./compose.local.yaml run --rm api python manage.py migrate
docker compose --env-file .env.local -f ./compose.local.yaml run --rm api python manage.py createsuperuser
```

### Celery worker
The worker defined in `compose.local.yaml` auto-restarts when Python files change. To bounce it manually:
```bash
docker compose --env-file .env.local -f ./compose.local.yaml restart worker
```

### Web development
The `web/` app can be developed outside Docker:
```bash
cd web
npm install
npm run dev
```
It expects `NEXT_PUBLIC_API_BASE_URL` to point at the running API (defaults to `http://localhost:8000`).

## Environment variables
Define the following in `.env.local` before starting the services:
- `POSTGRES_PASSWORD` – credentials for the local Postgres instance.
- `POSTGRES_SSLMODE` – forwarded into `DATABASE_URL`; typically `prefer` in development.
- `DJANGO_SECRET_KEY` – Django signing key.
- `OPENAI_API_KEY` – used by the embedding pipeline (and future LLM calls).
- `WEAVIATE_ENDPOINT` – domain of your Weaviate Cloud cluster (no protocol).
- `WEAVIATE_API_KEY` – optional API key for Weaviate.
- `WEAVIATE_BEARER_TOKEN` – optional bearer token if your cluster requires SSO headers.
- `DOCUMENT_CHUNK_SIZE` / `DOCUMENT_CHUNK_OVERLAP` – optional overrides for chunking behavior.

## Testing
Run the Django suite inside the API container:
```bash
docker compose --env-file .env.local -f ./compose.local.yaml run --rm api python manage.py test
```
Front-end tests live alongside components in `web/src/` and can be added to `npm test` flows as the UI grows.

## Project layout
- `api/` – Django project (`config/`) and domain app (`core/`) with models, serializers, Celery tasks, and viewsets.
- `api/core/tasks.py` – document chunking + embedding pipeline that talks to OpenAI and Weaviate.
- `api/core/urls.py` – DRF router exposing entities, documents, templates, jobs, matches, and match features.
- `web/` – Next.js app powered by React 19, Tailwind v4, and Radix UI components.
- `docs/` – architectural notes (start with `docs/models.md`).
- `compose.yaml` / `compose.local.yaml` – Docker Compose definitions for production-style and local stacks.
- `AGENTS.md` – repository conventions for structure, tooling, and workflows.

## Additional references
- `docs/models.md` for the relational schema and data flow.
- Celery tasks and matching logic: `api/core/tasks.py`, `api/core/models.py`.
- API surface area: `api/core/views.py`, `api/core/serializers.py`.
