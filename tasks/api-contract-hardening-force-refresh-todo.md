# TODO: API contract hardening + VMware force refresh

## Phase 1 — Provider contracts + configuration UI

### Task 1 — Provider transport + `POST /submit_provider` response validation
- [ ] Add optional nullable `cacheRefreshSeconds` to handwritten Provider record/submit types.
- [ ] Validate non-null `cacheRefreshSeconds` as a positive integer in the FE submit schema.
- [ ] Preserve generated `cacheRefreshSeconds` in `mapProviderRecord()`.
- [ ] Include `cacheRefreshSeconds` in `submitProvider()` payload when supplied.
- [ ] Parse/validate the successful `ProvidersResponse` before `submitProvider()` resolves.
- [ ] Replace invalid `{}` success fixtures with valid provider-list responses.
- [ ] Add malformed-2xx response regression test.
- [ ] Run focused Provider API/type tests.

### Task 2 — Infrastructure Provider `cacheRefreshSeconds` UI
- [ ] Add `cacheRefreshSeconds: string` to `ProviderCreateFormData` and the empty/edit initial form.
- [ ] Render an optional number input with min 1 and step 1.
- [ ] Add helper text: blank uses the provider-type discovery-cache default; do not hardcode 300 s in UI.
- [ ] Prefill existing provider TTL overrides in edit mode.
- [ ] Blank -> submit `null`; valid value -> positive integer.
- [ ] Reject 0, negative and decimal values before mutation.
- [ ] Include the field in dirty-state/unsaved-changes detection.
- [ ] Add EN/SK/CS label, helper and validation translations.
- [ ] Add `ProviderCreateForm` and `ProvidersCreateModal` tests for prefill/edit/clear/invalid values.

### Task 3 — BACKEND Platform Provider controls
- [ ] Add `loggingEnabled: boolean | null` and `jwtEnabled: boolean | null` to `PlatformProviderFormData`.
- [ ] Prefill both fields from the server record; empty create state uses null.
- [ ] Render both controls as bordered checkboxes only for `type === 'BACKEND'`.
- [ ] Keep AIRFLOW/SMTP forms free of these BACKEND-only controls.
- [ ] Preserve untouched null; interaction sets explicit true/false.
- [ ] Include both flags in dirty-state detection and submit payload.
- [ ] Add localized JWT helper/caution that backend enforcement is not implemented yet.
- [ ] Add EN/SK/CS labels/helper translations.
- [ ] Do not add `cacheRefreshSeconds` to Platform Provider UI: verified BE discovery cache does not consume platform-provider records.
- [ ] Add form/modal/API regression tests for visibility, null preservation and true/false submit.

### Checkpoint A
- [ ] Provider-focused tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Focused ESLint passes with zero warnings.
- [ ] No generated files were edited manually.
- [ ] UI scope matches BE semantics: cache TTL only on discovery Providers; logging/JWT flags only on BACKEND Platform Provider.

## Phase 2 — Recovery Group rollback report

### Task 4 — API/hook return `RollbackReport`
- [ ] Change `rollbackRecoveryGroupOrchestration()` to `Promise<RollbackReport>`.
- [ ] Reuse existing `parseRollbackReport()` for standalone rollback.
- [ ] Reject a 200 response that has no rollback report.
- [ ] Propagate `RollbackReport` through `useRecoveryGroups().rollback()`.
- [ ] Preserve recovery-group list invalidation on success.
- [ ] Update API/hook tests for clean report, report details, missing report and HTTP error.

### Task 5 — UI consumes returned report
- [ ] Change `RecoveryGroupsTable.onRollback` to return `Promise<RollbackReport>`.
- [ ] Store standalone rollback result in existing `rollbackResult` state.
- [ ] Open existing `RecoveryGroupRollbackResultModal` with the real report.
- [ ] Preserve existing failed-rollback error behavior.
- [ ] Remove `rollbackSuccessGroupName` and `RecoveryGroupRollbackSuccessModal` if grep confirms no remaining consumer.
- [ ] Replace `mockResolvedValue(undefined)` test with a representative Airflow/IBM report.

### Checkpoint B
- [ ] Recovery Group API/hook/table/modal tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Focused ESLint passes.

## Phase 3 — VMware live force refresh

