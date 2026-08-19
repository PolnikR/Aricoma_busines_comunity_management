# Implementation Plan: Move Recovery Runs into Recovery Plans + Group Support

## Overview

Relocate the Recovery Runs feature from the flat "Storage Orchestration" nav
item to a "Recovery Runs" sub-item under "Recovery Plans", and extend it so
it covers Recovery Groups in addition to Recovery Applications. Add
All/Applications/Recovery Groups tabs driven by URL query params (so the page
stays independently usable and also deep-linkable), surface live orchestrator
status on both entities' detail panels, and wire a "View recovery runs" action
that navigates to the Recovery Runs page pre-filtered to that entity.

## Confirmed decisions (from user)

- **Tabs are query-param driven** (`?tab=all|applications|groups&entityId=...`
  on a single route), not separate routes per tab — this is what lets detail
  panels deep-link into a pre-filtered tab.
- **"Storage Orchestration" nav item stays**, but becomes empty again: once the
  `RecoveryRunsPage` route override is removed, the route falls back to the
  existing generic placeholder page config for `routes.storageOrchestration`
  in `src/app/modulePageConfigs.ts` (already defined, currently just filtered
  out of rendering — see Task 1).
- **Backend update (requested 2026-08-19, NOT YET LIVE — checked 2026-08-19
  against the real spec via `npm run api:pull`, confirmed absent): Recovery
  Applications are expected to eventually return `orchestration_provider_id`
  on the record, the same field name and shape Recovery Groups already
  return.** Once shipped, this removes the provider-id asymmetry entirely.
  Until then, `useOrchestratedApps` keeps its current "first eligible platform
  provider" fallback (`getEligiblePlatformProviders` /
  `usePlatformProviders`) — see Task 2 split into 2a (buildable now) / 2b
  (deferred until the field ships).

## Architecture decisions

- **Relocate, don't rebuild.** All the orchestrator-runs plumbing (API client,
  query keys, mapper, formatting helpers) already exists under
  `src/features/storage-orchestration/`. It moves to
  `src/features/recovery-plans/recovery-runs/` with import-path updates only
  — no behavioral change to the API layer itself.
- **Unify apps and groups behind one `OrchestratedEntity` type** rather than
  keeping two parallel per-type models all the way through. `useOrchestratedApps`
  and a new `useOrchestratedGroups` both normalize to
  `{ entityType: 'application' | 'group', id, name, dagId, providerId }`, and a
  new `useOrchestratedEntities()` merges them. This keeps `RecoveryRunsTable`,
  the runs-fetching hook, and the history drawer entity-type-agnostic — they
  only care about `dagId` + `providerId`, never about which domain object it
  came from.
- **Per-entity `providerId` in the runs-fetching hook.** Today
  `useOrchestratedAppRuns(apps, providerId)` takes one shared `providerId` for
  every app. Since groups carry their own `orchestrationProviderId`, the
  generalized hook takes `providerId` per entity instead
  (`useOrchestratedEntityRuns(entities: OrchestratedEntity[])`). Applications
  still all resolve to the same shared eligible-provider id under the hood —
  this is purely a signature generalization, not a behavior change for apps.
- **New small `useLatestOrchestratorRun(providerId, dagId)` hook** (single
  `useQuery`, no list) for detail-panel use, so opening an app/group detail
  drawer doesn't have to fetch every other entity's latest run just to show
  one row's status.

## Task List

### Phase 1: Move the feature, no behavior change

- [ ] **Task 1: Relocate Recovery Runs feature folder + routing + nav**
- [ ] **Task 1 checkpoint**: page loads at the new URL, old URL shows the placeholder, nothing else regresses

### Phase 2: Data layer for both entity types

- [ ] **Task 2a: Generalize the data hooks to support Applications + Recovery Groups (buildable now)**
- [ ] **Task 2a checkpoint**: hook unit tests green for apps, groups, and merged entities
- [ ] **Task 2b (BLOCKED): Switch Applications to their own `orchestration_provider_id`** — do not start until backend confirmed live

### Phase 3: Page UX

- [ ] **Task 3: Add All / Applications / Recovery Groups tabs (query-param driven)**
- [ ] **Task 3 checkpoint**: manual check — switching tabs filters correctly, `?tab=` in URL updates, reload preserves tab

