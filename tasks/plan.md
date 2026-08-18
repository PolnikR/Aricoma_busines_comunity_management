# Implementation Plan: Shared Policy Set Picker

## Overview
`RecoveryGroupPolicySetCatalogue` + `RecoveryGroupPolicySetList` + `RecoveryGroupPolicySetDetails` (used by the recovery-group wizard's "Policy set" step) already implement a fully generic search-list-plus-detail-pane picker over `PolicySet` records — nothing in their logic is actually recovery-group-specific, only their names and one translation namespace are. The recovery-applications wizard's own "Policy set" step (step 3) never got this treatment; it's a plain `SelectableCard` grid with no search and no detail pane. This moves the three components to `src/shared/components/policy-set-picker/`, renames them, generalizes the one recovery-group-flavored translation namespace they use, and swaps the recovery-applications step 3 grid for the same shared picker — so both wizards show an identical experience.

## Architecture Decisions
- Move (not duplicate) `RecoveryGroupPolicySetCatalogue/List/Details` to `src/shared/components/policy-set-picker/PolicySetPicker(/List/Details).tsx`. Props (`policySets`, `selectedPolicySetId`, `onSelect`) are unchanged — this is a rename + relocation, not a redesign.
- The only genuinely recovery-group-flavored thing inside the moved components is the `pages.recoveryGroupBuilder.policySet.details.*` translation namespace used by the details pane. Rename it to a generic `policySets.picker.details.*` (same English/Slovak/Czech text, just a feature-neutral key) so the shared component doesn't depend on a `recoveryGroupBuilder`-namespaced string. The `policySets.searchLabel`/`.searchPlaceholder`/`.noMatches`/`.form.*` keys the list/details already use are already generically named — no change needed there.
- The step-level wrapper (title, description, loading text, empty state, error handling) stays bespoke per feature — `RecoveryGroupPolicySetStep.tsx` keeps its own text and now imports the shared picker instead of its local one; the recovery-applications step 3 block gets the same treatment inline in `RecoveryAppBuilder.tsx`. These wrappers already differ slightly today (recovery-apps additionally surfaces a fetch error via `FetchErrorAlert`, which recovery-groups doesn't), so unifying them into one shared "step" component isn't in scope — only the proven-reusable picker itself is shared.
- While touching recovery-apps' step 3 block: it currently borrows `pages.recoveryGroupBuilder.policySet.loading` and `.empty.title/.description` (recovery-*group*-flavored empty-state text — "assigning it to a recovery group" — shown on the recovery-*application* wizard, which is wrong copy). It already has its own, correct `pages.recoveryBuilder.policySet.empty.title/.description` keys defined but unused, plus no dedicated `.loading` key. Fix this as part of the swap: use its own keys, add the missing `.loading` key.
- Preserve the existing "stored policy set no longer returned by the backend" notice (currently a disabled `SelectableCard` when `formState.policySetId` doesn't match any fetched policy set) as a small bespoke element in `RecoveryAppBuilder.tsx`, rendered above the shared picker — this behavior isn't part of the reusable picker (recovery-groups' reference implementation doesn't have it either), so it stays feature-specific rather than being pushed into the shared component.
- Test coverage: the deep behavioral tests currently in `RecoveryGroupPolicySetStep.test.tsx` (search filtering, selection, detail resolution, loading/error states, icon count) test the picker's actual behavior, not the step wrapper's. Move them to a new `PolicySetPicker.test.tsx` next to the shared component. Slim `RecoveryGroupPolicySetStep.test.tsx` down to step-wrapper-only assertions (title/description text, loading-before-fetch, empty state) plus one smoke test confirming the picker still renders when wired up.

## Task List

### Phase 1: Move and generalize the shared component
- [ ] Task 1: Create `src/shared/components/policy-set-picker/PolicySetPickerList.tsx` (moved from `RecoveryGroupPolicySetList.tsx`, same logic, renamed).
- [ ] Task 2: Create `src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx` (moved from `RecoveryGroupPolicySetDetails.tsx`), updating its translation keys from `pages.recoveryGroupBuilder.policySet.details.*` to `policySets.picker.details.*`.
- [ ] Task 3: Create `src/shared/components/policy-set-picker/PolicySetPicker.tsx` (moved from `RecoveryGroupPolicySetCatalogue.tsx`), importing the two components above.
- [ ] Task 4: Rename the six `pages.recoveryGroupBuilder.policySet.details.*` keys to `policySets.picker.details.*` in `en.json`/`sk.json`/`cs.json` (values unchanged).
- [ ] Task 5: Delete the three original `RecoveryGroupPolicySet{Catalogue,List,Details}.tsx` files.
- [ ] Task 6: Update `RecoveryGroupPolicySetStep.tsx` to import `PolicySetPicker` from the shared location instead of the local `RecoveryGroupPolicySetCatalogue`.

### Checkpoint: Move complete
- [ ] Typecheck clean (catches any straggler import of the deleted files)
- [ ] `grep` confirms no remaining references to `pages.recoveryGroupBuilder.policySet.details.*` or the deleted component names

### Phase 2: New shared test file + slim the old one
- [ ] Task 7: Create `src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`, moving the deep behavioral test cases from `RecoveryGroupPolicySetStep.test.tsx` (search filtering, selection reporting, detail resolution, loading/error states, icon count, responsive layout) to render `PolicySetPicker` directly.
- [ ] Task 8: Slim `RecoveryGroupPolicySetStep.test.tsx` to: title/description render, loading-before-fetch text, empty state, and one smoke test with real data confirming the picker renders and a click reports a selection.

### Checkpoint: Tests migrated
- [ ] `PolicySetPicker.test.tsx` passes standalone
- [ ] `RecoveryGroupPolicySetStep.test.tsx` passes (slimmed)

### Phase 3: Wire into recovery-applications
- [ ] Task 9: In `RecoveryAppBuilder.tsx`, replace the step-3 `SelectableCard` grid with `<PolicySetPicker policySets={policySetsQuery.data} selectedPolicySetId={formState.policySetId} onSelect={...} />`, keeping the existing loading/error (`FetchErrorAlert`)/empty-state branches around it, switched to recovery-apps' own `pages.recoveryBuilder.policySet.loading`/`.empty.title`/`.empty.description` keys.
- [ ] Task 10: Add the missing `pages.recoveryBuilder.policySet.loading` key (en/sk/cs, same text as the existing `pages.recoveryGroupBuilder.policySet.loading` value).
- [ ] Task 11: Keep the "stored policy set unavailable" notice as a small bespoke element (reusing the existing `pages.recoveryBuilder.policySet.unavailable` key) rendered above the picker when `formState.policySetId` isn't in `policySetsQuery.data`.
- [ ] Task 12: Update `RecoveryAppBuilder.test.tsx` to mock `useSnapshotPolicies`/`useRecoveryAppPolicies`/`useCleanRoomPolicies` (the shared picker's detail pane now calls these; the test file doesn't mock them today because the old grid never did) — mirror the mocking pattern from `RecoveryGroupPolicySetStep.test.tsx`.

### Checkpoint: Complete
- [ ] Full focused test run across all touched files
- [ ] Typecheck and lint clean
- [ ] Manual trace: recovery-applications step 3 now shows the search box + list + detail pane, matching the recovery-groups wizard's policy-set step

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `RecoveryAppBuilder.test.tsx` doesn't currently mock the three policy-detail hooks; introducing the shared picker would make real (unmocked) hook calls fail in tests | High — would break every existing test that reaches step 3 | Task 12 adds the same three hook mocks `RecoveryGroupPolicySetStep.test.tsx` already uses, before wiring in the picker |
| Renaming translation keys could leave orphaned old keys or dangling references | Medium | Task 4 renames in all three locale files together; checkpoint greps for leftover references before moving on |
| Losing the "stored policy set unavailable" notice would be a silent behavior regression (no existing test currently locks it in, so it could slip through unnoticed) | Medium | Task 11 explicitly preserves it as a bespoke element; called out here so it isn't dropped during the swap |

## Open Questions
None — scope and behavior-preservation decisions made above; flag if any assumption here doesn't match what you had in mind before implementation starts.
