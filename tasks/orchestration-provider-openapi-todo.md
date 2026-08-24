# Todo: OpenAPI-Aligned Orchestration Providers

## Phase 1: Contract

- [x] Task 1: Derive platform-provider types and validation from generated
      orchestration-provider schemas.
- [x] Add failing AIRFLOW + SMTP schema/model regression tests.

## Phase 2: API data flow

- [x] Task 2: Remove the AIRFLOW-only request filter and mapper rejection.
- [x] Preserve optional SMTP fields through read and submit mapping.
- [x] Add failing mixed-response and SMTP-submit API tests.

## Checkpoint: Contract and API

- [x] Focused model/schema/API tests pass.
- [x] No manual platform-provider type literal list remains.
- [x] Typecheck and focused lint pass.

## Phase 3: UI state and display

- [x] Task 3a: Add SMTP fields and OpenAPI optionality to form state/modal.
- [x] Task 3b: Display SMTP safely in the table, drawer, and JSON viewer.
- [x] Add failing form/modal/table tests before each production change.

## Final checkpoint

- [x] Run all focused platform-provider tests.
- [x] Run `npm run typecheck` and changed-file ESLint.
- [x] Run `git diff --check` and inspect status.
- [x] Commit only the verified orchestration-provider changes.
