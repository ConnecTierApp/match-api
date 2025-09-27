# Repository Guidelines

## Project Structure & Module Organization
- Root services are orchestrated through `compose.local.yaml`; always work inside those containers.
- Django app lives in `api/`, with configuration under `api/config/` and domain code in `api/core/` (models, tasks, tests).
- Reusable docs and design notes sit in `docs/`; add new guides there to keep the root uncluttered.

## Build, Test, and Development Commands
- Start the full stack: `docker compose -f compose.local.yaml up --build`. This launches Postgres (with pgvector), Redis, API, worker, and model mocks.
- Run Django management commands: `docker compose -f compose.local.yaml run --rm api python manage.py migrate` (replace `migrate` as needed).
- Execute the Celery worker locally: already included in the stack, but you can restart via `docker compose -f compose.local.yaml restart worker` when code changes.
- Run test suite: `docker compose -f compose.local.yaml run --rm api python manage.py test`.

## Coding Style & Naming Conventions
- Python code uses 4-space indentation, `snake_case` for variables/functions, and `CamelCase` for classes.
- Prefer Django conventions: keep business logic in `api/core/` apps and wire routes through `config/urls.py`.
- Adhere to PEP 8; if you need auto-formatting, install `black` and `isort` inside the API container and run them via Docker (`docker compose -f compose.local.yaml run --rm api black core`).
- Environment variables belong in Compose files or `.env` consumed by Docker; avoid committing secrets.

## Testing Guidelines
- Use Django’s built-in `TestCase` classes stored in `api/core/tests.py`; create module-specific files as features grow.
- Name tests descriptively with the pattern `test_<behavior>_<expected>()` to keep output readable.
- Aim for coverage on model methods, Celery tasks, and API endpoints touched by the demo use cases.

## Commit & Pull Request Guidelines
- Follow short, imperative commit messages (`Add entity chunking task`). The existing history is sparse; keep it consistent moving forward.
- Scope PRs tightly, include context on matching flows touched, and link any hackathon tickets or issue IDs.
- Attach screenshots or brief logs if the change affects API responses or agent runs so reviewers can verify quickly.