### Task 6 — Hook-level force-refresh command
- [ ] Add a dedicated TanStack mutation in `useVmwareResourceInventory`.
- [ ] Snapshot the currently settled canonical search input and its query key at force-refresh invocation.
- [ ] Call `fetchVmwareInventory({...snapshotSearch, forceRefresh: true})`.
- [ ] On every resolved response write returned inventory only to the snapshotted `discoveryInventoryKeys.vmwareSearch(snapshotSearch)` cache entry.
- [ ] Do not invalidate/refetch immediately after a resolved force-refresh request.
- [ ] Expose `forceRefresh`, `isForceRefreshing` and request/HTTP `forceRefreshError` from the hook.
- [ ] Keep ordinary query `refetch()` unchanged.
- [ ] Test current filters + `force_refresh: true` request body.
- [ ] Test same-key cache replacement.
- [ ] Test rejected force-refresh request keeps previous cached data.
- [ ] Do not infer or display „live refresh succeeded“ from HTTP 200: verified BE may return stale fallback data after a failed forced live fetch.
- [ ] Test provider/filter switch during an in-flight force refresh cannot write into the newly selected key or leak an old mutation error into the new view.
- [ ] Test ordinary refetch still omits `force_refresh`.

### Task 7 — Shared VMware page Refresh button
- [ ] Wire top `TableToolbar` Refresh to the hook force-refresh command when a VMware provider is active.
- [ ] Include `isForceRefreshing` in the header updating state.
- [ ] Surface request/HTTP failure without clearing current inventory.
- [ ] Do not add a success toast that claims live discovery succeeded while BE can degrade to stale data with HTTP 200.
- [ ] Keep inventory error Retry on ordinary `refetch()`.
- [ ] Keep provider-load Refresh fallback on provider refetch.
- [ ] Add page test proving top Refresh calls force refresh, not normal query refetch.
- [ ] Verify shared `VmwareResourcesPage` covers both Resources source and Resources ISE target.

### Checkpoint C — FE completion
- [ ] Run all focused tests from Tasks 1–7.
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run api:check`
- [ ] `npm run build`
- [ ] Review grep/diff for generated-code forks and obsolete rollback-success code.
- [ ] Exclude unrelated pre-existing dirty files.
- [ ] Commit only after all required checks pass.

## Phase 4 — Later BE OpenAPI hardening (`abco-be`, separate commit)

### Task 8 — Type `OrchestratorRunsResponse`
- [ ] Add permissive `AirflowDagRunRecord` with typed FE-consumed fields: `dag_run_id`, `state`, `start_date`, `end_date`, `logical_date`, `duration`.
- [ ] Add required `dag_runs` and `total_entries` to `OrchestratorRunsResponse` while retaining `extra="allow"`.
- [ ] Add/extend assert-based response/OpenAPI self-check.
- [ ] Verify extra Airflow fields remain accepted.
- [ ] Verify OpenAPI explicitly publishes the DAG-run fields.

### Task 9 — Common error schemas + Operations/Providers
- [ ] Add reusable `{detail: string}` OpenAPI error model.
- [ ] Document actual 400/502 plus 401/403 responses for `/get_orchestrator_runs`.
- [ ] Document actual semantic responses for provider GET/POST/test/delete routes.
- [ ] Add OpenAPI regression assertions for response status keys and schemas.
- [ ] Do not change runtime exception behavior.

### Task 10 — Structured recovery rollback errors
- [ ] Add typed `{detail: {rollback: RollbackReport}}` error model.
- [ ] Document structured 502 for recovery-app/group delete rollback failures.
- [ ] Document actual 400/401/403/404/409/500/502 contracts on the relevant recovery routes.
- [ ] Keep simple Airflow-push 502 errors distinct from structured rollback 502 errors.
- [ ] Extend OpenAPI self-check and recovery router verification.

### Task 11 — BE → FE contract regeneration
- [ ] Export/pull the updated BE OpenAPI into FE; do not edit `openapi/abco-api.json` by hand.
- [ ] Run the repository-approved Orval update flow.
- [ ] Confirm generated `OrchestratorRunsResponse` contains typed run fields.
- [ ] Keep `mapOrchestratorRuns()` unless stronger generated typing creates a justified simplification.
- [ ] `npm run api:check`
- [ ] Recovery Runs focused tests pass.
- [ ] `npm run typecheck`
- [ ] `npm run build`

## Out of scope

- [ ] Do not add global discovery-cache defaults/history UI in this work; provider-level TTL input is in scope.
- [ ] Do not add `cacheRefreshSeconds` to Platform Provider UI until BE gives it runtime cache semantics.
- [ ] Do not wire IBM Power/FlashSystem force-refresh buttons in this work.
- [ ] Do not add cache config/history or access-log UI.
- [ ] Do not manually edit generated Orval files.
- [ ] Do not annotate every backend route/error in one oversized task.
