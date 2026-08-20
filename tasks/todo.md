# Todo: VMware Provider Default Inventory Filters

Spec: https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/4

## Phase 1: Deep-module foundations

- [ ] Task 1: Add provider-scoped, one-time defaults to the VMware URL-filter hook.
- [ ] Task 2: Add the unified VMware inventory hook with endpoint selection,
      debounce, cache isolation, and canonical output.

## Checkpoint: Deep-module contracts

- [ ] Run the two focused hook test files together.
- [ ] Run focused lint for the Task 1-2 files.
- [ ] Confirm URL/default state and remote inventory strategy remain separate.

## Phase 2: Post-inventory filtering

- [ ] Task 3: Remove legacy broad search from post-inventory filtering.
- [ ] Run focused filter/helper tests and lint.

## Phase 3: Shared page integration

- [ ] Task 4: Wire both deep modules into the shared VMware Resources page.
- [ ] Verify provider defaults and endpoint behavior in Resources.
- [ ] Verify the same behavior in Resources ISE.
- [ ] Remove only inventory hook code made obsolete by this integration.

## Phase 4: Final verification

- [ ] Task 5: Run all affected hook, helper, page, toolbar, and API tests.
- [ ] Run `C:\Users\polnikr\nodejs\npm.cmd run typecheck`.
- [ ] Run ESLint only for changed TypeScript/TSX files.
- [ ] Run `git diff --check` and review the final diff/status.
- [ ] Report full-suite/build and browser-verification status explicitly.
- [ ] Commit only issue #4 files atomically.
