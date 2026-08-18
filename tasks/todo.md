# Shared Policy Set Picker - Task Checklist

## Phase 1: Move and generalize

### Task 1-3: Move the three components
- [x] Create `src/shared/components/policy-set-picker/PolicySetPickerList.tsx` from `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetList.tsx` (rename component, same logic/props)
- [x] Create `src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx` from `RecoveryGroupPolicySetDetails.tsx` (rename component; update its 6 translation keys — see Task 4)
- [x] Create `src/shared/components/policy-set-picker/PolicySetPicker.tsx` from `RecoveryGroupPolicySetCatalogue.tsx` (rename component, import the two above from the same folder)

### Task 4: Rename translation keys (en/sk/cs.json)
- [x] `pages.recoveryGroupBuilder.policySet.details.title` → `policySets.picker.details.title`
- [x] `pages.recoveryGroupBuilder.policySet.details.loading` → `policySets.picker.details.loading`
- [x] `pages.recoveryGroupBuilder.policySet.details.unavailable` → `policySets.picker.details.unavailable`
- [x] `pages.recoveryGroupBuilder.policySet.details.loadFailed` → `policySets.picker.details.loadFailed`
- [x] `pages.recoveryGroupBuilder.policySet.details.resolved` → `policySets.picker.details.resolved`
- [x] `pages.recoveryGroupBuilder.policySet.details.incomplete` → `policySets.picker.details.incomplete`
- [x] Same rename in all three locale files, values unchanged

### Task 5-6: Delete originals, update the recovery-group step
- [x] Delete `RecoveryGroupPolicySetCatalogue.tsx`, `RecoveryGroupPolicySetList.tsx`, `RecoveryGroupPolicySetDetails.tsx`
- [x] Update `RecoveryGroupPolicySetStep.tsx` to `import { PolicySetPicker } from '@/shared/components/policy-set-picker/PolicySetPicker'` and render `<PolicySetPicker .../>` instead of `<RecoveryGroupPolicySetCatalogue .../>`

### Checkpoint
- [x] `npm run typecheck` clean
- [x] `grep -r "pages.recoveryGroupBuilder.policySet.details" src` and `grep -r "RecoveryGroupPolicySetCatalogue\|RecoveryGroupPolicySetList\|RecoveryGroupPolicySetDetails" src` both empty

## Phase 2: Test migration

### Task 7: New shared test file
- [x] Create `src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`
- [x] Move these test cases from `RecoveryGroupPolicySetStep.test.tsx`, rendering `<PolicySetPicker>` directly: resolved names in list+details, responsive layout (detail panel visible below lg), one icon per policy type, unresolved-policy fallback to raw IDs, loading state without hiding the list, render+select reporting, aria-pressed marking, search filtering
- [x] Keep the three hook mocks (`useSnapshotPolicies`/`useRecoveryAppPolicies`/`useCleanRoomPolicies`) at the top of the new file

### Task 8: Slim the step test
- [x] In `RecoveryGroupPolicySetStep.test.tsx`, keep only: title/description render, loading-before-fetch text, empty state when `policySets=[]`, and one smoke test with 1-2 real policy sets confirming the picker renders and `onSelect` fires on click
- [x] Remove the now-duplicated deep assertions (search filtering, detail resolution, icon count, responsive layout) — covered by Task 7

### Checkpoint
- [x] `npx vitest run src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`

## Phase 3: Wire into recovery-applications

### Task 9: Swap the step-3 grid
- [x] In `RecoveryAppBuilder.tsx`, replace the `SelectableCard`-grid block (currently ~lines 361-382) with `<PolicySetPicker policySets={policySetsQuery.data} selectedPolicySetId={formState.policySetId} onSelect={(id) => { updateFormState({ policySetId: id }) }} />`
- [x] Keep the surrounding `isLoading`/`error`/empty branches, switching their text to recovery-apps' own keys (Task 10)

### Task 10: Fix/add translation keys (en/sk/cs.json)
- [x] Add `pages.recoveryBuilder.policySet.loading` = "Loading policy sets" (matching the existing `pages.recoveryGroupBuilder.policySet.loading` text)
- [x] Switch the step-3 block's `.empty.title`/`.empty.description`/`.loading` calls from the borrowed `pages.recoveryGroupBuilder.policySet.*` keys to `pages.recoveryBuilder.policySet.*` (already correct, application-flavored text existed but was unused)

### Task 11: Preserve the "unavailable" notice
- [x] Above the `<PolicySetPicker>` render, keep a small element shown only when `formState.policySetId && !policySetsQuery.data?.some(p => p.id === formState.policySetId)`, using the existing `pages.recoveryBuilder.policySet.unavailable` text

### Task 12: Fix RecoveryAppBuilder.test.tsx
- [x] Add `useSnapshotPolicies`/`useRecoveryAppPolicies`/`useCleanRoomPolicies` mocks (same pattern as `RecoveryGroupPolicySetStep.test.tsx`) so the shared picker's detail pane doesn't hit real hooks
- [x] Re-run existing tests; the `getByRole('button', { name: /Critical - Daily DR Test/ })` interactions should keep working against the new list rows unchanged

## Verification Steps
- [x] Run: `npx vitest run src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all changed/created files
- [x] Grep for leftover references to deleted files/old translation keys

## Explicitly Out of Scope
- No shared "step wrapper" (title/description/loading/empty/error chrome) — only the picker itself is shared
- No changes to how recovery-groups' wizard behaves visually — this is a pure relocation there
