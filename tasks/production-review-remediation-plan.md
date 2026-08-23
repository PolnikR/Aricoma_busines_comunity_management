# Implementation Plan: Production Review Remediation

## Overview

This plan captures the production-review findings that should be implemented next without rewriting the already completed historical cache-policy plan.

The previously completed `tasks/fetch-cache-policy-plan.md` remains a record of the earlier implementation. This remediation plan deliberately supersedes its polling choices where the production review found that broad interval polling creates unnecessary request fan-out.

The implementation should remain incremental and test-driven. Do not combine these tasks with authentication/Keycloak work, mockup completion, Docker/pipeline hardening, or deployment security work.

This is a frontend/data-correctness remediation plan, not a complete production-readiness sign-off. The excluded authentication, transport-security, deployment, and pipeline findings remain separate release risks and must be tracked outside this plan.

## Explicitly excluded from this plan

The following review findings are intentionally deferred and must not expand this task:

- Authentication / Keycloak / hardcoded development user. Authentication is not connected yet.
- Identity & Access, Recovery Actions, Configuration, and Discovery Settings mockup behavior. These screens are currently mockups and are not production functionality for this task.
- Docker build/pipeline alignment. Deployment is currently manual and pipeline work is not in scope.
- TLS/nginx/security-header deployment hardening. Local/manual deployment hardening will be handled separately.
- Identity Access and Recovery Actions test coverage.
- Container-image CVE scanning.
- Changing the hardcoded OpenAPI source URL. `EXTERNAL_SERVICES.openApi.sourceUrl` remains centrally hardcoded for the current development workflow.

## Verified backend/OpenAPI contract facts

The current `openapi/abco-api.json` establishes the following relationships:

### Provider record

`ProviderRecord` contains provider/infrastructure data such as:

- `id`
- `name`
- `type`
- `role`
- `ipAddress`
- `credentialId`
- `url`
- `defaultFlashcopyProviderId`
- `orchestratorConnId`
- `vmPrefix`
- `vmTags`
- `credentialStatus`

It is not the canonical source of the Airflow UI URL for a Recovery App/Group orchestration relationship.

### Platform / orchestration provider record

`OrchestrationProviderRecord` contains:

- `id`
- `name`
- `type`
- `url`
- `port`
- `dagDir`
- `credentialId`
- other shared provider metadata

The frontend maps this record to `PlatformProviderRecord` and preserves `url`.

### Recovery App and Recovery Group records

Both `RecoveryAppRecord` and `RecoveryGroupRecord` contain:

- `airflow_run_id`
- `push_to_orchestrator`
- `orchestration_provider_id`

Therefore the canonical relationship for orchestration UI/navigation is:

```text
Recovery App / Recovery Group
        |
        +-- orchestration_provider_id
                    |
                    v
        OrchestrationProviderRecord.id
                    |
                    +-- url
```

The frontend already performs this lookup in App details, Group details, Recovery Run history, and orchestration-success flows. The remediation must make this relationship the only normal source for entity-specific Airflow links and remove silent fallback to an unrelated global Airflow URL.

## Architecture decisions

### 1. Standard queries become event-driven SWR, not global polling

The current global cache policy applies `refetchInterval: 15 min` to almost every mounted server query. That creates avoidable traffic and makes any `useQueries` fan-out repeat indefinitely.

Revised standard policy:

```text
staleTime: 15 min
gcTime: 60 min
retry: 1
refetchOnWindowFocus: true
refetchOnMount: true
refetchOnReconnect: true
refetchInterval: false
```

Standard queries refresh from:

- stale remount
- stale browser focus
- reconnect
- mutation invalidation
- explicit Refresh
- query-key change

They do not poll merely because a page remains mounted.

This means a page left continuously visible for a long time does not automatically refresh unless it has a domain-specific live-data requirement. That tradeoff is intentional: live polling is opt-in, not a global default.

