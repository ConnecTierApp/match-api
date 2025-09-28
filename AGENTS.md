# Repository Guidelines

## Project Structure & Module Organization
- Root services are orchestrated through `compose.local.yaml`; always work inside those containers.
- Vector storage runs on Weaviate Cloud—set the URL/API key in `.env.local` and never add a local Weaviate container. Always use the `WEAVIATE_ENDPOINT` environment variable name (do not rename it to `WEAVIATE_URL`).
- When wiring OpenAI settings in compose files, only include `OPENAI_API_KEY`; skip optional variables like `OPENAI_API_BASE` or `OPENAI_ORGANIZATION` unless explicitly required.
- Django app lives in `api/`, with configuration under `api/config/` and domain code in `api/core/` (models, tasks, tests).
- Lightpanda scraping lives in `core/lightpanda.py`; use `populate_document_body` instead of bespoke scraping when you need markdown.
- Reusable docs and design notes sit in `docs/`; add new guides there to keep the root uncluttered.

### Web Directory Organization (Next.js)
The `web/` directory follows a structured approach to organize Next.js components, hooks, and shared functionality:

#### Page-Level Organization
- Each page should have its own `components/`, `hooks/`, and `lib/` folders when needed
- Structure: `app/[page]/components/my-component/my-component.tsx`
- Tests are co-located: `app/[page]/components/my-component/my-component.test.tsx`
- DO NOT USE A DIRECTORY CALLED `_components` (with the leading underscore).

#### Component Architecture
- **Simple components**: Single file in component directory
  ```
  app/dashboard/components/
  ├── user-profile/
  │   ├── user-profile.tsx
  │   └── user-profile.test.tsx
  ```

- **Complex components**: Include child `components/` directory with same structure
  ```
  app/dashboard/components/
  ├── data-table/
  │   ├── data-table.tsx
  │   ├── data-table.test.tsx
  │   ├── hooks/
  │   │   └── use-table-sorting/
  │   │       ├── use-table-sorting.ts
  │   │       └── use-table-sorting.test.ts
  │   └── components/
  │       ├── table-header/
  │       │   ├── table-header.tsx
  │       │   └── table-header.test.tsx
  │       └── table-row/
  │           ├── table-row.tsx
  │           └── table-row.test.tsx
  ```

#### Hook Organization
- Component-specific hooks live in the component's `hooks/` directory
- Child components can import hooks from parent components, but not vice-versa
- This maintains a clear dependency hierarchy and prevents circular imports

#### Shared Functionality
- Cross-cutting concerns live in `web/src/modules/` organized by domain
- Structure: `web/src/modules/[domain]/components/` or `web/src/modules/[domain]/hooks/`
- Examples:
  ```
  web/src/modules/
  ├── matching-jobs/
  │   ├── components/
  │   │   └── job-card/
  │   │       ├── job-card.tsx
  │   │       └── job-card.test.tsx
  │   └── hooks/
  │       └── use-job-matching/
  │           ├── use-job-matching.ts
  │           └── use-job-matching.test.ts
  └── user-management/
      ├── components/
      └── hooks/
  ```

#### Naming Conventions
- **All files and directories**: Use `kebab-case` consistently
- **Component files**: Match their directory name (`user-profile/user-profile.tsx`)
- **Hook files**: Descriptive names following React conventions (`use-table-sorting.ts`)
- **Test files**: Same name as source file with `.test` suffix

This structure promotes:
- **Modularity**: Clear separation of concerns
- **Testability**: Tests live alongside code
- **Reusability**: Shared modules prevent duplication
- **Maintainability**: Consistent patterns across the codebase
- **Scalability**: Structure supports growth without reorganization

## Build, Test, and Development Commands
- Start the full stack: `docker compose --env-file .env.local -f ./compose.local.yaml up --build`. This launches Postgres, Redis, API, and worker processes.
- Run Django management commands: `docker compose --env-file .env.local -f ./compose.local.yaml run --rm api python manage.py migrate` (replace `migrate` as needed).
- Execute the Celery worker locally: already included in the stack, but you can restart via `docker compose --env-file .env.local -f ./compose.local.yaml restart worker` when code changes.
- Run test suite: `docker compose --env-file .env.local -f ./compose.local.yaml run --rm api python manage.py test`.
- For development, you do not need to use docker compose for the ./web directory (and ONLY the ./web directory). Just use normal npm commands, etc.

## Coding Style & Naming Conventions
- Python code uses 4-space indentation, `snake_case` for variables/functions, and `CamelCase` for classes.
- Prefer Django conventions: keep business logic in `api/core/` apps and wire routes through `config/urls.py`.
- Adhere to PEP 8; if you need auto-formatting, install `black` and `isort` inside the API container and run them via Docker (`docker compose --env-file .env.local -f ./compose.local.yaml run --rm api black core`).
- Environment variables belong in Compose files or `.env` consumed by Docker; avoid committing secrets.

## Testing Guidelines
- Use Django’s built-in `TestCase` classes stored in `api/core/tests.py`; create module-specific files as features grow.
- Name tests descriptively with the pattern `test_<behavior>_<expected>()` to keep output readable.
- Aim for coverage on model methods, Celery tasks, and API endpoints touched by the demo use cases.

## Commit & Pull Request Guidelines
- Follow short, imperative commit messages (`Add entity chunking task`). The existing history is sparse; keep it consistent moving forward.
- Scope PRs tightly, include context on matching flows touched, and link any hackathon tickets or issue IDs.
- Attach screenshots or brief logs if the change affects API responses or agent runs so reviewers can verify quickly.

## Environment Variables
We use env files or defang.io config (in prod) to manage environment variables. NEVER, EVER update defang config, or update the .env.local file. 


## Context Log
Keep a running log of things you've worked on while completing a task in the `.agent-context` directory. Put the log in an md file named after the task you're working on so that you can check it later if needed. Append to the file regularly.