# Todo: DetailView hardening

Plan: `tasks/detail-view-hardening-plan.md`. Stage explicit paths only. Never stage
OpenAPI, generated Zod, Metro Mirror or other sessions' task files.

## Task 1: Escape and Tab only on the top-most modal dialog
**Description:** Add a shared dialog stack. `DetailView` and `Modal` register while open
and handle Escape and Tab only when they are on top.

**Acceptance criteria:**
- [x] DetailView → nested Modal → Escape closes only the Modal. The DetailView stays open
  and focus returns to the control that opened the Modal.
- [x] A second Escape closes the DetailView and focus returns to its original opener.
- [x] Tab stays trapped in the top-most dialog. The lower dialog neither wraps nor steals
  focus. After the upper dialog closes, the lower trap works again.
- [x] Backdrop clicks and the HelpPopover Escape behaviour are unchanged.

**Verification:**
- [x] Shared test `src/shared/components/modal/nestedDialogs.test.tsx`: real `DetailView`
  + real `Modal`, covering Escape twice with focus restoration and Tab trapping at both
  levels. Stack unit cases: push/remove/isTop, and unmount of the top entry.
- [x] `npm exec vitest run src/shared/components/modal src/shared/components/detail-view src/shared/components/help-popover`
- [x] Browser: Recovery Group DetailView → Delete → confirmation → Escape, then Escape
  again (**never confirm the delete**).

**Dependencies:** None.

**Files:** `src/shared/components/modal/dialogStack.ts` (new), `Modal.tsx`,
`detail-view/DetailView.tsx`, `modal/nestedDialogs.test.tsx` (new).

**Scope:** M. **Commit:** `fix(dialog): keep Escape on top-most modal only`

## Task 2: HelpPopover rendered outside clipping dialogs
**Description:** Portal the panel to `document.body` with fixed positioning anchored to
the trigger. It flips above when there is no room below, clamps to the viewport and
tracks scroll and resize. Keyboard focus bridging and `aria-owns` keep keyboard and
screen-reader behaviour inside the owning dialog.

**Acceptance criteria:**
- [x] The panel is a child of `document.body` and is never clipped by the DetailView
  `overflow-hidden` or the Modal body scroll. `overflow-hidden` stays on DetailView.
- [x] The panel stays inside the viewport: flips above near the bottom edge, shifts
  near the right and left edges, and is usable at 390 px.
- [x] Escape closes only the help (DetailView stays open) and focus returns to the trigger.
- [x] While the portaled panel is open, the focus trap of the owning DetailView/Modal never steals Tab from the panel (verified in jsdom and in the real browser).
- [x] Outside click closes it. Tab moves trigger → panel → next control. Shift+Tab goes
  back.
- [x] Hover open/close, wide/default width, custom children, KeyedHelpPopover sections
  and translations still render. Dark mode is correct.

**Verification:**
- [x] Tests in `HelpPopover.test.tsx` (and `KeyedHelpPopover` if it exists): portal
  parent, Escape inside a DetailView, focus return, outside click, Tab bridging, wide
  class, children, keyed sections.
- [x] Browser (mandatory, geometry): wide help of VMware, IBM Power and FlashSystem
  (header) and Provider Catalogue (section). Check desktop, trigger near the right
  edge, trigger near the lower edge (short viewport or scrolled section), 390 px and
  dark mode. No clipping, no viewport overflow, console clean, Escape closes the help
  only, focus returns.

**Dependencies:** Task 1 (the nested test also covers help inside a DetailView with a
Modal).

**Files:** `help-popover/HelpPopover.tsx`, `help-popover/HelpPopover.test.tsx`, possibly
`help-popover/KeyedHelpPopover.test.tsx`.

**Scope:** M. **Commit:** `fix(help): portal help popovers outside clipped dialogs`

## Checkpoint A (after Tasks 1–2)
- [x] Focused tests pass, `npm run lint`, `npm run typecheck`.
- [x] Browser pass for nested Escape and wide help done (log in first if Keycloak asks).

## Task 3: Missing Recovery Application checklist labels
**Description:** Add `recovery.modal.applicationId` and `recovery.modal.airflowRunId`
and `recovery.modal.pushToOrchestrator` (approved) to en/cs/sk.

**Acceptance criteria:**
- [x] Keys exist in all three locales and reuse nearby terminology. No key renames and no
  logic change.
- [x] A locale contract test asserts the keys in every locale.

**Verification:**
- [x] `npm exec vitest run src/locales src/features/recovery-plans/recovery-applications`

**Dependencies:** None.

**Files:** `src/locales/{en,cs,sk}.json`, a locale test (new or extended).

**Scope:** S. **Commit:** `fix(i18n): add missing recovery modal labels`

## Task 4: DetailField keeps `false` and `0`
**Description:** `isEmpty` treats only `null`, `undefined` and blank strings as empty.
Approved: `false` → `false`, `true` → `true` as text. No Yes/No formatting.

**Acceptance criteria:**
- [x] `null`, `undefined`, `''` and whitespace-only give "Not set".
- [x] `false`, `true` and `0` are not "Not set" and are visible as text. A ReactNode renders as given.

**Verification:**
- [x] `npm exec vitest run src/shared/components/detail-view`

**Dependencies:** None.

**Files:** `detail-view/DetailField.tsx`, `detail-view/DetailContent.test.tsx`.

**Scope:** XS. **Commit:** `fix(detail-view): preserve boolean false values`

## Task 5 (approved): Rename stale drawer components
**Description:** `AccessLogDetailDrawer` → `AccessLogDetailView` and
`RecoveryRunHistoryDrawer` → `RecoveryRunHistoryDetailView` (files, components, prop
interfaces, test describe names) via `git mv`. `RecoveryRunHistoryEntity` keeps its name.

**Acceptance criteria:**
- [x] `git grep` finds neither old name in `src`. Behaviour is unchanged.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/audit src/features/recovery-plans/recovery-runs`

**Dependencies:** None.

**Files:** the two components and tests, `AccessLogsTable.tsx`, `RecoveryRunsPage.tsx`.

**Scope:** S. **Commit:** `refactor(detail-view): rename stale drawer components`

## Checkpoint: Complete
- [x] Focused tests for every task pass. `npm run lint`, `npm run typecheck` and
  `git diff --check` are clean.
- [x] No full suite unless asked (not run; focused scopes only).
- [x] Final browser pass (nested Escape + four wide helps) done.
- [x] Unrelated worktree changes untouched. Final report with the 14 requested items.
