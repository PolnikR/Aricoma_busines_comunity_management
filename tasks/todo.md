# Recovery Runs - Task Checklist

## Phase 1: Foundation

### Task 1: Model types
- [x] Create `src/features/recovery-plans/recovery-runs/model/recoveryRunTypes.ts`
- [x] `OrchestratedApp { id: string; name: string; dagId: string }` — `dagId` is `` `dag_${airflow_run_id}` ``, NOT `id`
- [x] `OrchestratorRun { runId: string; status: string; startedAt: string | null; endedAt: string | null; durationSeconds: number | null }`
- [x] `OrchestratorRunsPage { runs: OrchestratorRun[]; total: number }`

### Task 2: Response mapper
- [x] Create `src/features/recovery-plans/recovery-runs/helpers/mapOrchestratorRuns.ts`
- [x] Parse `response.dag_runs` (array) using confirmed real field names: `dag_run_id` → runId, `state` → status, `start_date` → startedAt (fallback `logical_date`), `end_date` → endedAt, `duration` → durationSeconds
- [x] Parse `response.total_entries` → total
- [x] Return `{ runs: [], total: 0 }` if `dag_runs` is missing or not an array (don't throw)

### Task 3: API wrapper
- [x] Create `src/features/recovery-plans/recovery-runs/api/recoveryRunsApi.ts`
- [x] `fetchOrchestratorRuns(providerId: string, dagId: string, opts?: { limit?: number; offset?: number; orderBy?: string })`
- [x] Calls generated `getOrchestratorRunsGetOrchestratorRunsGet`; wraps errors via `OrvalApiError` message pattern (mirror `recoveryApplicationsApi.ts:21-37`)
- [x] Passes the raw response through `mapOrchestratorRuns`

### Task 4: Query keys
- [x] Create `src/features/recovery-plans/recovery-runs/api/recoveryRunsQueryKeys.ts`
- [x] `recoveryRunsKeys.latest(providerId, dagId)`
- [x] `recoveryRunsKeys.history(providerId, dagId, page, pageSize)`

### Checkpoint
- [x] `npm run typecheck`
- [x] `npx vitest run src/features/recovery-plans/recovery-runs/helpers/mapOrchestratorRuns.test.ts`

## Phase 2: Hooks

### Task 5: useOrchestratedApps
- [x] Create `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts`
- [x] Combine `useRecoveryApplications()` + `usePlatformProviders()`
- [x] Filter apps to `Boolean(record.airflow_run_id)` — NOT `push_to_orchestrator` (intent flag; run id is the actual proof a DAG exists)
- [x] Map each to `{ id: record.id, name: record.application.name, dagId: `dag_${record.airflow_run_id}` }`
- [x] Resolve the single AIRFLOW provider id via `getEligiblePlatformProviders`
- [x] Return `{ apps, providerId, isLoading, error }`

### Task 6: useOrchestratedAppRuns
- [x] Create `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedAppRuns.ts`
- [x] `useQueries` over `apps`, one `fetchOrchestratorRuns(providerId, app.dagId, { limit: 1 })` per app — use `app.dagId`, not `app.id`
- [x] Mirror `useRecoveryGroupRelatedVolumes.ts`'s per-item `enabled`/`staleTime`/`gcTime`/`retry: 1` shape
- [x] Return one `{ app, latestRun: OrchestratorRun | null, isLoading }` per input app

### Task 7: useAppRunHistory
- [x] Create `src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.ts`
- [x] Plain `useQuery`, `enabled: Boolean(dagId) && Boolean(providerId)`
- [x] Accepts `page`/`pageSize`, maps to `offset`/`limit` for `fetchOrchestratorRuns(providerId, dagId, ...)`
- [x] Returns `{ runs, total }`

### Checkpoint
- [x] `npx vitest run src/features/recovery-plans/recovery-runs/hooks/*.test.ts`

## Phase 3: UI

### Task 8: RecoveryRunsTable
- [x] Create `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`
- [x] `DataTable` + `DataTableToolbar` (search app name/id) + `DataTableSkeleton`/`DataTableRequestState`
- [x] Columns: app name+id, status `Badge` (success/info/error/light mapping), started, duration
- [x] Row click → `onSelectApp(appId)`

### Task 9: RecoveryRunHistoryDrawer
- [x] Create `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.tsx`
- [x] `DetailDrawer` (eyebrow "Run history", title = app name, subtitle = app id)
- [x] Run-row list from `useAppRunHistory`, `DataTablePagination` in footer

### Task 10: RecoveryRunsPage
- [x] Create `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`
- [x] `TableToolbar` + `InventoryShell`, mirroring `PolicySetsPage.tsx`
- [x] Wires `useOrchestratedApps` → `useOrchestratedAppRuns` → `RecoveryRunsTable` + `RecoveryRunHistoryDrawer`

### Checkpoint
- [x] `npx vitest run src/features/recovery-plans/recovery-runs/components/*.test.tsx src/features/recovery-plans/recovery-runs/pages/*.test.tsx`

## Phase 4: Wiring

### Task 11: Route
- [x] `src/app/AppRoutes.tsx` — replace the `recovery-runs` `<Navigate>` stub with lazy `RecoveryRunsPage` + `Suspense`/`RouteLoadingSkeleton`

### Task 12: Sidebar nav
- [x] `src/layouts/app-shell/AppSidebar.tsx` — add `{ name: 'Recovery Runs', path: routes.recoveryRuns }` under "Recovery Plans"
- [x] Add `'Recovery Runs': 'nav.recovery.runs'` to the translation-key map

### Task 13: Translations (en/sk/cs)
- [x] Reuse existing `pages.recoveryRuns.title`/`.description`
- [x] Add `recoveryRuns.table.*` (columns), `recoveryRuns.status.*` (success/running/failed/queued labels), `recoveryRuns.search.*`, `recoveryRuns.drawer.*`, `nav.recovery.runs`

## Verification Steps
- [x] Run: `npx vitest run src/features/recovery-plans/recovery-runs`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all created/changed files
- [x] Manual note: no browser in this environment — flag visual verification as not done, don't claim it

## Explicitly Out of Scope
- Backend change enabling bulk/multi-DAG runs queries (separate request, flagged in brainstorming)
- Any change to `RecoveryActionHistory` (the current redirect target) — stays as its own separate feature