### 2. Recovery Runs overview is a snapshot, not a live monitor

The global Recovery Runs table should not poll every orchestrated entity.

With the current backend contract, latest-run data requires one request per `(provider_id, dag_id)`. Until a backend batch endpoint exists, the frontend should minimize this fan-out by fetching latest-run data only for entities visible on the current page.

Target flow:

```text
load Apps + Groups
    |
filter by All / Apps / Groups
    |
filter by search text / deep-link entity
    |
paginate entities
    |
query latest run only for current page entities
```

Rules:

- Initial overview load performs latest-run requests only for the current page.
- Changing page loads latest runs for the next page; already cached page data is reused.
- Manual Refresh refreshes the entity collections and current-page latest-run snapshot.
- Overview latest-run queries have no interval polling.
- No prefetch of every remaining entity is added unless later measurements justify it.
- If scale still becomes a problem, the preferred long-term backend improvement is one batch latest-runs endpoint rather than more client concurrency.

Recommended overview latest-run freshness:

```text
staleTime: 5 min
gcTime: 60 min
refetchInterval: false
```

This is an intentional semantic exception from normal configuration/reference data.

### 3. Recovery Run detail/history owns live polling

Live polling belongs to the one entity the user is actively inspecting.

For App/Group detail latest-run status and Recovery Run drawer page 1:

```text
non-terminal latest run
-> poll every 15 s while the relevant detail/drawer is mounted and browser-visible

terminal/no-run
-> stop interval polling
-> retain cache and refresh on stale focus/remount/manual Refresh

close drawer / unmount detail
-> polling stops immediately
```

The first history page may use fast polling only while its newest returned run is non-terminal. Older history pages never need live polling.

### 4. Recovery Run overview must model loading, empty, data, and error separately

`latestRun === null` is not a sufficient state model.

Use an explicit discriminated row state, conceptually:

```text
loading
empty
error
data
```

`data` may additionally carry `isRefreshing` and a non-blocking `refreshError` when cached data exists but a background refresh fails.

Required semantics:

```text
initial request pending
-> Loading, not "No runs"

successful response with zero runs
-> No runs yet

initial request failed and no cache exists
-> Error / retry state

cached run + background refresh
-> keep cached run + Updating

cached run + background refresh failed
-> keep cached run + stale-data warning/retry
```

Partial failure must not hide successful rows. The page may show an aggregate warning such as `3 latest-run lookups failed`, while the failed rows remain individually identifiable.

### 5. Recovery Run history drawer must not convert failure into empty history

The history hook/drawer must distinguish:

- initial loading
- successful empty history
- successful history data
- initial error without cache
- background refresh error with cached history

Do not use an unconditional `{ runs: [], total: 0 }` fallback as the UI signal for both real empty data and failed initial fetch.

Provide retry behavior for an initial failure and preserve cached history during background failures.

### 6. App/Group UI identity is a composite domain identity, not `airflow_run_id`

Do not use `airflow_run_id` as the Recovery Runs row/deep-link identity even if the backend currently generates practically unique values.

Reason:

- `airflow_run_id` identifies an orchestration push/run, not the domain entity.
- A later push may replace/change the current run id.
- A stable deep link to an App/Group should survive a new orchestration run.

Canonical UI identity:

```text
entityType + entityId
```

Examples:

```text
application:finance_recovery
group:finance_recovery
```

Implementation rules:

- DataTable row key uses a composite key such as `${entityType}:${id}`.
- Selection compares both type and id.
- URL deep links contain enough information to disambiguate type, preferably explicit `entityType` + `entityId` parameters.
- `providerId + dagId` remains the canonical identity of an orchestrator request/cache entry; it is not the UI entity identity.

### 7. Snapshot and live latest-run observers may share one canonical cache entry

The overview and detail have different lifecycle semantics:

- overview = snapshot, no interval
- detail/live = conditional 15-second polling

