# Todo: OpenAPI-Aligned Orchestration Providers

## Phase 1: Contract

- [ ] Task 1: Derive platform-provider types and validation from generated
      orchestration-provider schemas.
- [ ] Add failing AIRFLOW + SMTP schema/model regression tests.

## Phase 2: API data flow

- [ ] Task 2: Remove the AIRFLOW-only request filter and mapper rejection.
- [ ] Preserve optional SMTP fields through read and submit mapping.
- [ ] Add failing mixed-response and SMTP-submit API tests.

## Checkpoint: Contract and API

- [ ] Focused model/schema/API tests pass.
- [ ] No manual platform-provider type literal list remains.
- [ ] Typecheck and focused lint pass.

## Phase 3: UI state and display

- [ ] Task 3a: Add SMTP fields and OpenAPI optionality to form state/modal.
- [ ] Task 3b: Display SMTP safely in the table, drawer, and JSON viewer.
- [ ] Add failing form/modal/table tests before each production change.

## Final checkpoint

- [ ] Run all focused platform-provider tests.
- [ ] Run `npm run typecheck` and changed-file ESLint.
- [ ] Run `git diff --check` and inspect status.
- [ ] Commit only the verified orchestration-provider changes.
