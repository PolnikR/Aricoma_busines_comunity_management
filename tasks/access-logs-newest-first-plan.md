# Implementation Plan: Access Logs newest first

## Overview
`GET /get_access_logs` returns the last N matching entries in chronological order (oldest first).
The FE selector keeps that order and `AccessLogsTable` paginates from index 0, so page 1 shows the
oldest rows. Reverse the entries in the FE selector so page 1 shows the newest entries.

## Audit (read-only)
- `src/features/platform-administration/audit/model/selectAccessLogs.ts` — `response.entries.map(toAccessLogRecord)`, no ordering.
- Consumers of `selectAccessLogs`: `AccessLogsTable.tsx`, `AuditPage.tsx` (refetch only), `accessLogHooks.test.tsx`.
- `AccessLogsTable.tsx` does not sort; it slices `data` per page, so selector order is display order.
- Table, page and hook tests do **not** bypass the selector. `test/accessLogsFetch.ts`
  (`installAccessLogsFetch`) takes the handler's `AccessLogRecord[]`, maps them with `toWireEntry` into a
  backend-like `{ entries: [...] }` response and serves it through the real generated hook, so every
  test runs through the real `selectAccessLogs`. Handler arrays therefore model the BE wire order
  (oldest first), and the reversal changes what each test sees on screen.
- Tests whose assertions depend on that order (default page size 25, 26 fixture entries):
  - `components/AccessLogsTable.test.tsx` — "keeps pagination local and resets its page and selection
    for a new applied query": expects `GET /api/entries/1` on page 1, `/api/entries/26` on page 2 and
    `DELETE /api/reloaded/1` on page 1 after the reload. After the change page 1 holds entries 26…2,
    page 2 holds entry 1, and the reloaded page 1 starts with `/api/reloaded/26`.
  - `pages/AuditPage.test.tsx` — "uses local pagination and opens the selected log details": expects
    `/api/entry/1` on page 1 and `/api/entry/26` on page 2.
  - `pages/AuditPage.test.tsx` — "returns to page one when Clear all is used while the applied filters
    are already defaults": same page 1 / page 2 expectations, plus `/api/entry/1` on page 1 after Clear all.
- Order-independent (verified): the other multi-entry table tests look rows up by name; hook tests
  assert `data[0]` only with single-entry responses.
- No uncommitted changes in `src/features/platform-administration/audit/`.

## Architecture Decisions
- Reverse in the selector, not in the table or BE: one place, covers every consumer, no BE contract change.
- Reverse the BE order instead of sorting by `timestamp`: raw fallback entries have no timestamp, and
  the BE order is already chronological. Copy before reversing (`[...entries].reverse()`) so the
  React Query cache's response object is not mutated.
- No changes to generated Orval files or the BE.
- Keep `test/accessLogsFetch.ts` unchanged: it correctly models the BE wire order. Update the three
  order-dependent tests' expectations to newest first instead, so they assert the new behavior
  (page 1 starts with the newest entry, the oldest entry moves to the last page).
- Selector change and test updates land in one task/commit: either alone leaves the suite red.

## Task List
- [ ] Task 1: Reverse access-log entries in `selectAccessLogs` (see `tasks/access-logs-newest-first-todo.md`)

### Checkpoint: Complete
- [ ] Focused audit tests pass
- [ ] Committed with only the selector, its test, the two updated pagination test files and these plan files' checkbox updates

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Pagination tests in `AccessLogsTable.test.tsx` and `AuditPage.test.tsx` assume oldest-first order | High (known red) | Update their expectations to newest first in the same task |
| Another access-log test depends on the BE order unnoticed | Low | Run all four access-log test files under `audit/` |
| Mutating the cached response | Low | Copy the array before `reverse()`; test asserts input is unchanged |

## Open Questions
- None.