### Phase 4: Detail panels + cross-navigation

- [ ] **Task 4: Recovery Application detail drawer — orchestrator status + "View recovery runs"**
- [ ] **Task 5: Recovery Group detail drawer — orchestrator status + "View recovery runs"**
- [ ] **Task 5 checkpoint**: clicking "View recovery runs" from either entity lands on the right tab, pre-filtered, and the page is still usable standalone

### Phase 5: Polish

- [ ] **Task 6: Locale entries, dead-code cleanup, full focused verification**

---

## Task 1: Relocate Recovery Runs feature folder + routing + nav

**Description:** Move `src/features/storage-orchestration/` to
`src/features/recovery-plans/recovery-runs/` (folder rename, import paths
updated, no logic changes). Wire the route under
`/recovery-plans/recovery-runs` instead of `/storage-orchestration`. Add
"Recovery Runs" as a Recovery Plans sidebar sub-item. Let `/storage-orchestration`
fall back to its existing placeholder page.

**Acceptance criteria:**
- [ ] `RecoveryRunsPage` and all its supporting files live under
      `src/features/recovery-plans/recovery-runs/` with no import breakage
      (`npx tsc --noEmit` clean).
- [ ] Visiting `/recovery-plans/recovery-runs` renders the Recovery Runs page;
      visiting `/storage-orchestration` renders the existing generic
      placeholder (EP-04) instead.
- [ ] Sidebar "Recovery Plans" menu shows a "Recovery Runs" sub-item (reusing
      the existing unused `nav.recovery.runs` translation key / `navKeyMap`
      entry — no new key needed) that highlights correctly when active.
- [ ] "Storage Orchestration" remains a top-level sidebar item pointing at
      `/storage-orchestration` (now the placeholder).

