# Todo: Production Review Remediation

## Scope guard

- [ ] Do not include Keycloak/authentication work.
- [ ] Do not implement Identity & Access, Recovery Actions, Configuration, or Discovery Settings mockups.
- [ ] Do not change Docker/pipeline configuration.
- [ ] Do not add deployment TLS/nginx/security-header work.
- [ ] Keep the hardcoded OpenAPI source URL unchanged.
- [ ] Treat this as frontend/data-correctness remediation, not a complete production-readiness sign-off; track excluded authentication, deployment, and transport-security risks separately.

## Phase 1: Query/polling model

- [ ] Task 1: Remove global 15-minute `refetchInterval` from normal queries while keeping `15 min stale / 60 min gc / retry 1 / stale focus-mount-reconnect`.
- [ ] Prove normal mounted queries do not poll automatically.
- [ ] Task 2: Move Recovery Runs search/pagination ahead of latest-run fan-out.
- [ ] Fetch overview latest-run snapshots only for current-page entities.
- [ ] Remove Recovery Runs overview interval polling.
- [ ] Keep manual Refresh for entity collections + current visible snapshots.

## Phase 2: Recovery Runs correctness

- [ ] Task 3: Add explicit latest-run `loading / empty / error / data` state.
- [ ] Keep cached run data visible during refresh and refresh failure.
- [ ] Add partial-failure warning/retry without hiding successful rows.
- [ ] Distinguish history initial failure from successful empty history.
- [ ] Expose retry for an initial history failure.
- [ ] Keep cached history visible during background refresh failure.
- [ ] Task 4: Use composite App/Group entity identity (`entityType + entityId`).
- [ ] Add explicit entity type to Recovery Runs deep-link selection.
- [ ] Keep one canonical latest-run query key (`providerId + dagId`) for overview and detail.
- [ ] Keep overview and live polling behavior in observer-specific hook options; do not split cache keys solely by polling policy.
- [ ] Keep fast 15-second polling only on the actively inspected non-terminal run/history owner.
- [ ] Stop fast polling on terminal state, close/unmount, and hidden-tab lifecycle.

## Checkpoint: Recovery Runs model

- [ ] Focused Recovery Runs hook/page/table tests pass.
- [ ] Uncached-page request count, fresh cached-page reuse, error states, collision handling, and polling lifecycle are verified.
- [ ] Overview and detail share the canonical latest-run cache without making overview poll.

## Phase 3: API contract preservation

- [ ] Task 5: Make generated Zod preserve OpenAPI `additionalProperties: true` centrally.
- [ ] Add generation regression coverage for Provider, Platform Provider, Recovery App, Recovery Group, Rollback Report, and Orchestrator Runs schemas.
- [ ] Align Recovery App and Recovery Group rollback parsing to the same preserved generated-response strategy.
- [ ] Verify `airflow`, `ibm`, and sentinel additional fields survive both paths.
- [ ] Update stale comments/types that say unknown OpenAPI-permitted fields are removed.

## Phase 4: Provider identity and dynamic Airflow URLs

- [ ] Task 6: Recovery App rollback uses `app.orchestrationProviderId` first.
- [ ] A present but missing/ineligible stored provider fails explicitly and never falls back to another provider.
- [ ] Preserve single-provider fallback only for legacy Apps missing the provider id.
- [ ] Never auto-select among multiple eligible AIRFLOW providers when legacy identity is missing.
- [ ] Resolve App/Group/run Airflow links through `orchestrationProviderId -> PlatformProviderRecord.url`.
- [ ] Keep link URL availability separate from destructive rollback credential eligibility.
- [ ] Remove silent entity-link fallback to the global hardcoded Airflow host.
- [ ] Keep the OpenAPI source URL hardcoded and unchanged.
- [ ] Validate Platform Provider external URLs as http/https only.

## Checkpoint: API and provider correctness

- [ ] Generator regression and App/Group API tests pass.
- [ ] Provider-resolution, URL-protocol, and external-link tests pass.
- [ ] No unrelated generated output is included.

## Phase 5: Fixed pagination cleanup

- [ ] Task 7: Hide rows-per-page selector when `DataTablePagination` receives one page-size option.
- [ ] Recovery Run history uses fixed `[PAGE_SIZE]` without a no-op selector.

## Phase 6: Recovery Runs regression audit

- [ ] Task 8: Complete the regression matrix alongside Tasks 1-7 and fill only genuine gaps during the final audit.

- [ ] App and Group with identical ids coexist and select correctly.
- [ ] Deep links disambiguate entity type.
- [ ] First load of an uncached page issues at most one latest-run request per current-page entity, not per global entity.
- [ ] Returning to a fresh cached page issues no unnecessary latest-run requests.
- [ ] Overview does not poll at 15 s / 5 min / 15 min intervals.
- [ ] Manual Refresh has exact expected request count.
- [ ] Initial latest-run failure is not rendered as `No runs`.
- [ ] Partial failure keeps successful rows.
- [ ] Cached latest-run refresh failure keeps cached run + warning/retry.
- [ ] Initial history failure is distinct from successful empty history and exposes retry.
- [ ] Cached history refresh failure keeps previous history.
- [ ] Live non-terminal detail/history polling occurs every 15 seconds.
- [ ] Terminal response stops fast polling.
- [ ] Close/unmount stops live polling.
- [ ] Hidden browser tab stops interval traffic and visible refocus follows the configured stale/refetch policy.
- [ ] Overview and live-detail observers share the canonical latest-run key without making overview poll.
- [ ] Entity-specific Platform Provider URL is used for Airflow navigation.
- [ ] Missing provider URL never redirects to a global fallback Airflow host.
- [ ] A present but missing/ineligible stored provider id fails without selecting another provider.
- [ ] Multiple Platform Providers resolve rollback through the entity's stored provider id.
- [ ] App and Group generated parsing preserves additional rollback/provider fields.
- [ ] Fixed history pagination has no non-functional page-size selector.

## Phase 7: Optional UI refactor

- [ ] Task 9 (optional follow-up): Extract `RecoveryApplicationDetailDrawer` from the App table after Tasks 1-8 are stable.
- [ ] Extract `RecoveryGroupDetailDrawer` from the Group table.
- [ ] Keep table components focused on table/search/filter/selection behavior.
- [ ] Do not introduce a generic cross-domain drawer abstraction.
- [ ] Do not refactor builders unless directly required by these fixes.
- [ ] Keep Task 9 non-blocking and commit it separately from functional remediation.

## Final verification

- [ ] Run directly affected Vitest files.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint for changed TypeScript/TSX files.
- [ ] Run `npm run api:check` after generator changes.
- [ ] Run `git diff --check`.
- [ ] Inspect `git status --short` and ensure no unrelated files are included.
- [ ] Confirm Task 9, if implemented, is a separate refactor commit and is not required for functional-remediation completion.

## Deferred

- [ ] Decide backend/domain contract for exact target compute-provider identity before supporting multiple target VMware providers during Recovery Application rollback.