TanStack Query v5 applies `staleTime` and `refetchInterval` per observer. The overview and detail can therefore share the same canonical latest-run query key while each hook supplies its own observer options:

```text
recovery-runs / latest          / providerId / dagId
recovery-runs / history         / providerId / dagId / page / pageSize
```

Keep the shared latest-run key because the endpoint, parameters, and returned data are identical. A mounted live-detail observer may refresh that shared cache and update an overview row, but it must not make the overview observer start its own polling timer. Do not create separate snapshot/live key families solely to represent observer polling policy; that would split reusable cache data and can duplicate requests.

### 8. OpenAPI `additionalProperties: true` must be preserved centrally

The current OpenAPI snapshot marks multiple records with `additionalProperties: true`, including the reviewed provider, recovery, orchestrator, and rollback schemas. The generated Zod currently emits plain objects that strip unknown properties.

This must be solved in the OpenAPI/Orval generation pipeline, not with feature-by-feature raw-response workarounds.

Target behavior:

```text
OpenAPI object has additionalProperties: true
-> generated Zod object preserves unknown fields
-> parsed generated output retains those fields
```

Preferred generated semantics are `z.looseObject(...)` or an equivalent `.passthrough()` object.

Implementation approach:

1. First verify whether the installed Orval/Zod generator exposes a supported option to honor `additionalProperties`.
2. If supported, configure it centrally.
3. If not supported, add one deterministic generation/post-generation customization with regression tests; do not manually edit generated files.
4. `api:check` must fail if regeneration stops preserving the required unknown fields.

At minimum, add contract tests for:

- `ProviderRecord`
- `OrchestrationProviderRecord`
- `RecoveryAppRecord`
- `RecoveryGroupRecord`
- `RollbackReport`
- `OrchestratorRunsResponse`

### 9. Recovery App and Recovery Group rollback parsing should use the same preservation model

Current behavior is inconsistent:

- Recovery Group code validates the generated response but can still read rollback details from the raw payload.
- Recovery Application code parses through generated Zod first, so unknown rollback fields can be stripped before the local loose rollback schema sees them.

The preferred final behavior is neither workaround. After fixing generated `additionalProperties` handling centrally:

```text
raw response
-> generated OpenAPI validation that preserves additional fields
-> optional stronger local rollback validation
-> mapped domain response
```

Both Apps and Groups should follow the same sequence. `airflow`, `ibm`, and any additional backend rollback fields allowed by the OpenAPI contract must survive parsing in both paths.

Remove comments/types that incorrectly state that unknown OpenAPI-permitted fields are intentionally removed once the generator behavior changes.

### 10. Recovery Application rollback must use the App's stored orchestration provider

New/normal records already contain `orchestration_provider_id`. Recovery Groups correctly use their stored provider id for rollback. Recovery Applications should do the same.

Target resolution order for an orchestrated Recovery Application:

```text
1. app.orchestrationProviderId exists and resolves to an eligible AIRFLOW Platform Provider
   -> use that exact provider

2. app.orchestrationProviderId exists but does not resolve or is not eligible
   -> fail with an actionable stored-provider error
   -> do not fall back to a different provider

3. legacy app has no orchestrationProviderId AND exactly one eligible AIRFLOW provider exists
   -> allow backward-compatible fallback

4. legacy app has no orchestrationProviderId AND zero providers exist
   -> actionable error

5. legacy app has no orchestrationProviderId AND multiple eligible AIRFLOW providers exist
   -> do not guess
   -> require explicit provider resolution/selection before destructive rollback
```

New/updated orchestrated Apps and Groups must continue persisting `orchestration_provider_id` so the legacy fallback disappears naturally over time.

#### Separate future compute-provider ambiguity

`useDeleteRecoveryApplication` also currently requires exactly one target VMware provider to derive `computeProviderId`. That is independent of the Airflow Platform Provider problem.

