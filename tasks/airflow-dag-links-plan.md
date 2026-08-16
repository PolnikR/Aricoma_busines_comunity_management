# Implementation Plan: Dynamic Airflow DAG Links for Recovery Groups

## Overview

Recovery Group submission and detail views will open the exact Airflow DAG instead of the generic `/dags` page. The link will be derived from the API-provided `airflow_run_id` using the backend convention `dag_<airflow_run_id>`. The selected orchestration provider's `url` is the primary runtime base URL; the only frontend fallback address and all Airflow path rules remain centralized in `src/config/externalServices.ts`.

## Confirmed Behaviour

- Example input: `airflow_run_id = 260812103627_4c06f9c8`.
- Example DAG ID: `dag_260812103627_4c06f9c8`.
- Example target: `http://10.99.99.55:8080/dags/dag_260812103627_4c06f9c8`.
- The selected `orchestrationProviderId` resolves the matching platform provider dynamically.
- The selected provider's `url` wins over the frontend fallback.
- Feature components contain no Airflow host/IP literals and do not concatenate Airflow paths themselves.

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

## Task 4: Focused Regression Verification

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

**Dependencies:** Tasks 2 and 3.

**Files likely touched:** Only files listed in Tasks 1–3 unless verification exposes a directly related defect.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] Modal and detail drawer resolve the same exact DAG URL.
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
- Updating Recovery Application or rollback-result links unless requested separately.
- Centralizing IP addresses used only as isolated test fixtures or translated input examples.

## Open Questions

None. Dynamic provider URL with a centralized fallback and route builder is confirmed.
