# Implementation Plan: Fill-Height Policy Set Picker

## Overview
`PolicySetPicker` currently sizes itself with a hardcoded `lg:h-96` (384px) box, `lg:w-96`/`min-h-96` on the list pane, and `max-h-96` on the details pane. On the recovery-applications wizard's Policy set step this leaves a large empty gap between the box and the footer buttons (visible in the screenshot). The fix is to make the picker fill whatever height its parent gives it (`h-full`, flex-based) instead of a fixed rem value — but since `PolicySetPicker` is shared with the recovery-groups wizard, and both wizards currently render this step inside a normal, page-scrolling container (not a height-constrained one), simply removing the fixed height would collapse the picker to near-zero height in both places. Both call sites' step containers need to switch to the same "flex-fill + overflow-hidden parent, internal scroll" pattern already used by each wizard's own tier/resource step (`TierCanvas` in recovery-applications, the resources/related-storage steps in recovery-groups) — this pattern already exists in the codebase, it's just not applied to the policy-set step yet.

## Architecture Decisions
- `PolicySetPicker.tsx`: outer wrapper becomes `flex h-full min-h-[480px] flex-col overflow-hidden ... lg:flex-row` (drop `mt-5` and `lg:h-96` — spacing/height become the caller's job). List pane wrapper becomes `min-h-64 w-full shrink-0 overflow-hidden lg:h-full lg:min-h-0 lg:w-96` (drop the fixed `min-h-96`, keep the `lg:w-96` fixed rail width — a fixed-width list column is a deliberate, common master-detail pattern, not the bug being reported). Details pane wrapper becomes `min-h-0 min-w-0 flex-1 overflow-auto ...` (drop `max-h-96`/`lg:max-h-none`). `min-h-[480px]` mirrors the exact floor `TierCanvas`'s wrapper already uses, so short viewports don't collapse the picker.
- `PolicySetPickerList.tsx` and `PolicySetPickerDetails.tsx` need no changes — the list already uses `h-full min-h-0 flex-col overflow-hidden` internally and will size correctly once its parent has a real height; the details pane's own `max-w-6xl` is a readability cap on fact-grid width, unrelated to this height fix, and stays.
- Both call sites' step containers switch from "normal page scroll" to "fill height, overflow-hidden, internal scroll" for the policy-set step specifically — the same treatment `step === 2` (tiers) already gets in `RecoveryAppBuilder.tsx` and `resourcesStepIndex`/`relatedStorageStepIndex` already get in `RecoveryGroupBuilder.tsx`. Concretely: add the policy-set step to each file's `overflow-hidden` condition, and wrap each step's title/description/picker block in a `flex h-full min-h-0 flex-col` container so the picker (in a `min-h-0 flex-1` slot below the fixed-height title/description) receives real height to fill.
- Loading/error/empty branches for the policy-set step don't need the fill treatment — they're short, non-scrolling content — only the actual `<PolicySetPicker>` render path gets wrapped in the flex-1 slot.

## Task List

### Phase 1: Shared component
- [ ] Task 1: Update `PolicySetPicker.tsx`'s three wrapper `className`s per the Architecture Decisions above (drop hardcoded height/width bounds, add `h-full`/`flex-1`/`min-h-0` fill chain).

### Checkpoint: Component alone
- [ ] `PolicySetPicker.test.tsx` still passes unmodified (no prop/behavior change, only layout classes)
- [ ] Typecheck clean

### Phase 2: Wire the fill chain into both wizards
- [ ] Task 2: In `RecoveryAppBuilder.tsx`, add `step === 3` to the body wrapper's `overflow-hidden` condition (currently `step === 2 ? 'overflow-hidden' : 'overflow-y-auto'`); wrap the step-3 block's title/description/picker in `flex h-full min-h-0 flex-col`, and wrap the `<PolicySetPicker>` render itself in a `mt-5 min-h-0 flex-1` div (loading/error/empty branches stay outside this slot).
- [ ] Task 3: In `RecoveryGroupBuilder.tsx`, add `step === policySetStepIndex` to the equivalent `overflow-hidden` condition; apply the same `flex h-full min-h-0 flex-col` restructuring inside `RecoveryGroupPolicySetStep.tsx` (title/description stay fixed-height, the picker render gets the `min-h-0 flex-1` slot).

### Checkpoint: Complete
- [ ] Full focused test run across `PolicySetPicker.test.tsx`, `RecoveryGroupPolicySetStep.test.tsx`, `RecoveryAppBuilder.test.tsx`, `RecoveryGroupBuilder.test.tsx`
- [ ] Typecheck and lint clean
- [ ] Manual trace: on both wizards, the policy set step's box now fills the available vertical space down to the footer, with the list/detail panes scrolling internally instead of the page

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing the fixed height without also fixing both step containers would collapse the picker to near-zero height | High | Both call sites are updated in the same change (Tasks 2-3), not just the shared component |
| Mobile (below `lg`) stacking of list+details inside a flex-fill parent could squeeze one pane if not given its own floor | Medium | List pane keeps a `min-h-64` floor on mobile; details pane takes remaining space via `flex-1 min-h-0` with its own scroll |
| Existing tests assert on specific class names for layout (e.g. `RecoveryGroupPolicySetStep.test.tsx`'s "keeps the policy detail panel visible below the lg breakpoint" test, now moved to `PolicySetPicker.test.tsx`) | Medium | That test only checks for absence of `hidden` and presence of `flex-col`, both still true after this change — verified at the checkpoint, updated if it doesn't hold |

## Open Questions
None — scope is the height-fill fix for the shared picker plus both call sites; no visual/behavioral change beyond filling available space.