If multiple target VMware providers will eventually be supported, the durable architecture is to persist the exact target compute/provider identity in the Recovery Application contract rather than infer it at rollback time. Until that backend/domain requirement exists, keep this as an explicit deferred constraint instead of guessing among multiple compute providers.

### 11. Airflow links must resolve dynamically through the entity's Platform Provider

Keep the hardcoded OpenAPI source URL unchanged.

For an entity-specific Airflow link:

```text
Recovery App/Group orchestration_provider_id
-> Platform Providers cache/list
-> matching PlatformProviderRecord.id
-> matching PlatformProviderRecord.url
-> build Airflow DAG URL
```

The current frontend already performs this lookup in several places. Standardize it and remove the silent entity-link fallback to `EXTERNAL_SERVICES.airflow.defaultBaseUrl`.

If the referenced Platform Provider is missing or has no usable URL:

- keep the Recovery entity and run data visible;
- do not navigate to a potentially wrong Airflow instance;
- disable/hide the external link and show an explicit unavailable/missing-provider-URL state.

Provider rules differ by operation:

- destructive rollback requires the stored provider to be eligible for orchestration operations;
- an Airflow UI link requires only the referenced provider record and a safe usable URL. A credential-health failure does not by itself rewrite the link to another provider or global host.

The backend `/api` proxy and `EXTERNAL_SERVICES.openApi.sourceUrl` are unrelated to this Airflow UI link and remain unchanged.

### 12. Fixed-size Recovery Run history should not expose a non-functional page-size selector

History currently has a fixed page size but renders the shared rows-per-page selector with a no-op handler.

Recommended change:

- pass a single supported page-size option for fixed-size history;
- make `DataTablePagination` hide the page-size control when `pageSizeOptions.length <= 1`.

This preserves the shared component API and avoids a new one-off `hidePageSizeSelector` prop unless later requirements need it.

### 13. Large Recovery App/Group table components should be decomposed surgically

Do not refactor components merely because of line count. Target only the two table components where the review identified mixed responsibilities:

- `RecoveryApplicationsTable.tsx`
- `RecoveryGroupsTable.tsx`

Recommended extraction:

```text
RecoveryApplicationsTable
  -> table/search/filter/selection shell
  -> RecoveryApplicationDetailDrawer
  -> existing domain-specific operation dialogs remain separate or are extracted only if still oversized

RecoveryGroupsTable
  -> table/search/filter/selection shell
  -> RecoveryGroupDetailDrawer
  -> rollback/delete dialog orchestration extracted only where it materially simplifies the table
```

Move into the detail-drawer components:

- Platform Provider URL resolution
- latest-run detail query
- orchestration detail presentation
- `View recovery runs` navigation
- Airflow external link presentation

Do not create a generic App/Group mega-drawer abstraction. Their domain models and operations are different enough that two explicit components are easier to maintain.

Do not refactor `RecoveryAppBuilder` or `RecoveryGroupBuilder` as part of this remediation unless one of the above functional changes requires a tiny local extraction.

### 14. Security follow-up from the clean frontend review

No broad XSS refactor is required. Existing external links already use `noopener/noreferrer`, and the review found no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `@ts-ignore`, or disabled ESLint escapes in production source.

One targeted guard is justified because Airflow URLs are backend-configured and become dynamic navigation targets:

- validate that Platform Provider external URLs use only `http:` or `https:`;
- reject/disable unsupported protocols rather than passing arbitrary schemes to `href`/`window.open`;
- test the protocol guard.

This is application-level input validation and is independent of the deferred nginx/CSP work.

## Implementation tasks

## Task 1: Remove global standard-query interval polling

**Goal:** Change the standard cache profile from timer-driven polling to event-driven stale-while-revalidate.

**Changes:**

