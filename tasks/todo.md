# Todo: Provider VM Prefix and Provider-Scoped VM Tags

Specification: GitHub issue #3. See `tasks/plan.md` for full acceptance
criteria, dependencies, risks, likely files, and verification commands.

## Phase 1: Data foundation

- [x] Task 1: Preserve VM settings in the infrastructure-provider API boundary.
- [x] Task 2: Make the tags API require an explicit provider ID.
- [x] Task 3: Scope the VMware tag query cache by provider and update Resources.

## Checkpoint: Data foundation

- [x] Run Tasks 1-3 focused tests together.
- [x] Run `npm run typecheck`.
- [x] Confirm no `/tags` request can occur without provider ID.

## Phase 2: Shared control and infrastructure UI

- [x] Task 4: Harden `MultiSelectDropdown` for persisted/disabled values.
- [x] Task 5: Add VM controls and approved provider form layout.
- [x] Task 6: Wire edit-only provider-scoped tags through the provider modal.

## Checkpoint: Infrastructure slice

- [x] Run Tasks 1-6 focused tests together.
- [x] Run typecheck and focused lint.
- [ ] Browser-check create/edit flows at desktop and narrow widths (not available in this agent session).

## Phase 3: Platform-provider slice

- [x] Task 7: Preserve VM settings in the platform-provider API boundary.
- [x] Task 8: Add VM controls and responsive platform form layout.
- [x] Task 9: Wire VM settings through the platform modal without tag fetching.

## Final Checkpoint

- [x] Run all focused tests listed in `tasks/plan.md` together.
- [x] Run `npm run typecheck`.
- [x] Run focused lint for all changed files.
- [x] Run `npm run api:check` and `git diff --check`.
- [ ] Browser-check both forms and keyboard multi-select behavior (not available in this agent session).
- [x] Report whether the full suite/build was run.
- [x] Review and commit only in-scope files atomically.
