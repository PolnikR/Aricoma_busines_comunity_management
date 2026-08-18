# Task Checklist: Recovery Group Policy Detail — Responsive Layout

## Regression coverage

- [ ] Add/extend a test asserting the detail panel renders when a policy set is selected, at any viewport (no `hidden`/breakpoint-only gate).

## Layout fix

- [ ] Change `RecoveryGroupPolicySetCatalogue.tsx` container to `flex-col lg:flex-row` (plus existing `lg:h-96`).
- [ ] Remove `hidden`/`lg:block` from the detail panel wrapper; bound its height below `lg` (e.g. `max-h-96 overflow-auto`).
- [ ] Keep `lg:flex-1 lg:min-w-0 lg:overflow-auto` on the detail panel for the side-by-side view.
- [ ] Leave the list panel's existing classes untouched.

## Verification

- [ ] Run focused test: `npm run test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx --run`
- [ ] Run focused lint: `npm exec eslint -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetCatalogue.tsx`
- [ ] Manual browser check at ~768px (stacked) and ~1280px (side-by-side).
- [ ] Commit only files touched by this fix.