- Remove `refetchInterval` from `STANDARD_QUERY_OPTIONS` or explicitly set it to `false`.
- Keep 15-minute stale time, 60-minute GC, retry=1, stale focus/mount/reconnect behavior, and hidden-tab safety.
- Audit `useQueries` consumers to ensure no inherited global interval remains accidentally.
- Keep explicit intervals only in approved live Recovery Run hooks.

**Acceptance criteria:**

- [ ] Normal server queries do not refetch merely because 15 minutes pass while continuously mounted.
- [ ] Stale focus/remount/reconnect still refetches in background.
- [ ] Manual Refresh and mutation invalidation still work.
- [ ] No normal `useQueries` fan-out inherits periodic polling.

**Verification:** focused cache-policy tests plus representative provider/inventory query tests.

## Task 2: Bound Recovery Runs overview requests to visible page entities

**Goal:** Prevent the overview from querying every entity and repeating N-request fan-outs.

**Changes:**

- Move Recovery Runs search/pagination state far enough up the page flow to know the current page entities before calling the latest-run hook.
- Query latest-run snapshots only for current-page entities.
- Remove interval polling from overview latest-run queries.
- Keep current-page manual refresh.
- Keep cached snapshots when returning to a previously visited page.

**Acceptance criteria:**

- [ ] With 200 entities and page size 10, initial overview latest-run fan-out is 10 requests, not 200.
- [ ] Page 2 triggers only its own current-page requests.
- [ ] Returning to a fresh cached page does not issue unnecessary requests.
- [ ] Waiting 15 seconds, 5 minutes, or 15 minutes while continuously mounted does not trigger overview interval traffic.

**Verification:** exact request-count fake-timer/page-navigation tests.

## Task 3: Introduce explicit latest-run and history request states

**Goal:** Eliminate `error/loading == No runs` ambiguity.

**Changes:**

- Add explicit per-entity latest-run state.
- Expose per-row errors and cached-refresh errors from the overview hook.
- Add aggregate partial-failure presentation without hiding successful rows.
- Update history drawer to distinguish initial error, empty success, data, and cached background failure.
- Add retry for failed overview lookups and history fetches.

**Acceptance criteria:**

- [ ] Pending row is visibly loading.
- [ ] Successful zero-run response alone renders `No runs yet`.
- [ ] Initial failure renders error/retry, never empty state.
- [ ] Partial failures keep successful rows usable.
- [ ] Cached latest/history data remains visible when background refresh fails.

**Verification:** focused hook/component tests for all state transitions.

## Task 4: Introduce stable composite entity identity and observer-specific polling

**Goal:** Remove App/Group ID collision risk while retaining one canonical latest-run cache entry.

**Changes:**

- Add a canonical composite UI entity key based on `entityType + entityId`.
- Extend Recovery Runs URL selection to include entity type explicitly.
- Use composite row keys and selection matching.
- Keep one shared latest-run query-key family based on `providerId + dagId`.
- Configure overview and live-detail polling through their own hook/observer options instead of encoding polling policy in query keys.

**Acceptance criteria:**

- [ ] App `database` and Group `database` can coexist in All without duplicate React keys.
- [ ] Clicking either opens the correct drawer.
- [ ] Deep links resolve the correct entity even when IDs collide.
- [ ] Overview and live detail reuse the same latest-run cache entry without the overview starting a polling timer.
- [ ] A live-detail refresh may update shared cached data without creating a duplicate snapshot/live request family.

**Verification:** collision/deep-link tests plus a shared-key, independent-observer polling test.

## Task 5: Preserve OpenAPI additional properties centrally and align rollback parsing

**Goal:** Make generated runtime validation match `additionalProperties: true` and preserve rollback fields consistently.

**Changes:**

- Implement supported Orval configuration or deterministic generation customization for loose/passthrough objects.
- Add generator regression tests.
- Align Recovery App and Group rollback parsing to the same preserved generated response path.
- Keep stronger local rollback schema validation only where it adds domain guarantees after field preservation.
- Update stale comments/types about unknown fields being stripped.

**Acceptance criteria:**

