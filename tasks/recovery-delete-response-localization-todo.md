# Todo: Recovery Delete Responses and Rollback Localization

## Phase 1: Response contract

- [ ] Task 1: Add a failing orchestrated-delete regression test for a complete
      Recovery Application rollback payload.
- [ ] Task 1: Parse original `payload.rollback` with the local loose schema
      after generated envelope validation.
- [ ] Task 1: Run focused Recovery Application and Recovery Group API tests,
      focused lint, and create an atomic commit.

## Phase 2: Localization contract

- [ ] Task 2: Inventory both rollback namespaces and add missing EN/CZ/SK keys.
- [ ] Task 2: Localize all Recovery Group and Recovery Application rollback
      values in Czech and Slovak while preserving placeholders.
- [ ] Task 2: Add and run the rollback locale key-parity test, validate JSON,
      and create an atomic commit.

## Checkpoint: Data and copy contracts

- [ ] Full app rollback details survive parsing, including unknown properties.
- [ ] Group delete response behavior remains green.
- [ ] EN, CZ, and SK contain identical keys for both rollback namespaces.
- [ ] No generated Orval or OpenAPI files were edited.

## Phase 3: Result presentation

- [ ] Task 3: Add focused Recovery Application rollback result modal tests.
- [ ] Task 3: Tighten Recovery Group modal coverage only where required.
- [ ] Task 3: Prove complete raw response rendering and resolved EN/CZ/SK
      titles, subtitles, section labels, status text, and actions.
- [ ] Task 3: Run focused modal/table tests, focused lint, typecheck, and create
      an atomic commit.

## Final Checkpoint

- [ ] Run the combined focused API, locale, modal, and table test set.
- [ ] Run focused ESLint for changed TypeScript/TSX files.
- [ ] Run typecheck when implementation changes TypeScript/TSX files.
- [ ] Run `git diff --check` and inspect staged files before each commit.
- [ ] Preserve unrelated dirty Vitest setup and API-client test files.
- [ ] Do not run the full suite or production build unless focused checks show
      cross-cutting risk or the user explicitly requests them.