**Verification:**
- [ ] `npx tsc --noEmit`
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`
- [ ] Manual: click through sidebar Recovery Plans > Recovery Runs; confirm old `/storage-orchestration` shows the placeholder card.

**Dependencies:** None

**Files likely touched:**
- `src/features/storage-orchestration/**` → moved to `src/features/recovery-plans/recovery-runs/**` (all 18 files from the earlier glob: page, table, drawer, hooks, api, model, helpers, and their tests)
- `src/app/routes.ts` — remove `storageOrchestration` usage for this page (keep the constant, it now points at the placeholder), reuse existing `recoveryRuns: '/recovery-plans/recovery-runs'` constant (already defined)
- `src/app/AppRoutes.tsx` — replace the `recovery-runs` redirect (lines 290-293) with the real `RecoveryRunsPage` route; remove the `storage-orchestration` route override (lines 384-391); remove `routes.storageOrchestration` from the `remainingEpicPages` filter exclusion (line 381-383) so the placeholder renders again
- `src/layouts/app-shell/AppSidebar.tsx` — add `{ name: 'Recovery Runs', path: routes.recoveryRuns }` to the `Recovery Plans` `subItems` array (lines 61-70); `navKeyMap` entry already exists (line 99)

**Estimated scope:** Medium (mechanical move across ~18 files + 3 wiring files)

---

## Task 2a: Generalize the data hooks to support Applications + Recovery Groups (buildable now)

**Description:** Introduce a unified `OrchestratedEntity` shape, build the
Recovery Groups equivalent of the existing Applications orchestration hook,
and generalize the runs-fetching hook to work over a mixed list of entities
that each carry their own provider id. Applications keep their **current**
"first eligible platform provider" fallback for now (see Task 2b) — checked
2026-08-19 against the live backend spec via `npm run api:pull` and confirmed
`RecoveryAppRecord` does not yet have `orchestration_provider_id` (Recovery
Groups' schema already does). Building the unified entity abstraction now,
with apps still on the old fallback internally, means Task 3 (tabs) isn't
blocked on the backend at all — only the narrow swap in Task 2b is.

**Acceptance criteria:**
- [ ] `OrchestratedEntity { entityType: 'application' | 'group', id, name, dagId, providerId }` added to `recoveryRunTypes.ts` (alongside existing `OrchestratorRun`/`OrchestratorRunsPage`; `OrchestratedApp` folded into this).
- [ ] `useOrchestratedApps` maps to `OrchestratedEntity[]` with `entityType: 'application'`, still filtering on a real `airflowRunId` and resolving `providerId` via `getEligiblePlatformProviders`/`usePlatformProviders` (unchanged logic, new output shape — this is the piece Task 2b later swaps).
- [ ] New `useOrchestratedGroups` hook mirrors it for Recovery Groups: sources `useRecoveryGroups()`, filters to `pushToOrchestrator && airflowRunId && orchestrationProviderId` all truthy, `dagId = \`dag_${airflowRunId}\``, `providerId = group.orchestrationProviderId` (this field already exists and works today, no backend dependency).
- [ ] New `useOrchestratedEntities()` combines both hooks: merged `entities` array, aggregated `isLoading`/`isFetching`/`error`/`refetch`.
- [ ] `useOrchestratedAppRuns(apps, providerId)` becomes `useOrchestratedEntityRuns(entities: OrchestratedEntity[])`, reading `providerId` off each entity instead of a single shared param; query key becomes `recoveryRunsKeys.latest(entity.providerId, entity.dagId)`.
- [ ] New `useLatestOrchestratorRun(providerId: string | null, dagId: string | null)` — single `useQuery` wrapping `fetchOrchestratorRuns(..., { limit: 1, orderBy: '-logical_date' })`, for single-entity detail-panel use (Tasks 4/5).
- [ ] `useAppRunHistory` (paginated history) needs no signature change — it already takes plain `providerId`/`dagId` strings, so it works unmodified for both entity types. Consider renaming to `useOrchestratorRunHistory` for clarity since it's no longer app-specific (rename is optional, judgment call at implementation time).

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedAppRuns.test.tsx`
- [ ] `npx tsc --noEmit`

**Dependencies:** Task 1 (files must already be at their new location)

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/model/recoveryRunTypes.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts` (+ test)
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.ts` (new, + test)
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.ts` (new)
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedAppRuns.ts` → generalize (+ test)
- `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.ts` (new)
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts` (read-only consumption, no change expected)

**Estimated scope:** Medium (5-7 files, mostly new + one generalization)

---

## Task 2b (BLOCKED — deferred): Switch Applications to their own `orchestration_provider_id`

**Description:** Once the backend actually ships `orchestration_provider_id`
on `GET /get_recovery_apps` responses (confirmed absent as of 2026-08-19),
add the field through the schema/mapper layer and drop Applications' "first
eligible platform provider" fallback in favor of reading the id directly off
each record — bringing Applications to full parity with how Recovery Groups
already work.

**Acceptance criteria:**
- [ ] Re-run `npm run api:pull` and confirm `RecoveryAppRecord` in the refreshed `openapi/abco-api.json` now includes `orchestration_provider_id`; run `npm run api:generate` so the generated Zod schema (`RecoveryAppRecordOutput`) picks it up (generated files — never hand-edit `zod.gen.ts` directly).
- [ ] `RecoveryApplicationApiRecord` and `RecoveryApplicationListItem` in `recoveryApplicationTypes.ts` gain `orchestration_provider_id?` / `orchestrationProviderId?` fields, matching the shape already used on `RecoveryGroupReadRecord.orchestration_provider_id` / `RecoveryGroup.orchestrationProviderId`.
- [ ] `mapRecoveryApplications.ts` maps `record.orchestration_provider_id` → `orchestrationProviderId` (and `toRecoveryApplicationJson` round-trips it back), following the same optional-field pattern already used there for `airflow_run_id`/`push_to_orchestrator`.
- [ ] `useOrchestratedApps` filters to entries where `airflowRunId` **and** `orchestrationProviderId` are both truthy, `providerId = record.orchestrationProviderId` — **no longer** depends on `usePlatformProviders`/`getEligiblePlatformProviders`, which is deleted from this hook.
- [ ] Task 4's Application detail drawer switches from whatever interim provider source it used to `selected.orchestrationProviderId` directly (see Task 4 note).

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx`
- [ ] `npx tsc --noEmit`

**Dependencies:** Backend must ship the field first — **do not start this task until re-confirmed live**, not just "requested"

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts` (+ test)
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts` (+ test)
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx` (provider source swap, from Task 4)
- `openapi/abco-api.json`, `src/generated/api/**` (regenerated, not hand-edited)

**Estimated scope:** Small (3-4 files, once unblocked)

---

## Task 3: Add All / Applications / Recovery Groups tabs (query-param driven)

**Description:** Rebuild `RecoveryRunsPage` on top of `useOrchestratedEntities()`
/ `useOrchestratedEntityRuns()`, add a query-param-driven tab state (modeled on
`useResourceTabSearchParam`), and render tabs via the existing shared `Tabs`
component inside `InventoryShell` (which already accepts a `tabs` prop, currently
passed `null`).

**Acceptance criteria:**
- [ ] New `useRecoveryRunsTabSearchParam()` hook: reads/writes `tab` (`all` | `applications` | `groups`, default `all`) and `entityId` (optional) query params, resets to page 1 on tab change.
- [ ] `RecoveryRunsTable` row type extended with `entityType` and `dagId`; an entity-type badge/column is shown when the active tab is "All" (hidden on single-type tabs, since it's redundant there).
- [ ] `RecoveryRunsPage` renders `<Tabs>` with 3 items; switching tabs filters `entities` by `entityType` client-side (no extra network calls — same merged list, just filtered).
- [ ] When `entityId` is present in the URL, the table is further filtered to just that one entity (this is the pre-filter behavior Tasks 4/5 rely on) — but the page still renders normally with no `entityId` present (standalone usability).
- [ ] `RecoveryRunHistoryDrawer` accepts a generic `{ id, name, dagId }` + `providerId` instead of specifically `OrchestratedApp` (trivial widening, since it already only reads those three fields).

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`
- [ ] `npx tsc --noEmit`
- [ ] Manual: `/recovery-plans/recovery-runs`, `?tab=applications`, `?tab=groups`, `?tab=applications&entityId=<id>` all behave as expected; browser back/forward preserves tab.

**Dependencies:** Task 2a (does NOT depend on Task 2b — works fine with Applications still on the interim provider fallback)

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/hooks/useRecoveryRunsTabSearchParam.ts` (new)
- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx` (+ test)
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx` (+ test)
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.tsx` (+ test)

**Estimated scope:** Medium (3-5 files)

---

## Task 4: Recovery Application detail drawer — orchestrator status + "View recovery runs"

**Description:** When a selected application has `pushToOrchestrator === true`,
show Airflow DAG ID, latest run status, last executed, duration, and a "View
recovery runs" action in the existing `DetailDrawer` in
`RecoveryApplicationsTable.tsx` (currently at lines 313-334, no orchestration
info shown at all today).

**Note (interim, until Task 2b unblocks):** Applications don't have their own
`orchestrationProviderId` yet. Source the provider id the same way
`useOrchestratedApps` does in Task 2a — via `getEligiblePlatformProviders`
(e.g. by consuming `useOrchestratedEntities()` and looking up this app's own
entry, or a tiny local call to the same eligible-provider helper). When Task
2b lands, swap this one line to `selected.orchestrationProviderId` — tracked
explicitly in Task 2b's acceptance criteria so it isn't forgotten.

**Acceptance criteria:**
- [ ] New `DetailRow`s appear only when `selected.pushToOrchestrator && selected.airflowRunId` are both truthy (provider truthiness is implicit via the interim lookup): DAG ID (`dag_${airflowRunId}`), latest run status badge, last-executed timestamp, duration — sourced from `useLatestOrchestratorRun(providerId, dagId)`.
- [ ] "View recovery runs" button/link navigates to `${routes.recoveryRuns}?tab=applications&entityId=${selected.id}`.
- [ ] Nothing renders (no broken empty rows) when the application isn't orchestrated.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [ ] `npx tsc --noEmit`

**Dependencies:** Task 3 (needs the `?tab=&entityId=` contract to exist); does NOT wait on Task 2b, but will need a one-line follow-up once 2b lands

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx` (+ test)

**Estimated scope:** Small (1-2 files)

---

## Task 5: Recovery Group detail drawer — orchestrator status + "View recovery runs"

**Description:** Extend the existing orchestration section in
`RecoveryGroupsTable.tsx`'s `DetailDrawer` (lines 386-411 already show a
push-to-orchestrator badge and an external Airflow link) with latest run
status, last executed, duration, and a "View recovery runs" action.

**Acceptance criteria:**
- [ ] New `DetailRow`s (status/last-executed/duration) appear alongside the
      existing orchestration/airflow-link rows, sourced from
      `useLatestOrchestratorRun(selected.orchestrationProviderId, \`dag_${selected.airflowRunId}\`)`.
- [ ] "View recovery runs" action navigates to `${routes.recoveryRuns}?tab=groups&entityId=${selected.id}`.
- [ ] Existing airflow-link `DetailRow` and rollback button behavior are untouched.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- [ ] `npx tsc --noEmit`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx` (+ test)

**Estimated scope:** Small (1-2 files)

---

## Task 6: Locale entries, dead-code cleanup, full focused verification

**Description:** Add missing translation keys (en/cs/sk) for the new tabs,
type column, and detail-panel labels; confirm no leftover dead imports/routes
from the move; run the full set of touched focused tests plus a type check.

**Acceptance criteria:**
- [ ] New keys added to all three locale files: tab labels (`recoveryRuns.tabs.all/applications/groups`), type column header, `details.airflowDagId`, `details.latestRunStatus`, `details.lastExecuted`, `details.duration` (reuse if equivalents already exist — check first), `buttons.viewRecoveryRuns`.
- [ ] No remaining references to `src/features/storage-orchestration/*` anywhere in `src/` (grep clean).
- [ ] `routes.storageOrchestration` and `routes.recoveryRuns` both still resolve correctly (placeholder vs. real page respectively).

**Verification:**
- [ ] `npx tsc --noEmit`
- [ ] `npm exec vitest run` on every test file touched across Tasks 1-5 (list explicitly, do not run the full suite)
- [ ] `git diff --check` (no leftover conflict markers/whitespace issues in locale JSON)

**Dependencies:** Tasks 1-5

**Files likely touched:**
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** Small (3-4 files)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `orchestrationProviderId` might be stale/unresolved for some apps or groups (provider deleted, etc.) | Medium — an entity could show `pushToOrchestrator: true` but have no usable provider to query runs with | Both `useOrchestratedApps` and `useOrchestratedGroups` require `orchestrationProviderId` truthy as part of the orchestrated-entity filter; entities failing this are simply excluded from the list rather than erroring |
| Backend ships `orchestration_provider_id` on the raw API response before the generated Zod schema (`RecoveryAppRecordOutput`) is regenerated to include it | High — the field would be silently stripped by Zod validation (`parseGeneratedResponse`), and `orchestrationProviderId` would always be `undefined` even though the backend is sending it | Materialized: checked 2026-08-19 via `npm run api:pull` and confirmed the field is genuinely absent from `RecoveryAppRecord`. Task 2 was split into 2a (buildable now, apps keep the old provider fallback) / 2b (blocked — do not start until `api:pull` shows the field live, then `api:generate` to regenerate the Zod schema before touching the mapper) |
| Renaming `useOrchestratedAppRuns` → `useOrchestratedEntityRuns` touches a query key shape other code might rely on | Low — only `RecoveryRunsPage`/`RecoveryRunHistoryDrawer` consume `recoveryRunsKeys`, confirmed via grep | Grep for `recoveryRunsKeys` usage before removing the old hook to confirm no other consumers |
| Folder move (Task 1) could silently break a lazy-loaded route if an import path is missed | Medium — blank page at runtime, not always caught by `tsc` if a dynamic import string is wrong | `tsc --noEmit` catches static import breaks; manually visit both old and new URLs as part of Task 1 verification |

## Open Questions

- **Task 2b is blocked on the backend.** `orchestration_provider_id` was
  requested for Recovery Applications but is not live yet (confirmed absent
  2026-08-19). Task 2a/3/4/5 proceed without it (Applications keep the
  existing eligible-provider fallback); Task 2b and the one-line follow-up it
  requires in Task 4 stay open until the backend ships the field.
