# Fill-Height Policy Set Picker - Task Checklist

## Phase 1: Shared component

### Task 1: Update PolicySetPicker.tsx wrapper classes
- [x] Outer div: `flex h-full min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:flex-row` (drop `mt-5`, drop `lg:h-96`)
- [x] List wrapper div: `min-h-64 w-full shrink-0 overflow-hidden lg:h-full lg:min-h-0 lg:w-96` (drop `min-h-96`, keep `lg:w-96`)
- [x] Details wrapper div: `min-h-0 min-w-0 flex-1 overflow-auto border-t border-border lg:border-l lg:border-t-0` (drop `max-h-96 lg:max-h-none`)

### Checkpoint
- [x] `npx vitest run src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`
- [x] `npm run typecheck`

## Phase 2: Wire fill chain into both wizards

### Task 2: RecoveryAppBuilder.tsx (step 3)
- [x] Change the body wrapper's overflow ternary from `step === 2 ? 'overflow-hidden' : 'overflow-y-auto'` to `step === 2 || step === 3 ? 'overflow-hidden' : 'overflow-y-auto'`
- [x] Wrap the step-3 block in `<div className="flex h-full min-h-0 flex-col">`
- [x] Wrap the `<PolicySetPicker>` render in `<div className="mt-5 min-h-0 flex-1">...</div>` (loading/error/empty/unavailable-notice branches stay outside this slot, above it)

### Task 3: RecoveryGroupBuilder.tsx + RecoveryGroupPolicySetStep.tsx
- [x] In `RecoveryGroupBuilder.tsx`, add `step === policySetStepIndex` to the overflow ternary at line ~233 (`step === resourcesStepIndex || step === relatedStorageStepIndex ? 'overflow-hidden' : 'overflow-y-auto'`)
- [x] In `RecoveryGroupPolicySetStep.tsx`, wrap the whole return in `flex h-full min-h-0 flex-col`; wrap the `<PolicySetPicker>` render in a `mt-5 min-h-0 flex-1` div; keep the loading/empty branches as simple text outside that slot

## Verification Steps
- [x] Run: `npx vitest run src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all changed files
- [x] Manual/visual confirmation not required for this pass (no browser available) — rely on class-based reasoning matching the existing `TierCanvas`/resources-step pattern

## Explicitly Out of Scope
- `PolicySetPickerList.tsx` / `PolicySetPickerDetails.tsx` internals — unchanged
- The list pane's fixed `lg:w-96` rail width — a deliberate master-detail pattern, not the reported bug
- Any other wizard step's layout
