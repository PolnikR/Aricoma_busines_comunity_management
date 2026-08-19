# Implementation Plan: Airflow DAG Link in Recovery Run History Drawer

## Overview

Recovery Applications and Recovery Groups both open the exact Airflow DAG
(via `buildAirflowDagUrl` in `src/config/externalServices.ts`) from their
detail drawers and push-confirmation modals. The Recovery Runs page's own
detail panel — `RecoveryRunHistoryDrawer`, titled "História spustení" (Run
history), showing one entity's paginated run list — has no such link yet.

This plan adds one "View in Airflow" link to that drawer, pointing at the
same DAG the table row and other detail panels already link to. It does not
add a link to each individual run-history list item.

## Confirmed decisions (from planning)

- **One link at the drawer level, not per run-history item.** Each list item
  is an individual Airflow `dag_run_id` (a specific execution), not a
  separate DAG — linking each one exactly would need a new Airflow
  run-detail URL builder, which `buildAirflowDagUrl` does not support today.
  Matching the existing Apps/Groups pattern means one link for the entity's
  DAG as a whole, using `entity.dagId` (already carries the `dag_` prefix;
  `buildAirflowDagUrl` normalizes idempotently either way).
- **Resolve `providerUrl` inside `RecoveryRunHistoryDrawer` itself**, via
  `usePlatformProviders()` + the `entity.providerId` the drawer already
  receives — no new prop threaded through `RecoveryRunsPage`. Self-contained
  change to one component.
- Reuse `buildAirflowDagUrl` unchanged. No new config, no new URL logic, no
  per-run linking.
- Link is omitted when there is no entity/dagId (drawer is only ever open
  for a real selected entity, so this is effectively "always shown while
  open" — same omission rule as Apps/Groups for consistency).

## Architecture decisions

- Add `usePlatformProviders()` + `buildAirflowDagUrl` + `ExternalLinkIcon`
  imports to `RecoveryRunHistoryDrawer.tsx`.
- Resolve `providerUrl = platformProviders.find(p => p.id === entity.providerId)?.url`,
  same lookup pattern already used in `RecoveryApplicationsTable.tsx` and
  `RecoveryGroupsTable.tsx`.
- Render the link near the drawer's existing `subtitle` (the entity id),
  reusing `DetailDrawer`'s existing header area rather than adding new
  drawer chrome.
- No change to `OrchestratedEntity`, `RecoveryRunHistoryEntity`, or
  `buildAirflowDagUrl` types/signatures.

## Dependency Flow

```text
entity.providerId (already passed into the drawer)
              |
              v
   usePlatformProviders() lookup (new, inside the drawer)
              |
              v
   buildAirflowDagUrl(entity.dagId, providerUrl)
              |
              v
   "View in Airflow" link next to the drawer title
```

## Task List

### Phase 1: Drawer link

- [ ] **Task 1: Add the Airflow DAG link to RecoveryRunHistoryDrawer**

**Description:** In `RecoveryRunHistoryDrawer.tsx`, call
`usePlatformProviders()`, resolve the provider URL from `entity?.providerId`,
and render a "View in Airflow" link (same `<a>` + `ExternalLinkIcon` pattern
as `RecoveryGroupsTable.tsx`/`RecoveryApplicationsTable.tsx`) next to the
existing subtitle, opening `buildAirflowDagUrl(entity.dagId, providerUrl)` in
a new tab. Add the `recoveryRuns.drawer.viewInAirflow` locale key (en/sk/cs).

**Acceptance criteria:**
- [ ] Opening the drawer for an orchestrated entity shows a "View in
      Airflow" link that opens the exact DAG in a new tab
      (`target="_blank" rel="noopener noreferrer"`).
- [ ] Link URL uses the resolved provider URL when an eligible provider
      exists, and the central fallback otherwise (via `buildAirflowDagUrl`'s
      existing behavior).
- [ ] No per-run-history-item link is added — the run list rendering is
      otherwise unchanged.
- [ ] No hardcoded Airflow host or manual path concatenation added.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.test.tsx`
- [ ] Manual check: open the run history drawer for an orchestrated
      application or group from the Recovery Runs page, click "View in
      Airflow", confirm it opens the correct DAG.

**Dependencies:** None (all reused pieces — `buildAirflowDagUrl`,
`usePlatformProviders` — already exist and are used elsewhere in this
feature area).

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.tsx`
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.test.tsx`
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Estimated scope:** Small (4-5 files).

### Checkpoint: Drawer link

- [ ] Focused test passes.
- [ ] Manual check confirms the link opens the correct DAG and matches the
      link already shown for the same entity in its own table/detail drawer.

### Phase 2: Focused verification

- [ ] **Task 2: Focused regression verification**

**Description:** Run only the touched test, typecheck, and scan for
accidental hardcoded Airflow literals.

**Acceptance criteria:**
- [ ] Focused test passes.
- [ ] TypeScript accepts the new drawer code.
- [ ] No Airflow host literal or manual `/dags/dag_` concatenation
      introduced outside `src/config/externalServices.ts`.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.test.tsx`
- [ ] `npm run typecheck`
- [ ] `rg -n "10\\.99\\.99\\.55|/dags/dag_" src/features/recovery-plans/recovery-runs`
- [ ] `git diff --check`

**Dependencies:** Task 1.

**Files likely touched:** None beyond Task 1 unless verification exposes a
directly related defect.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] Recovery Run history drawer resolves the same exact DAG URL as the
      entity's own table/detail-drawer link (Application or Group).
- [ ] No per-run-history-item Airflow links exist (explicitly out of scope).
- [ ] Focused tests and typecheck pass.
- [ ] Complete suite and production build are not run unless requested.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A run-history item's own `dag_run_id` differs from the entity's `dagId` — a user could expect the link to jump to that specific run | Link opens the DAG's default view, not the exact historical run | Explicitly out of scope per this plan (confirmed during planning); would need a new per-run URL builder, tracked separately if requested. |
| `RecoveryRunsPage` doesn't currently fetch `platformProviders` | None — resolved entirely inside the drawer component, no page-level change needed | Confirmed during investigation: the drawer already receives `entity.providerId`, so it can call `usePlatformProviders()` itself. |

## Out of Scope

- Per-run-history-item Airflow deep links (would require a new Airflow
  run-detail URL builder).
- Changing `buildAirflowDagUrl`, `OrchestratedEntity`, or
  `RecoveryRunHistoryEntity` types.
- Changing `RecoveryRunsPage.tsx` or `RecoveryRunsTable.tsx` (the entity
  table row already links via its own detail drawer, per the earlier
  `recovery-app-airflow-dag-link-plan.md` / Recovery Groups work).

## Open Questions

None — link scope (drawer-level, not per-run) and provider-URL resolution
approach were confirmed during planning.
