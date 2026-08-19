# Implementation Plan: Airflow DAG Link for Recovery Applications

## Overview

Recovery Groups already open the exact Airflow DAG (not the generic `/dags`
page) from both their submit-success modal and their detail drawer, via the
central `buildAirflowDagUrl` builder in `src/config/externalServices.ts` and
each group's own `orchestrationProviderId`. Recovery Applications have no such
link anywhere, and the backend does not (yet) return an
`orchestration_provider_id` for applications — this is the same asymmetry
tracked as blocked Task 2b in `tasks/plan.md`.

This plan adds the same "view exact DAG" link to Recovery Applications in two
places — the push-confirmation modal and the detail drawer's Orchestration
tab — reusing the existing interim provider-resolution workaround
(`useOrchestratedApps`'s `providerId`, the first eligible platform provider)
that the codebase already uses for the applications' latest-run lookup. No
backend change, no new API contract, no new URL-building logic.

## Confirmed decisions (from brainstorming)

- Use the existing interim `providerId` from `useOrchestratedApps()` (+ its
  `.url` looked up in the already-loaded platform providers list), not a
  bare central fallback — this matches how the same interim value already
  drives `useLatestOrchestratorRun` in `RecoveryApplicationsTable`.
- Detail-drawer link uses `selected.airflowRunId` (the raw run id field, same
  field Recovery Groups link from), not the pre-formatted `dag_...` display
  string — `buildAirflowDagUrl` normalizes the `dag_` prefix itself.
- Both surfaces reuse `buildAirflowDagUrl` from `src/config/externalServices.ts`
  unchanged. No new config, no new URL logic.
- Link/button is omitted (not shown disabled) when there is no run id —
  same rule already used by Recovery Groups.

## Architecture decisions

- **Detail drawer**: change the existing `details.airflowDagId` `DetailRow` in
  `RecoveryApplicationsTable.tsx` from plain text to an anchor, copying the
  exact JSX/classes from `RecoveryGroupsTable.tsx`'s `airflowRunId` row
  (`<a>` + `ExternalLinkIcon`, `target="_blank" rel="noopener noreferrer"`).
- **Push modal**: add an optional `providerUrl` prop to
  `RecoveryApplicationOrchestratorSuccessModal`, passed down from
  `RecoveryApplicationBuilderPage` and `RecoveryApplicationEditorPage`. Both
  pages call `usePlatformProviders()` + `getEligiblePlatformProviders` (the
  same helper `useOrchestratedApps` already uses) to resolve the same
  first-eligible-provider URL, so the modal and the table agree on which
  provider's DAG they point to.
- No change to `OrchestratorPush`/`RecoveryAppRecord` types, no change to
  `buildAirflowDagUrl` itself (Task 1 of `airflow-dag-links-plan.md` already
  covers provider-URL vs. fallback normalization).

## Dependency Flow

```text
useOrchestratedApps() providerId  +  usePlatformProviders() list
                         |
                         v
              provider.url lookup by id
                         |
              +----------+----------+
              |                     |
              v                     v
  RecoveryApplicationsTable    Builder/EditorPage
  (detail drawer link)         -> success modal (button)
```

## Task List

### Phase 1: Detail drawer link

- [ ] **Task 1: Link the Airflow Run ID row in the Recovery Application detail drawer**

**Description:** In `RecoveryApplicationsTable.tsx`, resolve the interim
provider's `.url` from the already-loaded `providers` list using the existing
`orchestratorProviderId` (from `useOrchestratedApps()`). Change the
`details.airflowDagId` `DetailRow` value to render an anchor built with
`buildAirflowDagUrl(selectedAirflowRunId, selectedOrchestrationProviderUrl)`
when `selectedAirflowRunId` exists, matching `RecoveryGroupsTable.tsx`'s
`airflowRunId` row exactly (link text, `ExternalLinkIcon`, classes,
`target`/`rel`).

**Acceptance criteria:**
- [ ] Detail drawer shows a clickable "view in Airflow" link for an
      orchestrated application with a run id.
- [ ] Link URL uses the resolved provider URL when an eligible provider
      exists, and the central fallback otherwise (via `buildAirflowDagUrl`'s
      existing behavior — no new fallback logic written here).
- [ ] An application with no `airflowRunId` shows the existing plain value,
      no link.
- [ ] No hardcoded Airflow host or manual path concatenation added.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [ ] Manual check: open an orchestrated application's detail drawer, click
      the Airflow Run ID link, confirm it opens the exact DAG in a new tab.

**Dependencies:** None (all reused pieces — `buildAirflowDagUrl`,
`useOrchestratedApps`, `providers` — already exist in this file).

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`

**Estimated scope:** Small (2 files).

### Checkpoint: Detail drawer

- [ ] Focused test passes.
- [ ] Manual check confirms the link opens the correct DAG.

### Phase 2: Push-confirmation modal

- [ ] **Task 2: Open the exact DAG from the Recovery Application push modal**

**Description:** Add an optional `providerUrl?: string` prop to
`RecoveryApplicationOrchestratorSuccessModal`. When `orchestratorPush.dag_id`
is present, render a "View in Airflow" action (same
`ChecklistResultDialog`/external-action pattern `RecoveryGroupOrchestratorSuccessModal`
uses) that opens `buildAirflowDagUrl(orchestratorPush.dag_id, providerUrl)` in
a new tab. `RecoveryApplicationBuilderPage` and `RecoveryApplicationEditorPage`
resolve `providerUrl` via `usePlatformProviders()` +
`getEligiblePlatformProviders` (same helper, same first-eligible-provider
result `useOrchestratedApps` already produces) and pass it into the modal.

**Acceptance criteria:**
- [ ] Clicking "View in Airflow" in the push modal opens
      `<provider-url>/dags/dag_<dag_id>` (or the central fallback if no
      eligible provider) in a new tab with `noopener,noreferrer`.
- [ ] If `orchestratorPush.dag_id` is absent, the modal shows no
      misleading action (same rule as Recovery Groups).
- [ ] Both create and edit flows pass the resolved provider URL.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.test.tsx`
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- [ ] Manual check: submit/update an orchestrated application, click
      "View in Airflow" in the resulting modal.

**Dependencies:** Task 1 (establishes the provider-url resolution pattern in
this feature; can technically run in parallel but shares the same lookup
logic, so doing Task 1 first avoids duplicating it).

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Estimated scope:** Medium (6 files).

### Checkpoint: Modal flow

- [ ] Modal and detail drawer resolve the same exact DAG URL for the same
      application.
- [ ] No generic `/dags` navigation remains for Recovery Applications.

### Phase 3: Focused verification

- [ ] **Task 3: Focused regression verification**

**Description:** Run only the tests touched above, typecheck, and scan for
accidental hardcoded Airflow literals.

**Acceptance criteria:**
- [ ] All focused tests pass.
- [ ] TypeScript accepts the new modal/page provider-url plumbing.
- [ ] No Airflow host literal or manual `/dags/dag_` concatenation introduced
      outside `src/config/externalServices.ts`.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- [ ] `npm run typecheck`
- [ ] `rg -n "10\\.99\\.99\\.55|/dags/dag_" src/features/recovery-plans/recovery-applications`
- [ ] `git diff --check`

**Dependencies:** Tasks 1 and 2.

**Files likely touched:** None beyond Tasks 1–2 unless verification exposes
a directly related defect.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] Detail drawer and push modal both resolve the same exact DAG URL for a
      given Recovery Application.
