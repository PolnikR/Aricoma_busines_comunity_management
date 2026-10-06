# Implementation Plan: DetailView hardening

Task list: `tasks/detail-view-hardening-todo.md`. Branch `spike/ant-design-shell`.

## Overview
Four cross-cutting fixes found after the full DetailView rollout, plus regression tests.
No redesign: DetailView visuals, navigation, sizes, compact/expanded and all feature
logic stay as they are. The Metro Mirror D3 work, OpenAPI and generated Zod files are
out of scope and must not be staged.

## Audit findings

### 1. Nested Escape (root cause)
- `DetailView` (`DetailView.tsx:152-186`) and `Modal` (`Modal.tsx:39-76`) each register
  a bubbling `window` `keydown` listener while open. Both handle Escape (call `onClose`)
  and Tab (focus trap). Neither knows whether it is the top-most dialog.
- `ConfirmDialog` (22 consumers) is built on `Modal` and is rendered next to the
  DetailView (e.g. Delete in `RecoveryGroupsTable`). With both open, one Escape keypress
  runs both listeners: the confirmation **and** the DetailView close. Tab runs both
  traps too; it works today only because the DetailView trap happens not to match the
  focused element.
- `HelpPopover` already avoids this by listening in the capture phase and stopping the
  event. `RowActionsMenu` has its own Escape listener; it is not opened from a
  DetailView and is left alone.
- The only `aria-modal` dialogs in `src` are `DetailView` and `Modal`.

### 2. HelpPopover clipping (root cause)
- The panel renders in place (`absolute top-full right-0 z-20`) inside the trigger's
  span. The DetailView shell is `overflow-hidden` (needed for rounded corners and the
  compact panel) and, when expanded, `-translate-x/y-1/2`. The translation makes the
  shell the containing block even for `position: fixed`, so neither `absolute` nor
  `fixed` can escape it.
- The same clipping applies inside `Modal`: its body is `overflow-y-auto` (the Metro
  Mirror review renders a help popover there).
- Wide help is used in the DetailView headers of VMware, IBM Power and FlashSystem,
  and in the Provider Catalogue section. Placement today only shifts horizontally and
  caps the height to the space below the trigger. It never flips above.

### 3. Missing translations
- `RecoveryApplicationsTable.tsx:504-516` (JSON/checklist dialog) uses
  `recovery.modal.applicationId`, `recovery.modal.airflowRunId` **and**
  `recovery.modal.pushToOrchestrator`. None exist in en/cs/sk. Only
  `recovery.modal.jsonViewer.title` exists. The third key is also missing (see Open
  questions).
- Terminology to reuse: "Application ID" / "ID aplikace" / "ID aplikácie"
  (`recoveryApplications.detail.applicationId`) and "Airflow run ID" / "ID běhu Airflow"
  / "ID behu Airflow" (`tables.recoveryGroups.airflowRunId`).
- Locale contract tests live in `src/locales/*Translations.test.ts`.

### 4. DetailField `false`
- `isEmpty` in `DetailField.tsx:27-29` treats `false` as empty, so it shows "Not set".
- No current consumer passes a boolean or a `cond && node` value (grep of all
  DetailField consumers). The change does not alter any rendered screen today.
- React renders nothing for `false`/`true`. If `false` is only "not empty", the field
  shows an empty value. Proposal: render booleans as `String(value)` (`false`/`true`),
  which keeps the value visible without imposing Yes/No (see Open questions).

### 5. Stale names
- `AccessLogDetailDrawer`: 2 importers (`AccessLogsTable.tsx` and its own test).
- `RecoveryRunHistoryDrawer`: 2 importers (`RecoveryRunsPage.tsx` and its own test), plus
  the exported type `RecoveryRunHistoryEntity`.
- No barrel export, generated code or public contract depends on either name. The
  import surface is small.

