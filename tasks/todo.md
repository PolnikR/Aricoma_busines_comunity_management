# Todo: Provider VM Prefix and Provider-Scoped VM Tags

Specification: GitHub issue #3. See `tasks/plan.md` for full acceptance
criteria, dependencies, risks, likely files, and verification commands.

## Phase 1: Data foundation

- [ ] Task 1: Preserve VM settings in the infrastructure-provider API boundary.
- [ ] Task 2: Make the tags API require an explicit provider ID.
- [ ] Task 3: Scope the VMware tag query cache by provider and update Resources.

## Checkpoint: Data foundation

- [ ] Run Tasks 1-3 focused tests together.
- [ ] Run `npm run typecheck`.
- [ ] Confirm no `/tags` request can occur without provider ID.

## Phase 2: Shared control and infrastructure UI

- [ ] Task 4: Harden `MultiSelectDropdown` for persisted/disabled values.
- [ ] Task 5: Add VM controls and approved provider form layout.
- [ ] Task 6: Wire edit-only provider-scoped tags through the provider modal.

## Checkpoint: Infrastructure slice

- [ ] Run Tasks 1-6 focused tests together.
- [ ] Run typecheck and focused lint.
- [ ] Browser-check create/edit flows at desktop and narrow widths.

## Phase 3: Platform-provider slice

- [ ] Task 7: Preserve VM settings in the platform-provider API boundary.
- [ ] Task 8: Add VM controls and responsive platform form layout.
- [ ] Task 9: Wire VM settings through the platform modal without tag fetching.

## Final Checkpoint

- [ ] Run all focused tests listed in `tasks/plan.md` together.
- [ ] Run `npm run typecheck`.
- [ ] Run focused lint for all changed files.
- [ ] Run `npm run api:check` and `git diff --check`.
- [ ] Browser-check both forms and keyboard multi-select behavior.
- [ ] Report whether the full suite/build was run.
- [ ] Review and commit only in-scope files atomically.