- [ ] Provider URL is resolved via the existing interim
      `useOrchestratedApps`/`getEligiblePlatformProviders` pattern — no new
      resolution logic duplicated elsewhere.
- [ ] Focused tests and typecheck pass.
- [ ] Complete suite and production build are not run unless requested.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Interim `providerId` (first eligible provider) may not be the provider that actually ran a given application's DAG once multiple providers exist | Link could point at the wrong Airflow instance | Documented, pre-existing limitation shared with the already-shipped `useLatestOrchestratorRun` usage; resolved for real once backend ships per-application `orchestration_provider_id` (Task 2b in `tasks/plan.md`). Not solved by this plan. |
| Duplicating the eligible-provider lookup in two pages instead of one hook | Drift between drawer and modal resolution | Both pages call the same exported `getEligiblePlatformProviders` helper `useOrchestratedApps` already uses — no new logic to keep in sync. |

## Out of Scope

- Changing the Recovery Application backend response or OpenAPI contract.
- Building the real `orchestration_provider_id` support (blocked Task 2b in
  `tasks/plan.md` — separate, backend-gated effort).
- Changing `buildAirflowDagUrl` or `externalServices.ts` itself.
- Recovery Group links (already shipped).

## Open Questions

None — interim provider resolution, link placement, and fallback behavior
were confirmed during brainstorming.
