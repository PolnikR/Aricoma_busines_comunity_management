# Task Checklist: Airflow DAG Link for Recovery Applications

## Detail drawer link

- [x] Resolve the provider URL from `usePlatformProviders()` + the existing
      `orchestratorProviderId` (from `useOrchestratedApps()`) in
      `RecoveryApplicationsTable.tsx`.
- [x] Render the `details.airflowDagId` row as a link (same JSX pattern as
      `RecoveryGroupsTable.tsx`'s `airflowRunId` row) when a run id exists.
- [x] Preserve the existing plain-text/no-link state when there is no run id.
- [x] Add/update component tests for the linked and unlinked states.

## Push-confirmation modal

- [x] Add an optional `providerUrl` prop to
      `RecoveryApplicationOrchestratorSuccessModal`.
- [x] Render a "View in Airflow" action when `orchestratorPush.dag_id` exists,
      opening `buildAirflowDagUrl(dag_id, providerUrl)` in a new tab. (Added
      `externalActionLabel`/`onExternalAction` support to the shared
      `ChecklistResultDialog` to render it.)
- [x] Omit the action when `dag_id` is absent. (Not needed in practice — the
      local `OrchestratorPush` type guarantees `dag_id: string`.)
- [x] Resolve `providerUrl` in `RecoveryApplicationBuilderPage` and
      `RecoveryApplicationEditorPage` via `useOrchestratedApps()` +
      `usePlatformProviders()` (same interim pattern as the table), and pass
      it to the modal.
- [x] Update modal and page tests.

## Focused verification

- [x] Run the Recovery Applications table test.
- [x] Run the push modal test.
- [x] Run the builder/editor page tests.
- [x] Run TypeScript type checking.
- [x] Check for hardcoded Airflow host literals in the changed feature files
      (none found outside test fixtures).
- [x] Run `git diff --check` and inspect only the scoped files.
- [ ] Manually verify both links against one submitted/orchestrated
      application (not done — no running dev/API environment in this
      session).
