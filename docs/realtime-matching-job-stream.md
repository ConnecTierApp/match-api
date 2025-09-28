# Realtime Matching Job Stream

This guide explains how to consume websocket updates that describe the lifecycle of a matching job. The stream is designed for developers who need live feedback on long-running matches (e.g. UI dashboards, developer tooling, or monitoring).

## Websocket endpoint

- **URL:** `ws/matching-jobs/{job_id}` (replace `{job_id}` with the UUID of the matching job)
- **Auth:** requests pass through Django's `AuthMiddlewareStack`, so reuse the same session/cookie auth as the regular API.
- **Channel group:** internally the socket subscribes to the Channels group returned by `matching.events.group_name_for_job(job_id)`.
- **Behaviour:** the socket is broadcast-only. Inbound messages are ignored and the server will close the socket with code `4001` when the `job_id` is invalid.

## Event payloads

All events are instances of the Pydantic models defined in `api/matching/events.py`. Each payload contains a `type`, `job_id`, and `timestamp` with additional fields depending on the event. Messages are delivered as JSON objects via the `matching.job.event` channel type.

| Event type | Purpose | Payload snapshot |
| --- | --- | --- |
| `matching.job.status` | Broadcast current job status changes (`queued`, `running`, `complete`, `failed`). | `{ "status": "running", "error_message": null }` |
| `matching.job.criteria` | Lists the search criteria prepared for the run. Useful for showing the plan before results arrive. | `{ "criteria": [{ "id": "criterion-1", "label": "Product skills", ... }] }` |
| `matching.job.source_snippets` | Reports how many source snippets were retrieved for each criterion. | `{ "snippets": [{ "criterion_id": "criterion-1", "snippet_count": 3 }] }` |
| `matching.job.target.search` | Emitted after we fetch vector hits for a target. Includes total hits and counts per criterion. | `{ "target": { "target_id": "…", "hits": … } }` |
| `matching.job.target.evaluation` | Contains the LLM scoring output per target with coverage metadata and per-criterion reasoning. | `{ "target_id": "…", "average_score": 2.5, "evaluations": [...] }` |
| `matching.job.target.candidate` | Aggregated candidate view combining search coverage, score, and summary reason. Fires once per target after evaluation. | `{ "target_id": "…", "score": 0.82, "search_hit_ratio": 0.66 }` |
| `matching.job.match.persisted` | Sent after results are committed to the database with the final rank. | `{ "match_id": "…", "rank": 1 }` |

> **Note:** field names above are abbreviated for readability. Refer to the corresponding Pydantic models for the canonical schema.

### Sample lifecycle

```json
{
  "type": "matching.job.status",
  "job_id": "8dc1f15e-52bd-4a4c-9f7a-40dd6aacd21e",
  "timestamp": "2025-03-28T17:10:54.912345Z",
  "status": "running"
}
{
  "type": "matching.job.criteria",
  "job_id": "8dc1f15e-52bd-4a4c-9f7a-40dd6aacd21e",
  "timestamp": "2025-03-28T17:10:55.013582Z",
  "criteria": [
    { "id": "role-fit", "label": "Role fit", "weight": 1.0, "source_snippet_limit": 3, "target_snippet_limit": 3 }
  ]
}
{
  "type": "matching.job.target.search",
  "job_id": "8dc1f15e-52bd-4a4c-9f7a-40dd6aacd21e",
  "timestamp": "2025-03-28T17:10:57.044121Z",
  "target": {
    "target_id": "a41bb823-a9e0-4f27-9e2b-ccb91a30b936",
    "target_name": "Acme Corp",
    "total_hits": 5,
    "hits": [
      { "criterion_id": "role-fit", "hit_count": 5 }
    ]
  }
}
```

### Ordering & delivery

Events are emitted synchronously from the Celery task as the matching engine advances through the pipeline. Ordering reflects the execution order, but websocket delivery still depends on the backing channel layer (Redis). Consumers should be tolerant of small delays or dropped messages.

## Extending the stream

To add new realtime events, implement a helper on `matching.events.MatchingJobEventPublisher` (or subclass) and emit it from the relevant stage. The websocket consumer automatically forwards any payload published through the `matching.job.event` channel type.

For environments where websockets are not required, swap the publisher with `matching.events.NullMatchingJobEventPublisher` to disable broadcasting without changing orchestrator logic.
