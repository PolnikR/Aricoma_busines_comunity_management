# Implementation Plan: Access Log Request Metadata in the Detail Drawer

## Overview

The backend access log entry (`GET /get_access_logs`) now carries three fields the frontend contract does not know about: `query_string`, `user_agent` and `referer`. Because the backend publishes an untyped `{}` response, our contract lives in the Orval spec patch `scripts/orval/specPatches/data/accessLogs.json`; the generated Zod object strips unknown keys, so the new fields are silently dropped today.

Goal: show the three fields in the Request section of the Access Log detail drawer. The Access Logs table (columns and cell content) stays unchanged.

Observed backend sample (2026-10-01):

```json
{
  "timestamp": "2026-10-01T17:25:32.552222+00:00",
  "user": "admin",
  "method": "GET",
  "path": "/get_providers",
  "query_string": "role=all",
  "user_agent": "Mozilla/5.0 (...) Edg/154.0.0.0",
  "referer": "http://localhost:5173/discovery-inventory/resources",
  "status": 200,
  "duration_ms": 2.1,
  "request_body": null,
  "response_body": { "...": "..." }
}
```

## Architecture Decisions

- **Contract via spec patch, not hand-edited generated files.** Add the three properties to `AccessLogEntry` in `accessLogs.json` and regenerate with `npm run api:generate`. The patch stays in place (`isObsolete` still guards against the backend publishing its own schema).
- **Fields are optional and nullable (`string | null`, not in `required`).** Older log lines written before the backend change do not contain them; making them required would fail validation of the whole response. Same treatment as `user`.
- **Domain names in camelCase at the API seam.** `AccessLogRequestRecord` gains optional `queryString`, `userAgent`, `referer`; `selectAccessLogs` maps them and omits `null`, mirroring the existing `user` handling.
- **Missing values render as `—`.** A row is always shown; an absent, `null` or empty-string value renders `—` (an empty `query_string` is the likely backend value for requests without a query). Matches the existing `—` convention in `AccessLogsTable` and Identity Access drawers.
- **Placement in the Request section:** Method, Path, **Query string**, Status, Duration, **User agent**, **Referer**. Query string and Referer use monospace like Path; User agent must wrap (`break-words`) because it is long.
- **Table untouched.** No column, cell or `AccessLogsTable.tsx` change.

## Task List

### Phase 1: Contract

- [x] Task 1: Extend the `AccessLogEntry` spec patch with `query_string`, `user_agent`, `referer` and regenerate Orval/Zod.

### Checkpoint: Contract

- [x] `npm run api:check` passes.
- [x] Generated `accessLogEntry.gen.ts` / `accessLogsResponse.gen.ts` contain the three fields as optional nullable strings; no hand edits.

### Phase 2: Domain model

- [x] Task 2: Map the new wire fields into `AccessLogRequestRecord` and the test wire stub.

### Phase 3: Drawer UI

- [x] Task 3: Show Query string, User agent and Referer in the drawer Request section with `—` fallback and en/cs/sk labels.

### Checkpoint: Complete

- [x] Focused audit tests pass.
- [ ] Browser check: drawer shows the three values for a real request, `—` for a request without query string; table columns unchanged.
- [x] Each task committed atomically; unrelated pre-existing locale changes are not staged.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Older log lines lack the fields | High (whole response fails validation if required) | Keep fields optional + nullable; test an entry without them |
| Backend sends `""` instead of `null` for empty query | Low | Drawer treats empty string as missing (`—`) |
| `src/locales/*.json` already have uncommitted unrelated changes | Med (accidental inclusion in commit) | Stage only the new keys (cached patch via `git apply --cached`), verify with `git diff --cached` before commit |
| Long user agent breaks drawer layout | Low | Wrap with `break-words`; verify in browser at narrow drawer width |

## Open Questions

- None blocking. Whether the backend always sends the fields for new entries is not confirmed; the optional contract covers both cases.

## Tasks

Detailed tasks with acceptance criteria: `tasks/access-log-request-metadata-todo.md`.