## Architecture decisions
- **Dialog stack (Task 1).** A tiny module `src/shared/components/modal/dialogStack.ts`
  keeps an ordered list of open modal dialogs (`push(token)` on open, `remove(token)` on
  close, `isTop(token)`). `DetailView` and `Modal` push in their open effect and remove
  in its cleanup. Their key handlers return early unless `isTop(token)`, for both Escape
  and Tab. This needs no DOM IDs, no feature conditions and no React context, so it also
  works for dialogs in different React subtrees. It was chosen over a DOM-order check
  because portals and sibling rendering make DOM order unreliable. Backdrops are
  separate elements, so backdrop clicks are unaffected.
- **HelpPopover overlay (Task 2).** Portal the panel to `document.body` with
  `position: fixed` and a z-index above dialogs (`z-[60]`). It is anchored to the
  trigger's `getBoundingClientRect()`:
  - It opens below by default and flips above when the space below is smaller than the
    panel and the space above is larger.
  - Horizontally it keeps the right edge on the trigger, clamped to an 8 px viewport gap.
  - `maxHeight` is the available space in the chosen direction.
  - It repositions on resize and on scroll (capture phase, so section scrolling inside
    DetailView is tracked).

  Keyboard and accessibility behaviour that has to survive the portal:
  - **Focus bridging:** Tab on the open trigger moves into the panel. Shift+Tab at the
    panel start returns to the trigger. Tab past the panel end moves to the next
    focusable element after the trigger in its dialog. All three run in a capture
    listener that stops propagation, so the owning dialog trap does not also act.
  - **Accessibility tree:** `aria-owns` on the trigger wrapper keeps the panel inside
    the dialog's `aria-modal` subtree.
  - **Outside click and focus leaving** now count both the trigger and the portaled
    panel as "inside".

  Escape keeps its capture + stopPropagation logic. React synthetic events still bubble
  through the portal, so hover/focus open and close logic stays. The DetailView's
  `overflow-hidden` is **not** removed.
- **Translations (Task 3).** Add keys only, inserted after `recovery.modal.jsonViewer.title`,
  with a parity test in the existing locale test style.
- **DetailField (Task 4).** `isEmpty` no longer includes `false`. Booleans are rendered
  as text (pending answer). No Yes/No formatting.
- **Rename (Task 5, optional).** Rename both files, components, props interfaces and
  tests with `git mv`. The type `RecoveryRunHistoryEntity` keeps its name.

## Task list
See `tasks/detail-view-hardening-todo.md`. Order: 1 → 2 → 3 → 4 → (5) → final checks
and browser pass. Tasks 3 and 4 are independent of 1 and 2.

## Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Portal breaks keyboard flow or the screen-reader tree inside `aria-modal` | High | Focus bridging plus `aria-owns`. Tests for Tab into, out of and back from the panel. Keyboard check in the browser. |
| Hover open/close flickers when the pointer moves from trigger to a portaled panel | Med | React enter/leave follow the fiber tree. Keep the grace delay. Verify the pointer path in the browser. |
| Popover stays mispositioned while the section scrolls | Med | Scroll listener in the capture phase. Browser check with a scrolled section. |
| A dialog opened while another is closing leaves a stale stack entry | Low | Remove the token in effect cleanup (also on unmount). Unit test: open A, open B, unmount B, A is top again. |
| Tab trap of the lower dialog stops working after the upper one closes | Low | Covered by the shared nested test (Tab after the second dialog closes). |
| Third missing key (`pushToOrchestrator`) left out | Low | Proposed for inclusion in Task 3. |
| Rendering booleans as "true"/"false" text looks technical | Low | No consumer passes booleans today. Consumers stay responsible for Yes/No. |

## Decisions (approved 2026-10-06)
1. Add all three missing keys, including `recovery.modal.pushToOrchestrator`.
2. Booleans render as text: `false` → `false`, `true` → `true`. Yes/No stays with consumers.
3. Rename both components as the last separate commit.

## Open questions (answered above)
1. Task 3: also add the third missing key `recovery.modal.pushToOrchestrator` (same
   checklist, same bug)? Recommendation: yes, since it is the same flow and dialog.
2. Task 4: should `false` render as the text `false` (recommended, the value stays
   visible) or as React renders it (empty value)?
3. Task 5: do the optional rename? It is low churn (2 importers each). Recommendation:
   yes, as a separate last commit.
