# Implementation Plan: Dynamic Airflow DAG Links for Recovery Applications and Groups

## Overview

Recovery Application and Recovery Group orchestration UI will open the exact Airflow DAG instead of the generic `/dags` page. The link is derived from the API-provided `airflow_run_id` using the backend convention `dag_<airflow_run_id>`. The selected entity's `orchestration_provider_id` resolves the matching platform provider and its `url`, which is the primary runtime base URL; the only frontend fallback address and all Airflow path rules remain centralized in `src/config/externalServices.ts`.

This plan also adds an **Airflow DAG ID** column to both Recovery Applications and Recovery Groups tables. The column displays the derived `dag_<airflow_run_id>` value and opens the same exact Airflow DAG detail used by the existing detail drawer when clicked.

## Confirmed Behaviour

- Example input: `airflow_run_id = 260812103627_4c06f9c8`.
- Example DAG ID: `dag_260812103627_4c06f9c8`.
- Example target: `http://10.99.99.55:8080/dags/dag_260812103627_4c06f9c8`.
- The selected `orchestrationProviderId` resolves the matching platform provider dynamically.
- The selected provider's `url` wins over the frontend fallback.
- Feature components contain no Airflow host/IP literals and do not concatenate Airflow paths themselves.
- `RecoveryAppRecord.airflow_run_id` and `RecoveryGroupRecord.airflow_run_id` are the source fields from OpenAPI; neither list record contains a stored `dag_id`.
- The displayed DAG ID is derived as `dag_<airflow_run_id>` using the same normalization already implemented by `buildAirflowDagUrl()`.
- Table links resolve the provider URL per row through that row's `orchestrationProviderId`; they must not reuse a selected-detail provider URL.
- Clicking the DAG ID link opens Airflow in a new tab and stops row-click propagation so it does not also open the entity detail drawer.

## Architecture Decisions

- Extend the existing central external-services module rather than creating a second URL configuration source.
- Keep runtime provider addresses in platform-provider data. `EXTERNAL_SERVICES` supplies only the centrally editable fallback and Airflow route conventions.
- Expose one tested URL builder that normalizes provider URLs ending in `/`, `/dags`, or neither and creates one canonical DAG detail URL.
- Use the real `airflow_run_id` returned by `POST /submit_recovery_group`; do not generate a synthetic run ID.
- Do not change API contracts or persistence. The backend contract already returns `airflow_run_id` and `orchestration_provider_id`.
- Reuse the existing modal, detail drawer, button, and external-link components.

## Dependency Flow

```text
platform provider URL + central fallback/path config
                         |
                         v
               central DAG URL builder
                         |
              +----------+----------+
              |                     |
              v                     v
submit success modal       recovery-group detail drawer
```

## Task 1: Centralize Exact Airflow DAG URL Construction

**Description:** Add a small URL-building function to the existing external-services configuration. It accepts the real run ID and an optional selected provider URL, applies the `dag_` naming convention once, normalizes the `/dags` path, and falls back to the centrally configured Airflow address only when the provider has no usable URL.

**Acceptance criteria:**

- [ ] Provider URL is preferred over the fallback.
- [ ] Base URLs with or without trailing `/` and with or without `/dags` produce the same canonical result.
- [ ] `dag_` is not duplicated if the supplied identifier already contains it.
- [ ] No Recovery Group component contains a hardcoded Airflow host or manual `/dags/dag_` concatenation.

**Verification:**

- [ ] `npm exec vitest run src/config/externalServices.test.ts`
- [ ] Unit cases cover provider URL, fallback URL, path normalization, and prefix normalization.

**Dependencies:** None.

**Files likely touched:**

- `src/config/externalServices.ts`
- `src/config/externalServices.test.ts`

**Estimated scope:** Small (2 files).

## Task 2: Open the Exact DAG from the Submit Success Modal

**Description:** Pass the already resolved platform-provider URL from the create and edit pages into `RecoveryGroupOrchestratorSuccessModal`. When `airflow_run_id` is available, the existing “View in Airflow” action opens the exact URL returned by the central builder in a new tab.

**Acceptance criteria:**

- [ ] Create and update flows use the provider selected through `orchestrationProviderId`.
- [ ] Clicking “View in Airflow” opens `<provider-url>/dags/dag_<airflow_run_id>`.
- [ ] The action uses the central fallback only if the selected provider has no URL.
- [ ] If the API returns no run ID, the modal does not offer a misleading exact-DAG action.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- [ ] Tests assert the exact `window.open` URL and `noopener,noreferrer` behaviour.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestratorSuccessModal.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Estimated scope:** Medium (5 files).

## Checkpoint: Modal Flow

- [ ] The modal displays the API-provided run ID.
- [ ] The exact DAG opens under the selected provider's URL.
- [ ] No generic `/dags` navigation remains in the Recovery Group success modal.

## Task 3: Link the Recovery Group Detail Drawer to the Exact DAG

**Description:** Resolve the group's `orchestrationProviderId` against the cached/fetched platform providers in the Recovery Groups table. Render the existing Airflow Run ID detail as an external link created by the same central URL builder.

**Acceptance criteria:**

