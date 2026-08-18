# Implementation Plan: Recovery Group Policy Detail — Responsive Layout

## Overview

The policy-set catalogue inside the recovery-group builder's Policy Set step shows a list of policy sets alongside a detail panel with the resolved snapshot/recovery/clean-room facts (Template D layout). The detail panel is currently only visible at the `lg` breakpoint and above; below that it doesn't render at all, so a user on a tablet or narrow laptop can select a policy set but never see its resolved policy facts before submitting. This plan makes the detail panel visible at every viewport width, stacked below the list on small screens and side-by-side at `lg` and above, matching the "stacked layout on small screens" intent the feature originally shipped with.

## Root Cause

`RecoveryGroupPolicySetCatalogue.tsx:38` wraps the list and detail panel in a plain `flex` container (row direction by default, only switching to a fixed height at `lg:h-96`) with no `flex-col` for narrow viewports. The detail panel itself is `hidden min-w-0 flex-1 overflow-auto lg:block` (line 49) — `hidden` unconditionally removes it from the layout until the `lg:block` override takes effect. Below `lg`, the panel is never shown, regardless of whether a policy set is selected.

## Architecture Decisions

- Fix stays local to `RecoveryGroupPolicySetCatalogue.tsx`; no changes to `RecoveryGroupPolicySetList.tsx` or `RecoveryGroupPolicySetDetails.tsx` internals.
- Container becomes `flex-col lg:h-96 lg:flex-row` so list and detail stack vertically by default and sit side-by-side from `lg`.
- Remove `hidden`/`lg:block` from the detail panel; give it its own bounded height on small screens (e.g. `max-h-96 overflow-auto` or similar) so a long detail doesn't push the page layout awkwardly, while keeping `lg:min-w-0 lg:flex-1 lg:overflow-auto` for the side-by-side view.
- List panel's existing `w-full min-h-96 lg:w-96 lg:min-h-0 shrink-0` stays as-is — it already accounts for both layouts correctly.
- No change to data fetching (`useSnapshotPolicies`/`useRecoveryAppPolicies`/`useCleanRoomPolicies`) or to loading/error handling in the details component.

## Dependency Graph

```text
Catalogue container becomes flex-col (mobile) / flex-row (lg+)
    -> detail panel renders unconditionally when a policy set is selected
        -> stacked layout below lg, side-by-side at lg+
            -> regression test covers both breakpoints
```

## Task 1: Capture the layout regression

**Description:** Add a focused test (or extend an existing one) asserting the detail panel is present in the DOM whenever a policy set is selected, regardless of viewport, and that the container uses `flex-col`/`lg:flex-row` rather than a permanently-hidden detail panel.

**Acceptance criteria:**
- [ ] A test fails against the current code by asserting the detail panel element is not gated behind a `hidden`/viewport-only class when a policy set is selected.
- [ ] The test lives alongside existing coverage for this step (`RecoveryGroupPolicySetStep.test.tsx`) or a new `RecoveryGroupPolicySetCatalogue.test.tsx` if none exists yet for this component directly.

**Verification:**
- [ ] RED: `npm run test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx --run`

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`

**Estimated scope:** Small: 1 file

## Task 2: Fix the responsive layout

**Description:** Change the catalogue container to stack vertically below `lg` and switch to a row layout at `lg` and above; make the detail panel always render (no `hidden`) once a policy set is selected.

**Acceptance criteria:**
- [ ] Below `lg`, selecting a policy set shows the detail panel stacked directly beneath the list, without breaking the list's own layout or scroll.
- [ ] At `lg` and above, the layout is unchanged from today (list on the left, detail panel filling the remaining width on the right).
- [ ] No policy set selected → no detail panel rendered, at any width (unchanged behavior).

**Verification:**
- [ ] GREEN: `npm run test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx --run`
- [ ] `npm exec eslint -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetCatalogue.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetCatalogue.tsx`

**Estimated scope:** Small: 1 file

## Checkpoint: Complete

- [ ] Focused tests pass.
- [ ] Focused lint passes.
- [ ] Manual browser check at a narrow width (e.g. 768px) and at `lg`+ (e.g. 1280px) confirms the detail panel is visible and readable in both.
- [ ] Commit contains only files related to this fix.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stacked detail panel pushes the list out of view on very small screens | Medium | Give the detail panel a bounded `max-h`/`overflow-auto` below `lg` rather than letting it grow unbounded |
| Removing `hidden` regresses the `lg`+ layout | Medium | Keep `lg:flex-1 lg:min-w-0 lg:overflow-auto` on the detail panel so the side-by-side behavior is preserved by the same classes that already work today |

## Open Questions

None — the desired end state (visible detail panel at every width, stacked below `lg`) was confirmed by the user.
