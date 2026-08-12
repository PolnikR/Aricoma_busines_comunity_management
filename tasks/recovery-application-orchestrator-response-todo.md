# Task Checklist: Recovery Application Orchestrator Submit Responses

## Contract

- [x] Add explicit local-only submit response schema/type.
- [x] Add explicit orchestrated submit response schema/type.
- [x] Require `status`, `dag`, `json`, and `dag_id` for true mode.
- [x] Parse the response according to the submitted boolean.
- [x] Add false, true, and malformed-true API tests.

## Builder and mutation

- [x] Add `pushToOrchestrator` to Recovery Application form state.
- [x] Default Create to `false`.
- [x] Restore the value from GET data during Edit.
- [x] Add the shared toggle UI and dirty-state handling.
- [x] Forward the selected boolean through the mutation hook.
- [x] Keep the request body unchanged.

## Shared modal

- [x] Add a reusable orchestrator result modal under shared components.
- [x] Render configurable detail rows with safe path wrapping.
- [x] Preserve close and optional Airflow action behavior.
- [x] Refactor Recovery Group success modal to consume the shared component.
- [x] Add shared and Recovery Group regression tests.

## Create and Edit integration

- [x] False-mode Create navigates immediately without a modal.
- [x] True-mode Create shows all orchestrator response fields.
- [x] False-mode Edit navigates immediately without a modal.
- [x] True-mode Edit shows the same modal.
- [x] True-mode navigation waits until modal close.
- [x] Failed parsing/submission preserves builder data and shows an error.

## Localization and verification

- [x] Add EN translations.
- [x] Add SK translations.
- [x] Add CS translations.
- [x] Run Recovery Application tests.
- [x] Run shared modal and Recovery Group regression tests.
- [x] Run lint.
- [x] Run typecheck.
- [ ] Run the full test suite (timed out in this environment; focused suite passed).
- [x] Run the production Vite build.
- [ ] Manually verify one false-mode and one true-mode submit.