- [ ] A group with `airflowRunId` and a matching platform provider links to that provider's exact DAG detail.
- [ ] A missing provider URL uses the single central fallback.
- [ ] A group without `airflowRunId` continues to show the existing empty value and no link.
- [ ] The link opens safely in a new tab and keeps the displayed text equal to the real `airflow_run_id`.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- [ ] Component tests cover a dynamic provider URL, the fallback, and a missing run ID.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`

**Estimated scope:** Small (2 files).

## Task 4: Add Clickable Airflow DAG ID Columns to Recovery Applications and Recovery Groups

**Description:** Add one `Airflow DAG ID` data column to both list tables. Use each row's existing normalized `airflowRunId` and `orchestrationProviderId`; do not change the API contract or data models. When `airflowRunId` exists, display the canonical DAG ID (`dag_<airflow_run_id>`) as an external link produced by `buildAirflowDagUrl(airflowRunId, providerUrl)`. Resolve `providerUrl` from the already available platform-provider collection using the row's `orchestrationProviderId`. When the run ID is absent, display `—` and no link.

The table link must use the same safe external-link behavior as the detail drawer (`target="_blank"`, `rel="noopener noreferrer"`, `ExternalLinkIcon`) and call `event.stopPropagation()` so clicking it does not also trigger the table row's detail action.

**Acceptance criteria:**

- [ ] Recovery Applications table has an `Airflow DAG ID` column.
- [ ] Recovery Groups table has an `Airflow DAG ID` column.
- [ ] A row with `airflow_run_id = 260812103627_4c06f9c8` displays `dag_260812103627_4c06f9c8`.
- [ ] The link URL is generated only by `buildAirflowDagUrl()`; table components do not concatenate `/dags` or `dag_` into a URL.
- [ ] The row's `orchestrationProviderId` resolves its own platform-provider URL; different rows may point at different Airflow providers.
- [ ] If the resolved provider URL is absent, the existing central Airflow fallback is used by `buildAirflowDagUrl()`.
- [ ] A missing/null `airflowRunId` displays `—` and is not clickable.
- [ ] Clicking the DAG ID opens Airflow in a new tab and does not open/select the row detail drawer.
- [ ] Existing table filtering and pagination behavior is unchanged.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/config/externalServices.test.ts`
- [ ] App table test covers a row-specific provider URL, canonical visible DAG ID, `target="_blank"`, safe `rel`, click propagation, and missing run ID.
- [ ] Group table test covers the same behavior and proves a second provider can generate a different Airflow base URL.

**Dependencies:** Task 1. Existing detail-link behavior from Task 3 is the reference implementation.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- translation files only if the existing `details.airflowDagId` key cannot be reused cleanly as the table header

**Estimated scope:** Small (4 production/test files, translations only if required).

## Task 5: Focused Regression Verification

**Description:** Verify only the URL builder and affected Recovery Group UI paths, then inspect the final diff for accidental edits to generated contracts or unrelated features.

**Acceptance criteria:**

- [ ] All focused tests pass.
- [ ] TypeScript accepts the new modal/provider URL contract.
- [ ] Changed production files contain no Airflow IP literals outside the central configuration.
- [ ] Existing unrelated generated-file and task-file changes remain untouched.

**Verification:**

- [ ] `npm exec vitest run src/config/externalServices.test.ts src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- [ ] `npm run typecheck`
- [ ] `rg -n "10\\.99\\.99\\.55|/dags/dag_" src/features/recovery-plans/recovery-groups src/config`
- [ ] `git diff --check`
- [ ] Manual check: submit an orchestrated group and open the same exact DAG from both the success modal and the list detail drawer.

**Dependencies:** Tasks 2, 3, and 4.

**Files likely touched:** Only files listed in Tasks 1–4 unless verification exposes a directly related defect.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] Modal, detail drawer, and both list-table DAG ID links resolve the same exact DAG URL for the same entity.
- [ ] The provider URL is selected dynamically using `orchestrationProviderId`.
- [ ] Airflow fallback address and path conventions have one source of truth.
- [ ] Focused tests and type checking pass.
- [ ] Complete suite and production build are not run unless requested or focused verification cannot prove the change.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Platform-provider `url` may be either a base URL or a `/dags` URL | Broken or duplicated path | Normalize both forms in the central tested builder. |
| API omits `airflow_run_id` | Link cannot target a real DAG | Do not fabricate an ID; omit the exact-DAG action/link. |
| Provider lookup fails or URL is empty | Dynamic address unavailable | Use only the centrally configured fallback. |
| `dag_` is prefixed twice | Airflow returns 404 | Normalize the identifier in one central function and cover it with a unit test. |
| Existing dirty generated files are accidentally included | Unrelated changes are mixed into the feature | Restrict edits and verification to the listed files; review `git diff` before completion. |

## Out of Scope

- Changing the Recovery Group backend response or OpenAPI contract.
- Changing Airflow authentication or routing configuration.
- Changing rollback-result links or unrelated Recovery Application navigation.
- Centralizing IP addresses used only as isolated test fixtures or translated input examples.

## Open Questions

None. Dynamic provider URL with a centralized fallback and route builder is confirmed.
