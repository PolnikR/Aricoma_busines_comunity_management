# Implementation Plan: Recovery Runs

## Overview
Build the real `RecoveryRunsPage` feature designed in brainstorming: an overview table showing only the *latest* orchestrator run per recovery application that has actually been pushed to orchestration (bounded set, cheap `limit=1` calls), and a detail drawer with the full paginated run history for one app, fetched only on demand. `/recovery-plans/recovery-runs` currently redirects to `recovery-actions/history` as a stub — this replaces that stub with the real page. Reuses `DataTable`, `TableToolbar`, `InventoryShell`, `DetailDrawer`, `DataTablePagination`, and `Badge` throughout rather than building new list/detail chrome.

## Architecture Decisions
- `GET /get_orchestrator_runs` requires `provider_id` + `dag_id` per call, with no bulk/multi-DAG mode (confirmed against `openapi/abco-api.json:1207-1270`). The response (`OrchestratorRunsResponse`) is deliberately permissive (`{ provider_id, dag_id, [key: string]: unknown }`) — it's Airflow's own `dagRuns` payload passed through, not validated by this backend's schema. A local mapper parses the `dag_runs` array using field names confirmed against a real captured response (below) instead of relying on `parseGeneratedResponse`/Zod (there's no generated Zod schema for this response, unlike other endpoints in this codebase).
- Bound the app set client-side: only `RecoveryAppRecord`s with a non-null `airflow_run_id` actually have a queryable Airflow DAG — `push_to_orchestrator === true` alone is just intent and doesn't guarantee a run id was ever received (a submission could fail partway). `useRecoveryApplications()` (existing) is filtered on `Boolean(airflow_run_id)` before any run is ever fetched.
- The Airflow DAG id is **not** the recovery app's own `id`. It's constructed as `` `dag_${airflow_run_id}` `` — confirmed directly from the OpenAPI spec's own description text on two other endpoints (`openapi/abco-api.json:1486,1826`: *"tear down the leftover Airflow DAG (`dag_<run_id>`)"*). `dag_id` for `/get_orchestrator_runs` must be built this way, not passed as the app's `id`.
- Single orchestration provider assumption (confirmed): find the one AIRFLOW-type provider via the existing `usePlatformProviders()`/`getEligiblePlatformProviders` helper already used in `RecoveryAppBuilder.tsx`'s orchestration step — no per-provider fan-out.
- Two distinct query shapes, matching the two-tier design: the overview fans out with `useQueries` (`limit: 1` per app — same pattern `useRecoveryGroupRelatedVolumes.ts` already establishes for "one query per item in a list"), while the drawer uses one plain `useQuery` per opened app, paginated via the endpoint's existing `limit`/`offset`/`order_by` params.
- Status → `Badge` color mapping: `success` → `success`, `running` → `info`, `failed` → `error`, anything else (`queued`, `scheduled`, unknown) → `light`. No new badge/pill component — `Badge` already supports this.

## Task List

### Phase 1: Foundation (models, API, query keys)
- [ ] Task 1: Create `src/features/recovery-plans/recovery-runs/model/recoveryRunTypes.ts` — `OrchestratedApp { id, name, dagId }` (`dagId` precomputed as `` `dag_${airflow_run_id}` `` — see Architecture Decisions), `OrchestratorRun { runId, status, startedAt, endedAt, durationSeconds }`, `OrchestratorRunsPage { runs: OrchestratorRun[], total: number }`.
- [ ] Task 2: Create `src/features/recovery-plans/recovery-runs/helpers/mapOrchestratorRuns.ts` — parses the raw `OrchestratorRunsResponse`'s `dag_runs` array using confirmed real Airflow field names (captured from an actual response, see below): `dag_run_id` → runId, `state` → status, `start_date` → startedAt (fallback `logical_date` while still queued/no start yet), `end_date` → endedAt, `duration` → durationSeconds (Airflow already computes this — don't derive it from start/end), `total_entries` → total. Still defensive (optional chaining, no throwing) since fields can be legitimately absent per run state (e.g. `end_date`/`duration` null while running).

**Confirmed real response shape** (captured from the actual backend):
```json
{
  "provider_id": "airflow-01",
  "dag_id": "dag_260818094526_2918dccb",
  "dag_runs": [
    {
      "dag_run_id": "scheduled__2026-08-18T00:00:00+00:00",
      "logical_date": "2026-08-18T00:00:00Z",
      "start_date": "2026-08-18T09:46:40.607667Z",
      "end_date": "2026-08-18T09:46:50.636064Z",
      "duration": 10.028397,
      "state": "failed"
    }
  ],
  "total_entries": 1,
  "next_cursor": null,
  "previous_cursor": null
}
```
(trimmed to the fields the mapper uses; the real payload also carries `queued_at`, `run_type`, `dag_versions`, etc., which the mapper ignores)
- [ ] Task 3: Create `src/features/recovery-plans/recovery-runs/api/recoveryRunsApi.ts` — `fetchOrchestratorRuns(providerId, dagId, { limit, offset, orderBy })` calling the generated `getOrchestratorRunsGetOrchestratorRunsGet`, following the try/catch + `OrvalApiError` message pattern in `recoveryApplicationsApi.ts`.
- [ ] Task 4: Create `src/features/recovery-plans/recovery-runs/api/recoveryRunsQueryKeys.ts` (pattern: `discoveryInventoryKeys`) — `recoveryRunsKeys.latest(providerId, dagId)`, `.history(providerId, dagId, page, pageSize)`.

