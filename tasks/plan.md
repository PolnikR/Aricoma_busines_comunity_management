# Implementation Plan: Provider Dialog Overflow and Platform Layout

## Overview

Apply the approved provider-dialog design without changing provider data or
API behavior. Provider dialogs use a responsive overflow mode: the modal body
has a safe mobile scroll fallback but no desktop/tablet scrollbar. The VM tag
option list remains bounded and independently scrollable. The platform form is
widened and reorganized into the same compact responsive grid used by the
infrastructure-provider form.

## Architecture Decisions

- Keep the shared modal's current overflow behavior as the default so unrelated
  dialogs do not change.
- Add one explicit responsive overflow option to `Modal`; avoid caller-supplied
  conflicting utility classes.
- Use `md` as the boundary: mobile content can scroll, while provider modal
  content is visible from `md` upward.
- Keep the dropdown as the desktop/tablet scroll owner through its existing
  bounded `max-height` and `overflow-y-auto` option list.
- Make the platform modal `lg` and pair fields to reduce vertical height.
- Preserve all validation, submission, tag-fetching, focus, and keyboard logic.

## Dependency Graph

```text
Shared Modal responsive overflow contract
  +-- Infrastructure-provider modal opt-in
  +-- Platform-provider modal opt-in and lg width
          +-- Compact platform form grid

MultiSelectDropdown scroll invariant --------+-- Final integration checks
```

## Task 1: Add responsive modal content overflow

**Description:** Extend the shared modal with an opt-in responsive content
overflow mode while preserving the existing default for every unrelated
dialog. Lock the dropdown's independently scrollable list behavior with a
focused test.

**Acceptance criteria:**

- [x] Default modal content still uses vertical auto overflow.
- [x] Responsive mode uses mobile `overflow-y-auto` and `md:overflow-visible`.
- [x] VM tag options retain a bounded `overflow-y-auto` list.

**Verification:**

- [x] `npm exec vitest run src/shared/components/modal/Modal.test.tsx src/shared/components/form/MultiSelectDropdown.test.tsx`
- [x] Focused lint for the modal, multiselect, and their tests.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/modal/Modal.tsx`
- `src/shared/components/modal/Modal.test.tsx`
- `src/shared/components/form/MultiSelectDropdown.test.tsx`

**Estimated scope:** Medium (3 files)

## Task 2: Opt provider dialogs into responsive overflow

**Description:** Apply the new responsive overflow mode only to the two
provider dialogs and widen the platform-provider modal to the infrastructure
provider's `lg` size.

**Acceptance criteria:**

- [x] Infrastructure-provider modal has no content scrollbar from `md` upward.
- [x] Platform-provider modal uses the same responsive overflow mode and `lg` width.
- [x] Other modal callers retain the original default behavior.

**Verification:**

- [x] `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- [x] Focused lint for both provider modal files and tests.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Checkpoint: Overflow ownership

- [x] Run Tasks 1-2 focused tests together.
- [x] Confirm provider modal bodies use the responsive mode.
- [x] Confirm the open tag option list remains the only desktop/tablet scrollbar.
- [x] Run `npm run typecheck` and focused lint.

## Task 3: Reorganize the platform-provider form

**Description:** Convert the platform form from a tall single-column layout to
the approved compact `lg` layout while preserving the form component's data and
event interfaces.

**Acceptance criteria:**

- [x] ID/name, type/credentials, VM prefix/VM tags, and URL/DAG directory use paired responsive rows.
- [x] IP address/port retain the wide-plus-fixed-port responsive row.
- [x] Description remains full width and all paired rows stack on narrow screens.

**Verification:**

- [x] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- [x] Focused lint for the platform form and test.
- [x] Existing labels, validation messages, disabled states, and Enter submission remain covered.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`

**Estimated scope:** Small (2 files)

## Task 4: Verify the complete responsive interaction

**Description:** Run the focused cross-component checks and verify that the
layout solves the reported double-scroll problem without regressing mobile
accessibility or keyboard interaction.

**Acceptance criteria:**

- [x] At `md` and wider, provider dialogs show no modal-body scrollbar via the responsive overflow contract.
- [x] At narrow/short mobile sizes, modal content retains the mobile scroll fallback contract.
- [x] Opening a long VM tag list scrolls only inside the dropdown according to the tested class contract.

**Verification:**

- [x] Run all focused tests from Tasks 1-3 together.
- [x] Run `npm run typecheck`.
- [x] Run focused lint for every changed TypeScript file.
- [x] Run `git diff --check`.
- [ ] Browser-check widths 320, 768, 1024, and 1440 when browser tooling is available.

**Dependencies:** Tasks 1-3

**Files likely touched:** None beyond test adjustments discovered during verification.

**Estimated scope:** Small (verification)

## Final Checkpoint

- [x] Every automated acceptance criterion is satisfied.
- [x] Focused tests, typecheck, focused lint, and diff check pass.
- [x] Provider data and API behavior are unchanged.
- [x] Manual/browser verification status is reported explicitly.
- [x] Only in-scope files are committed atomically.

## Parallelization Opportunities

- Task 3 test preparation can be drafted independently after Task 1's public
  modal prop is agreed, but production changes should remain sequential.
- Final verification is sequential because it validates the integrated layout.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Global modal behavior changes | High | Keep auto overflow as the default and require explicit provider opt-in. |
| Dropdown is clipped by modal content | High | Use responsive visible overflow at `md+` and test the exact ownership classes. |
| No-scroll desktop layout exceeds viewport | Medium | Compact paired platform rows and retain a mobile/short-screen fallback. |
| Platform validation moves away from its field | Medium | Move complete `Field` blocks, including helper and error content. |
| Responsive classes conflict | Medium | Encode overflow behavior inside `Modal`, not as caller class overrides. |

## Open Questions

- None. The user approved the compact layout and mobile fallback.

## Definition of Done

- [ ] Each task's acceptance criteria and focused verification pass.
- [ ] The VM tag dropdown is the only desktop/tablet scrollbar in provider dialogs.
- [ ] Platform dialog visually follows the infrastructure-provider layout.
- [ ] Mobile fallback keeps every field and footer action reachable.
- [ ] Accessibility behavior and unrelated modal defaults remain intact.
- [ ] Atomic commits exclude unrelated worktree changes.
