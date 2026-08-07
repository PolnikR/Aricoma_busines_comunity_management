# Task Checklist: Update Airflow URL to DAGs View

## Phase 1: Update Test Data

- [ ] **Task 1: Update Airflow URL in test fixtures**
  - [ ] Update `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
    - [ ] Replace `http://10.99.99.55:8080/` with `http://10.99.99.55:8080/dags` in test data
    - [ ] Update test assertions that validate the URL string
  - [ ] Update `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
    - [ ] Replace `http://10.99.99.55:8080/` with `http://10.99.99.55:8080/dags` in mock provider data
  - [ ] Update `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
    - [ ] Replace `http://10.99.99.55:8080/` with `http://10.99.99.55:8080/dags` in mock provider data
  - [ ] Search for any other test files referencing the old URL
    - [ ] Run: `grep -r "10.99.99.55:8080/" src/ --include="*.ts" --include="*.tsx"`
    - [ ] Update any remaining occurrences

## Checkpoint: Verification

- [ ] Run test suite: `npm test` ✓ All tests pass
- [ ] Build succeeds: `npm run build` ✓ No errors
- [ ] No broken assertions in tests
- [ ] Verify no remaining old URLs: `grep -r "10.99.99.55:8080/" src/ --include="*.ts" --include="*.tsx"` returns empty

## Checkpoint: Complete

- [ ] All changes committed with message: "update: change Airflow URL to DAGs view endpoint"
- [ ] Ready for merge