- [ ] Unknown OpenAPI-permitted fields survive generated parsing.
- [ ] App rollback preserves `airflow`, `ibm`, and additional allowed rollback fields.
- [ ] Group rollback preserves the same fields through the same strategy.
- [ ] Regeneration cannot silently reintroduce stripping without failing `api:check`/tests.

**Verification:** generator tests + App/Group API tests with sentinel additional fields.

## Task 6: Make orchestration provider resolution deterministic and URL-driven

**Goal:** Support future multiple Platform Providers without guessing and ensure links target the correct Airflow instance.

**Changes:**

- Recovery App rollback uses `app.orchestrationProviderId` first, matching Recovery Group behavior.
- A present but missing/ineligible stored provider fails explicitly and never falls back to a different provider.
- Implement the documented legacy fallback only when exactly one eligible AIRFLOW provider exists.
- Multiple eligible providers + legacy missing id must not auto-select.
- Standardize Platform Provider lookup by `orchestrationProviderId` for App/Group/run external links.
- Keep link URL availability separate from rollback credential eligibility.
- Remove entity-specific fallback to the global hardcoded Airflow URL.
- Add http/https-only URL protocol validation.
- Leave the hardcoded OpenAPI source URL untouched.

**Acceptance criteria:**

- [ ] Two AIRFLOW Platform Providers can coexist and an App/Group resolves its own provider by id.
- [ ] Rollback uses the provider stored on the entity.
- [ ] A stale, missing, or ineligible stored provider id fails with an actionable error and never selects another provider.
- [ ] Legacy single-provider records still work.
- [ ] Legacy ambiguous records fail safely or require explicit user selection.
- [ ] Missing provider URL does not redirect to a different Airflow server.
- [ ] Unsupported URL protocols are rejected/disabled.

**Verification:** App delete/rollback tests, Group parity tests, App/Group detail link tests, history-drawer link tests, URL helper/schema tests.

## Task 7: Correct fixed Recovery Run history pagination UI

**Goal:** Remove the non-functional page-size selector from fixed-size history.

**Changes:**

- Allow `DataTablePagination` to omit its page-size selector when only one option exists.
- Pass `[PAGE_SIZE]` from fixed-size Recovery Run history.
- Remove the no-op page-size behavior.

**Acceptance criteria:**

- [ ] History shows page navigation and range/total information.
- [ ] No meaningless rows-per-page selector is displayed for the fixed-size drawer.
- [ ] Existing configurable tables retain the normal `[10,25,50]` control.

**Verification:** shared pagination test + history drawer test.

## Task 8: Complete the Recovery Runs regression matrix and final audit

Add the focused tests alongside the task that introduces each behavior. Task 8 only audits the matrix and fills genuine gaps; it must not postpone test coverage until the end.

The completed regression matrix must cover at least:

1. App and Group with the same `id` render/select/deep-link independently.
2. First load of an uncached page issues at most one latest-run request per current-page entity.
3. Returning to a fresh cached page issues no unnecessary latest-run requests.
4. Overview performs no interval polling.
5. Manual Refresh refetches only the visible snapshot set plus entity collections.
6. Initial latest-run failure renders error, not `No runs`.
7. Partial latest-run failure preserves successful rows.
8. Cached latest-run refresh failure preserves the run and exposes warning/retry.
9. History initial failure is distinct from successful empty history and exposes retry.
10. Cached history remains visible after background refresh failure.
11. Detail/page-1 live polling runs every 15 seconds only while newest run is non-terminal.
12. Terminal transition stops fast polling.
13. Closing/unmounting the detail/history owner stops polling.
14. Hiding the browser tab stops interval traffic and visible refocus follows the configured stale/refetch policy.
15. Overview and live-detail observers share the canonical latest-run cache key without making overview poll.
16. Platform Provider URL is resolved from the entity's `orchestrationProviderId`.
17. Missing Platform Provider URL does not fall back to a different global Airflow host.
18. A present but unresolved/ineligible stored provider id fails without selecting another provider.
19. Multiple AIRFLOW providers use the entity's stored provider id for rollback.
20. Generated parsing preserves additional rollback/provider fields for both Apps and Groups.
21. Fixed history page size does not render a non-functional selector.

