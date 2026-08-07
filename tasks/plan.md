# Implementation Plan: Update Airflow URL to DAGs View

## Overview

Update the Airflow platform provider URL from `http://10.99.99.55:8080/` to `http://10.99.99.55:8080/dags` to point directly to the DAGs view instead of the Airflow home page. This affects test data that mocks platform provider records.

## Architecture Decisions

- **Data-driven change:** The URL is stored in the backend API response and passed through the frontend without transformation. The frontend displays `selected.url` as-is in the PlatformProvidersTable detail drawer.
- **Test scope:** The URL update is primarily in test data fixtures. No component logic needs to change since the component simply renders whatever URL the backend provides.
- **No breaking changes:** The change is backward compatible — existing code will work with the new URL.

## Task List

### Phase 1: Update Test Data

**Task 1: Update Airflow URL in test fixtures**

Update all test data that references the old Airflow URL. Replace `http://10.99.99.55:8080/` with `http://10.99.99.55:8080/dags` across:
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- Any other test files using this mock data

**Acceptance criteria:**
- [ ] All occurrences of `http://10.99.99.55:8080/` in test files are updated to `http://10.99.99.55:8080/dags`
- [ ] Test assertions that check the URL string are updated to match the new URL
- [ ] No test data references the old URL

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Grep confirms no remaining references to the old URL: `grep -r "10.99.99.55:8080/" src/ --include="*.ts" --include="*.tsx"` returns only documentation or comments

**Dependencies:** None

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx` (if test data exists)

**Estimated scope:** XS (1-2 files with straightforward string replacements)

### Checkpoint: Complete
- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] No broken test assertions
- [ ] Ready to merge

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Test assertions fail after URL update | Low | Run full test suite after updates to catch assertion mismatches |
| Missing test files | Low | Grep for old URL to ensure comprehensive coverage |

## Open Questions

- Is the backend already configured to return `/dags` in the URL, or does this need to be coordinated with backend changes?