### Checkpoint: Foundation
- [ ] `npm run typecheck` clean
- [ ] Unit test for `mapOrchestratorRuns.ts` covering a realistic Airflow payload and a malformed/missing-field one

### Phase 2: Hooks
- [ ] Task 5: Create `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts` — combines `useRecoveryApplications()` + `usePlatformProviders()`, filters to `Boolean(record.airflow_run_id)` (not `push_to_orchestrator` — see Architecture Decisions), maps each to `{ id, name, dagId: `dag_${airflow_run_id}` }`, finds the single AIRFLOW provider id (reuse `getEligiblePlatformProviders`), returns `{ apps: OrchestratedApp[], providerId: string | null, isLoading, error }`.
- [ ] Task 6: Create `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedAppRuns.ts` — `useQueries` fan-out over `apps`, one `fetchOrchestratorRuns(providerId, app.dagId, { limit: 1 })` per app (note: `app.dagId`, not `app.id`), same shape as `useRecoveryGroupRelatedVolumes.ts` (per-item `enabled`, `staleTime`/`gcTime`, `retry: 1`). Returns one summary row per app (latest run or `null`).
- [ ] Task 7: Create `src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.ts` — plain `useQuery` keyed on `app.dagId`, enabled only while a drawer is open for one app, paginated (`limit`/`offset` from page/pageSize), returns `{ runs, total }`.

### Checkpoint: Hooks
- [ ] Hook tests: `useOrchestratedApps` filters out records with no `airflow_run_id` (regardless of `push_to_orchestrator`) and computes `dagId` correctly; `useOrchestratedAppRuns` only queries the filtered set, passes `limit: 1`, and calls with `dagId` (not the app's own `id`); `useAppRunHistory` stays disabled until given a `dagId`

### Phase 3: UI (reusing shared components)
- [ ] Task 8: Create `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx` — `DataTable` + `DataTableToolbar` (search by app name/id) + `DataTableSkeleton`/`DataTableRequestState` for loading/error, `Badge` for the status pill (mapping above), row click sets the selected app id.
- [ ] Task 9: Create `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.tsx` — `DetailDrawer` (eyebrow "Run history", title = app name, subtitle = the app's own business `id`, shown to the human — the drawer's data fetch underneath uses `dagId`, not this subtitle value) with a run-row list built from `useAppRunHistory`, `DataTablePagination` in the footer.
- [ ] Task 10: Create `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx` — `TableToolbar` + `InventoryShell`, matching `PolicySetsPage.tsx`'s structure exactly; composes `useOrchestratedApps` → `useOrchestratedAppRuns` → `RecoveryRunsTable`, plus `RecoveryRunHistoryDrawer` for the selected app.

### Checkpoint: UI
- [ ] Component tests: table renders one row per orchestrated app with the right status color; clicking a row opens the drawer for that app; drawer pagination requests the next page

### Phase 4: Wire up routing, nav, translations
- [ ] Task 11: `src/app/AppRoutes.tsx` — replace the `recovery-runs` route's `<Navigate to={routes.recoveryActionHistory} />` with the lazy-loaded `RecoveryRunsPage` (same `Suspense`/`RouteLoadingSkeleton` pattern as sibling routes).
- [ ] Task 12: `src/layouts/app-shell/AppSidebar.tsx` — add a "Recovery Runs" sub-item under "Recovery Plans" (`path: routes.recoveryRuns`), add its `nav.recovery.runs` translation mapping.
- [ ] Task 13: Translations (en/sk/cs) — reuse existing `pages.recoveryRuns.title`/`.description`; add `recoveryRuns.*` keys for table columns, status labels, search placeholder/label, drawer eyebrow/note, and `nav.recovery.runs`.

### Checkpoint: Complete
- [ ] Full focused test run across every file created/touched in Phases 1-4
- [ ] `npm run typecheck` and `eslint` clean
- [ ] Manual note: no browser available in this environment to visually confirm the route renders — flagged, not silently skipped

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| A run's fields can legitimately be absent depending on state (`end_date`/`duration` null while running, `start_date` null while still queued) | Medium — naive parsing could show wrong/blank data | Mapper handles each field's known-absent cases explicitly (fallbacks and nulls), not just generic optional chaining; unit test covers a "queued, not yet started" run alongside the full/completed one |
| No orchestration provider configured at all (e.g. fresh install) | Low | `useOrchestratedApps` returns `providerId: null`; the page shows the existing empty-state pattern, no queries fire |
| A recovery app is deleted after being orchestrated, but Airflow still has its DAG runs | Low | Out of scope — the overview is driven by the current recovery-apps list, matching how the rest of this app already treats deleted-but-still-referenced ids (e.g. policy set "unavailable" notices) |

## Open Questions
None — data flow, provider-count assumption, and status→color mapping were all settled during brainstorming.
