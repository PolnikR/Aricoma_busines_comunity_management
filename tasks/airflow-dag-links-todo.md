# Task Checklist: Dynamic Airflow DAG Links

## Central URL construction

- [x] Add the exact DAG URL builder to `src/config/externalServices.ts`.
- [x] Prefer the selected platform-provider URL.
- [x] Keep the fallback host and Airflow path rules in the central module.
- [x] Normalize trailing slashes, `/dags`, and the `dag_` prefix.
- [x] Add focused unit tests for URL construction.

## Submit success modal

- [x] Pass the selected provider URL through create and edit flows.
- [x] Build the modal action URL from the real API `airflow_run_id`.
- [x] Open the exact DAG in a safe new tab.
- [x] Omit the exact-DAG action when the run ID is unavailable.
- [x] Update create and edit page tests.

## Recovery Group detail drawer

- [x] Resolve the platform provider by `orchestrationProviderId`.
- [x] Link the displayed Airflow Run ID to the exact DAG URL.
- [x] Preserve the empty state when no run ID exists.
- [x] Add dynamic-provider, fallback, and missing-ID component tests.

## Focused verification

- [x] Run the central URL builder test.
- [x] Run Recovery Group create and edit page tests.
- [x] Run the Recovery Groups table test.
- [ ] Run TypeScript type checking.
- [x] Check that feature components contain no hardcoded Airflow host.
- [x] Run focused ESLint for the scoped TypeScript files.
- [x] Run `git diff --check` and inspect only the scoped files.
- [ ] Manually verify both links against one submitted group.

Type checking is currently blocked by the pre-existing `SelectableCardProps.content`
error in `src/shared/components/selectable-card/SelectableCard.tsx`.