**Final verification:**

- [ ] Run all directly affected Vitest files.
- [ ] `npm run typecheck`.
- [ ] Focused ESLint for changed TypeScript/TSX files.
- [ ] `npm run api:check` for generator/contract changes.
- [ ] `git diff --check`.
- [ ] Inspect `git status --short` and diff scope.
- [ ] No Keycloak, mockup, Docker/pipeline, or deployment-hardening changes are included.

## Task 9: Optional follow-up — extract App and Group detail drawers

**Goal:** Reduce mixed responsibilities without broad refactoring after the production-correctness changes are stable. This task is non-blocking for completion of Tasks 1–8 and should land as a separate refactor commit or follow-up change.

**Changes:**

- Extract `RecoveryApplicationDetailDrawer`.
- Extract `RecoveryGroupDetailDrawer`.
- Move provider-URL resolution, latest-run detail query, orchestration presentation, external link, and Recovery Runs navigation into those components.
- Extract operation-dialog orchestration only if the table remains materially difficult to understand after drawer extraction.
- Do not build a generic cross-domain drawer framework.

**Acceptance criteria:**

- [ ] Table components primarily own tabular/search/filter/selection behavior.
- [ ] Detail-specific fetching/navigation lives in detail components.
- [ ] Existing behavior is unchanged except for the functional fixes in Tasks 3, 4, and 6.
- [ ] No unrelated builder refactor is included.

**Verification:** move existing detail behavior tests to focused drawer tests and retain table integration coverage.

## Dependency order and checkpoints

```text
Task 1 standard polling policy
   |
   v
Task 2 overview request bounding
   |
   +------> Task 3 error/state model
   |
   +------> Task 4 composite identity + observer policy

Task 5 additionalProperties / rollback parsing  (independent, high risk)
Task 6 provider resolution + dynamic URL         (independent)
Task 7 fixed pagination UI                       (independent)

Tasks 1-7
   |
   v
Checkpoint: functional remediation complete
   |
   +------> Task 8 regression-matrix audit + final verification
   |
   +------> Task 9 optional drawer refactor
              |
              v
           focused drawer verification
```

Tasks 5, 6, and 7 can be implemented independently after their focused baseline tests are established. Task 5 should fail fast in an isolated change because it affects generated validation centrally. Task 9 is not a prerequisite for Task 8 or for declaring the functional remediation complete.

### Checkpoint after Tasks 1-4

- [ ] Focused Recovery Runs hook/page/table tests pass.
- [ ] Request-count, collision, cached-page, error-state, and polling-lifecycle behavior is verified.
- [ ] The shared latest-run cache key remains canonical.

### Checkpoint after Tasks 5-7

- [ ] Generated-schema regression and App/Group API tests pass.
- [ ] Provider-resolution, URL-protocol, external-link, and fixed-pagination tests pass.
- [ ] No unrelated generated or UI refactor changes are included.

### Optional refactor checkpoint after Task 9

- [ ] Drawer-specific tests preserve existing detail behavior.
- [ ] Table integration tests still cover selection and drawer opening.
- [ ] The refactor is committed separately from functional remediation.

## Deferred architecture question

The only provider-resolution issue intentionally left outside the concrete implementation is future **multiple target VMware compute providers** for Recovery Application rollback. The current App contract stores the orchestration Platform Provider id but does not clearly persist the exact target compute provider id used for rollback.

If that future topology is expected, prefer adding/persisting an explicit target compute-provider identity in the backend Recovery App contract rather than inferring it from a list at delete time. Do not guess among multiple target compute providers.
