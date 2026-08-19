# Todo: Move Recovery Runs into Recovery Plans + Group Support

See `tasks/plan.md` for full detail, acceptance criteria, and file lists.

## Phase 1: Move (no behavior change)
- [x] Task 1: Relocate `src/features/storage-orchestration/` → `src/features/recovery-plans/recovery-runs/`; update `routes.ts` / `AppRoutes.tsx` / `AppSidebar.tsx`
- [x] Checkpoint: `/recovery-plans/recovery-runs` works, `/storage-orchestration` shows placeholder, `tsc --noEmit` clean (verified: tsc clean, 7 test files / 20 tests pass unchanged, eslint clean)

## Phase 2: Data layer
- [ ] Task 2a: Add `OrchestratedEntity` type; add `useOrchestratedGroups` (uses Recovery Groups' existing `orchestrationProviderId`, no backend dependency); add `useOrchestratedEntities`; generalize `useOrchestratedAppRuns` → `useOrchestratedEntityRuns`; add `useLatestOrchestratorRun`. Applications KEEP the existing `usePlatformProviders`/`getEligiblePlatformProviders` fallback for now.
- [ ] Checkpoint: hook tests green (apps, groups, merged, entity-runs)
- [ ] **Task 2b — BLOCKED, do not start:** confirmed 2026-08-19 via `npm run api:pull` that `orchestration_provider_id` is NOT yet on `RecoveryAppRecord`. Re-check with `api:pull` before starting; then `api:generate`; then add the field to `recoveryApplicationTypes.ts` + `mapRecoveryApplications.ts`; then drop the eligible-provider fallback in `useOrchestratedApps`; then fix the one-line follow-up flagged in Task 4.

## Phase 3: Page UX
- [ ] Task 3: Add `useRecoveryRunsTabSearchParam`; add All/Applications/Recovery Groups tabs to `RecoveryRunsPage`; extend `RecoveryRunsTable` with entity-type column; widen `RecoveryRunHistoryDrawer` to generic entity (depends on Task 2a only)
- [ ] Checkpoint: manual tab-switch + `?tab=`/`?entityId=` URL behavior verified

## Phase 4: Detail panels + navigation
- [ ] Task 4: Recovery Application detail drawer — DAG ID / latest status / last executed / duration / "View recovery runs" (only when `pushToOrchestrator`; provider id sourced via the interim eligible-provider lookup until Task 2b lands)
- [ ] Task 5: Recovery Group detail drawer — same additions alongside existing orchestration rows
- [ ] Checkpoint: "View recovery runs" from either entity lands pre-filtered on the correct tab; page still usable standalone

## Phase 5: Polish
- [ ] Task 6: Locale keys (en/cs/sk); grep-clean of old `storage-orchestration` import paths; full focused test + `tsc --noEmit` pass

## Final Definition of Done
- [ ] All acceptance criteria in `tasks/plan.md` met
- [ ] `npx tsc --noEmit` clean
- [ ] All focused tests listed per task pass
- [ ] No unrelated files touched
- [ ] Changes committed (per task or per phase, per CLAUDE.md atomic-commit guidance)
