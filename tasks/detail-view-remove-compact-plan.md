# Implementation Plan: Remove DetailView compact mode

Task list: `tasks/detail-view-remove-compact-todo.md`. Branch `spike/ant-design-shell`.
Planning only. No production code changes until the plan is approved.

## Overview
`DetailView` currently has two modes in one DOM tree: an EXPANDED centred dialog (the
default) and a COMPACT right-side panel, toggled by a header button ("Compact view" /
"Expand") and resizable from `lg`. This plan removes the compact mode, so there is one
detail experience: row click → centred DetailView → Close. The `md`/`lg`/`xl` sizes and
the existing narrow-viewport behaviour stay as they are.

## 1. Current state (audit)

### Shared component (`src/shared/components/detail-view/DetailView.tsx`)
Everything compact-specific, by line (as of the worktree on 2026-10-06):

| Line(s) | Code | Compact-only? |
|---|---|---|
| 5 | `import { useResizablePanel }` | yes |
| 6 | `MaximizeIcon`, `PanelRightIcon` imports | yes (`CloseIcon` stays) |
| 2 | `CSSProperties` type import | yes (only used for `--detail-view-width`) |
| 9 | `export type DetailViewMode = 'expanded' \| 'compact'` | yes |
| 24 | prop comment "before the built-in mode toggle" | stale wording |
| 30 | `size` comment "compact mode keeps its own width" | stale wording |
| 61-62 | `isVisible` comment mentions the resize handle | stale wording (function stays) |
| 115-121 | component doc comment describing both modes | rewrite |
| 125 | `useState<DetailViewMode>('expanded')` | yes |
| 132 | `setMode('expanded')` in the close reset | yes (`setActiveId(null)` stays) |
| 136 | `const compact = mode === 'compact'` | yes |
| 137 | `useResizablePanel({ open: open && compact, resizeLabel: t('detailView.resize') })` | yes |
| 211 | backdrop `compact ? 'bg-black/45' : 'bg-black/30'` | keep `bg-black/30` |
| 221 | `data-mode={mode}` | yes |
| 225-226 | right-anchored frame: `inset-y-0 right-0 w-[min(420px,92vw)] border-l shadow-[-14px…] lg:w-(--detail-view-width) lg:max-w-[92vw]` | yes |
| 227 | centred frame | **keep** (becomes unconditional) |
| 229 | `style={{ '--detail-view-width' }}` | yes |
| 231-236 | resize handle (`role="separator"`) | yes |
| 251-258 | mode toggle button (`hidden … sm:inline-flex`) | yes |
| 272 | body `compact ? undefined : 'sm:flex-row'` | keep `sm:flex-row` |
| 278 | nav comment "Horizontal (compact, narrow screens)" | stale wording |
| 280 | nav `compact ? undefined : 'sm:w-52 sm:flex-col …'` | keep the `sm:` classes |
| 295-296 | nav item `compact ? undefined : 'sm:gap-2.5 …'`, `secondary && !compact` | keep the `sm:` classes |

Not compact-specific (unchanged): dialog stack / Escape / Tab trap (hardening Task 1),
focus on Close at open, focus return to the opener, section reset on close,
`sectionsOf`, `SectionContext`, `EXPANDED_WIDTH`, header, content region, footer.

Compact-specific focus behaviour: none beyond the toggle being the first tabbable
header control at `sm+`. After removal the first tabbable is the first `headerActions`
control (or Close).

### Exports and types
- `index.ts:2` exports `type DetailViewMode`. No importer outside `DetailView.tsx`.
- `DetailViewProps` has **no** mode prop, default mode, mode callback, compact width or
  mode labels. Mode is purely internal state. The public API needs no prop change.

### Helpers that become orphans
- `src/shared/hooks/useResizablePanel.ts` + `useResizablePanel.test.ts`: the only
  importer is `DetailView.tsx:5`.
- `PanelRightIcon`, `MaximizeIcon` (`src/shared/icons/Icons.tsx:257-272`): the only user
  is `DetailView.tsx`.

### Consumers (proved by `git grep`)
17 `DetailView` instances. None passes or reads a mode, none renders differently by
mode, and none depends on the compact layout. `data-mode`, `Compact view`, `Expand`,
`separator` and `--detail-view-width` appear only in `DetailView.tsx` and the tests
listed in §6.

| Consumer | File | Size |
|---|---|---|
| VMware VM | `discovery-inventory/.../vmware/VirtualMachineDetailPanel.tsx:64` | xl |
| IBM Power | `discovery-inventory/.../ibm-power/IbmPowerDetailPanel.tsx:215` | xl |
| FlashSystem volume | `discovery-inventory/.../flash-system/FlashSystemVolumeDetailPanel.tsx:74` | lg (default) |
| Recovery Group | `recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx:410` | lg (default) |
| Recovery Application | `recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx:410` | lg (default) |
| Access Log | `platform-administration/audit/components/AccessLogDetailDrawer.tsx:59` | lg (default) |
| Platform Provider | `platform-administration/platform-providers/components/PlatformProvidersTable.tsx:256` | md |
| Provider Catalogue | `providers-connectors/providers/components/ProvidersCatalogueTable.tsx:319` | md |
| Credentials | `providers-connectors/credentials/components/CredentialsTable.tsx:133` | md |
| Identity Users | `identity-access/components/UsersSection.tsx:159` | md |
| Identity Clients | `identity-access/components/ClientsSection.tsx:132` | md |
| Realm Roles | `identity-access/components/RealmRolesSection.tsx:149` | md |
| Policy Sets | `recovery-plans/policy-sets/components/PolicySetsTable.tsx:178` | md |
| Snapshot Policies | `recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx:261` | md |
| Recovery App Policies | `recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx:219` | md |
| Clean Room Policies | `recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx:155` | md |
| Recovery Actions History | `recovery-actions/pages/RecoveryActionsHistoryPage.tsx:51` | md |
| Recovery Run History | `recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.tsx:50` | md |

Note: Recovery Group is `lg`, not `xl`. That is today's assignment and it stays (no
sizing redesign). Other files that import from `detail-view` (`BackingStorageInfo`,
`RecoveryGroupMetroMirrorFields`, `RecoveryGroupOrchestrationStatus`,
`useLatestOrchestratorRun`) use content primitives only.

No production consumer file changes.

## 2. UX rationale
- The compact panel shows the same content in less space, and users usually expand it.
- It is still modal (backdrop, focus trap), so it does not let users work with the
  table behind it. That would be the only reason to keep a side panel.
- It doubles the frame and navigation styling, adds mode state, a resize hook and
  mode tests.
- The toggle is already hidden below `sm` (640 px). Phones and narrow windows **already**
  get only the centred dialog. Removing compact mode changes nothing there.

## 3. Shared API changes
- Remove `export type DetailViewMode` from `DetailView.tsx` and `index.ts`.
- Remove the `data-mode` attribute. `data-size` stays.
- `DetailViewProps` is unchanged (open, onClose, title, entityLabel, statuses, meta,
  headerActions, footer, footerStart, size, ariaLabel, closeLabel, children). Only the
  `headerActions` and `size` comments are reworded.

## 4. Internal DetailView changes
1. Delete the `mode` state, `compact`, `setMode('expanded')` in the reset, and the
   `useResizablePanel` call. Keep the `wasOpen` reset of `activeId`.
2. Frame: keep the current centred classes unconditionally:
   `fixed z-50 flex flex-col overflow-hidden bg-surface top-1/2 left-1/2
   h-[min(46rem,calc(100dvh-2rem))] ${EXPANDED_WIDTH[size]} -translate-x-1/2
   -translate-y-1/2 rounded-2xl border border-border shadow-lg [--detail-gutter:1.25rem]
   sm:[--detail-gutter:2rem]`. Remove `style` and the resize handle.
3. Backdrop: `bg-black/30` only.
4. Header: delete the toggle button. `headerActions` then Close.
5. Body/nav/nav item: drop the `compact ? …` branches and keep the `sm:` classes
   unconditionally (`sm:flex-row`, `sm:w-52 sm:flex-col …`, `sm:gap-2.5 sm:px-3 sm:py-2`,
   `secondary ? 'sm:mt-auto'`).
6. Remove the unused imports (`useResizablePanel`, `MaximizeIcon`, `PanelRightIcon`,
   `CSSProperties`). Reword the stale comments (lines 24, 30, 61, 115-121, 278).
7. Keep `isVisible` in the Tab trap. Consumers can still render CSS-hidden focusables.
   Only its comment changes.
8. Delete the orphans: `useResizablePanel.ts`, `useResizablePanel.test.ts`, and the
   `PanelRightIcon` and `MaximizeIcon` icons.

Optional (rename) `EXPANDED_WIDTH` → `WIDTH`: skipped. It is not required and would
widen the diff.

## 5. Consumer impact
- No consumer source changes (see §1).
- Consumer tests change only where they assert the toggle, `data-mode` or the resize
  handle (see §6).
- Feature-specific behaviour lost: none. VMware resize was a shared compact feature, not
  VMware logic.

## 6. Test impact

### `src/shared/components/detail-view/DetailView.test.tsx`
| Test | Class | Action |
|---|---|---|
| renders nothing while closed | KEEP | |
| opens expanded as a modal dialog with focus on Close | REWRITE | drop `data-mode`. Rename to "opens as a centred modal dialog…". Assert no `data-mode` attribute. |
| shows entity, title, statuses and meta… | KEEP | |
| closes on Escape, Close and the backdrop | KEEP | |
| traps Tab inside the dialog | REWRITE | Tab from the last control (Edit) wraps to **Help** (first `headerActions` control), not "Compact view". |
| returns focus to the opener when it closes | KEEP | |
| places header actions before Close and pins footer groups | REWRITE (extend) | also assert the header buttons are exactly `['Help', 'Close detail']` (no mode toggle). |
| sections: first by default / one at a time | KEEP | |
| secondary last, counts, description | KEEP | |
| arrow keys | KEEP | |
| single section omits navigation | KEEP | |
| sections inside fragments | KEEP | |
| arbitrary React content / flush | KEEP | |
| modes: switches to compact and back… | DELETE | removed behaviour. |
| modes: resets to expanded on the first section after closing | REWRITE | move to "sections" as "reopens on the first section after closing". Keep the section reset and drop the compact step and `data-mode`. |
| sizes: defaults to lg | KEEP | |
| sizes: md/lg/xl mapping | KEEP | |
| sizes: keeps the compact width independent of the size | DELETE | removed behaviour. |
| composition contract (2 tests) | KEEP | |
| **new**: responsive navigation classes | ADD | nav has `flex-wrap` (narrow, horizontal, wrapping) and `sm:flex-col sm:w-52` (vertical from `sm`). Body has `sm:flex-row`. No `separator` role. jsdom has no media queries, so classes are the testable contract. |

### `src/shared/hooks/useResizablePanel.test.ts`
DELETE (whole file, together with the hook).

### `VirtualMachineDetailPanel.test.tsx`
| Test | Class | Action |
|---|---|---|
| opens expanded on Overview… (l.197) | REWRITE | delete only the `data-mode` assertion (l.201). Keep `data-size xl` and the navigation. |
| resizes the compact panel via the drag handle and keyboard (l.524) | DELETE | |
| reopens expanded after closing a resized compact panel (l.541) | DELETE | the section reset is covered by the shared test. |

### `RecoveryGroupsTable.test.tsx`
| Test | Class | Action |
|---|---|---|
| opens expanded with Overview active… (l.553) | REWRITE | delete the `data-mode` assertion (l.556). |
| switches to compact and back keeping the selected group and section (l.733) | DELETE | |
| closes the detail from the close button and on Escape in compact mode (l.746) | REWRITE | same flow without the compact click and `data-mode`: Escape closes, row click reopens, Close closes. |
| starts the next group on Overview in expanded mode (l.779) | REWRITE | drop the compact click and `data-mode`, keep "Technical → close → other row opens on Overview". Rename to "starts the next group on Overview". |

### Identity tests: header button order (REWRITE, one line each)
- `ClientsSection.test.tsx:285` → `['Client help', 'Close client detail']`
- `RealmRolesSection.test.tsx:186` → `['Application role help', 'Close application role detail']`
- `UsersSection.test.tsx:185` → `['User help', 'Close user detail']`

These now prove the toggle is absent in real consumers.

### KEEP (no compact references, run as regression)
`AccessLogDetailDrawer.test.tsx`, `PlatformProvidersTable.test.tsx`,
`CredentialsTable.test.tsx`, `ProvidersCatalogueTable.test.tsx`,
`RecoveryActionsHistoryPage.test.tsx`, `RecoveryApplicationsTable.test.tsx`,
`HelpPopover.test.tsx`, `modal/nestedDialogs.test.tsx` (hardening; its Tab loop counts
steps, not specific controls, so it passes with one fewer header button),
`DetailContent.test.tsx`, `src/locales/detailViewTranslations.test.ts`.

## 7. Translation cleanup
Keys referenced **only** from `DetailView.tsx` (checked with
`git grep "detailView\.(compactView|expand|resize)"`):

| Key | en | cs | sk |
|---|---|---|---|
| `detailView.compactView` | Compact view | Kompaktní zobrazení | Kompaktné zobrazenie |
| `detailView.expand` | Expand | Rozbalit | Rozbaliť |
| `detailView.resize` | Resize panel | Změnit šířku panelu | Zmeniť šírku panela |

Remove these from `en.json`, `cs.json` and `sk.json`. `detailViewTranslations.test.ts`
(key parity across locales) stays green because all three locales lose the same keys.
Do **not** touch other "Expand"/"Compact" keys (e.g. `common.*`, table or inventory
expand labels). Check each with `git grep` before removing.
`useResizablePanel`'s hard-coded default `'Resize panel'` leaves with the hook.

## 8. Responsive / narrow behaviour
Decision: **keep the current centred CSS as it is.** It already does what is required:

| Viewport | Behaviour (current expanded CSS, unchanged) |
|---|---|
| ~390 px | width `calc(100vw-2rem)` = 358 px, height `min(46rem, 100dvh-2rem)`, 1 rem margin all round. Navigation horizontal and wrapping above the content (`flex-wrap`, border-bottom). Gutter 1.25 rem. Content region scrolls (`overflow-y-auto`), header and footer pinned (`shrink-0`), footer wraps (`flex-wrap`). |
| 640–1023 px (tablet / narrow desktop) | `sm:` applies: vertical 13 rem navigation, `sm:flex-row` body, 2 rem gutter, width capped by `100vw-2rem`. |
| ≥ 1024 px | md 55 rem / lg 60 rem / xl 75 rem, centred. |

This is the same component at every width. No mobile-specific implementation and no side
drawer. The only narrow-width change is that nothing changes: the toggle was already
`hidden` below `sm`.

## 9. Accessibility impact
- `role="dialog"`, `aria-modal`, `aria-label`, focus on Close at open, Tab trap, Escape
  through the dialog stack and focus return to the opener: unchanged.
- One fewer tab stop in the header at `sm+`. Tab order: headerActions → Close → nav →
  content → footer.
- The `role="separator"` resize handle (focusable, arrow keys) disappears with the mode.
- The section navigation keeps `aria-label="Sections"`, `aria-current` and arrow-key
  roving.
- No new ARIA.

## 10. Browser verification plan
Real app, `http://localhost:5173`, own Edge tab on CDP `127.0.0.1:9333`. Never drive
other sessions' tabs. The user must have logged in to Keycloak in that Edge once. Wait
9–14 s for inventory rows. Dark mode = `.dark` class on `<html>`.

Details to open: Platform Provider (md), Recovery Group (lg, dense), VMware VM (xl),
IBM Power (xl), Access Log (lg), Identity User (md), Snapshot Policy (md).

For each detail:
- Row click opens the **centred** dialog immediately. The bounding rect is horizontally
  centred and not anchored to the right edge.
- No "Compact view"/"Expand" button. No `[role=separator]`. No `data-mode`.
- Section navigation works (click + arrows). Footer actions are present (open Edit/Delete
  only up to the confirmation and **never confirm a delete**).
- HelpPopover opens and Escape closes only the help (where the detail has help).
- Recovery Group: Delete → confirmation → Escape closes only the confirmation. A second
  Escape closes the detail and focus returns to the row.
- Close → focus returns to the row. Reopen → first section.

Viewports and themes: 1440×900 desktop, 800×900 (tablet), 390×844 and dark mode at
desktop and 390. Check `document.documentElement.scrollWidth <= innerWidth` and the
dialog `scrollWidth <= clientWidth` (no horizontal overflow). Footer is visible without
scrolling the page. Console has no errors or warnings.

## 11. Implementation sequence
Prerequisite (**dependency**): `DetailView.tsx` currently carries **uncommitted**
hardening Task 1 hunks (dialog stack). The locale files are also the target of hardening
Task 3. Start Phase A only after hardening Task 1 is committed. Start Phase B's locale
cleanup only after hardening Task 3 is committed (or if `git diff src/locales` is empty).
Otherwise these hunks would be swept into this commit or conflict with them.

- **Phase A, shared component (Tasks 1–2).** Remove the mode from `DetailView.tsx`
  and `index.ts`. Update `DetailView.test.tsx`. Update the five consumer tests in the
  same commit, because a commit in between would be red.
- **Phase B, orphans and i18n (Tasks 3–4).** Delete `useResizablePanel` + test and
  the two icons. Remove the three locale keys.
- **Phase C, browser verification (Task 5).** The matrix in §10.
- **Phase D, cleanup search and final validation (Task 6).**

Cleanup searches (Phase D). Each hit must be explained or zero:
```
git grep -n "Compact view" -- src
git grep -n "compactView\|detailView.expand\|detailView.resize" -- src
git grep -n "Expand" -- src/shared src/features        # hits must be unrelated (e.g. inventory "Expand", common labels)
git grep -n -i "compact" -- src/shared/components/detail-view   # expect 0
git grep -n "mode" -- src/shared/components/detail-view         # expect 0 mode-switching hits
git grep -n "data-mode\|DetailViewMode\|--detail-view-width\|420px,92vw" -- src
git grep -n "useResizablePanel\|PanelRightIcon\|MaximizeIcon" -- src
```

## 12. Commit strategy
Stage explicit paths only. Never derive the list from `git status`. Check that
`git diff --cached` is empty before `git add`. Do NOT revert, stage or commit unrelated
changes (OpenAPI, generated Zod, Metro Mirror, other sessions' task files, hardening
hunks).

1. `refactor(detail-view): remove compact mode`: `DetailView.tsx`, `index.ts`,
   `DetailView.test.tsx`, `VirtualMachineDetailPanel.test.tsx`,
   `RecoveryGroupsTable.test.tsx`, `ClientsSection.test.tsx`,
   `RealmRolesSection.test.tsx`, `UsersSection.test.tsx`.
   (The suggested separate `test(detail-view)` and "consumer expectations" commits are
   merged into this one. Separately they would leave red commits.)
2. `refactor(shared): remove unused resizable panel hook and mode icons`:
   `useResizablePanel.ts`, `useResizablePanel.test.ts`, `Icons.tsx`.
3. `chore(i18n): remove unused detail mode labels`: `src/locales/{en,cs,sk}.json`
   (only after `git diff -U0 src/locales` shows just these three keys × 3).

## 13. Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Editing `DetailView.tsx` while hardening Task 1 is uncommitted sweeps its hunks into commit 1 | High | Wait for its commit. Before staging, check that `git diff` on the file contains only compact-removal hunks. |
| Locale files changed concurrently (hardening Task 3, other sessions) | Med | Commit locales last. Check `git diff -U0 src/locales`, or use a temporary index. |
| Deleting a `sm:` class with a `compact` branch breaks the tablet layout | Med | §4 step 5 lists exactly which branches are kept. Add the new nav class test. Browser check at 800 px. |
| A consumer test indirectly depends on header button count / Tab order | Low | Grep done (only 3 identity tests). Run the full consumer test list in §6. |
| Removing a generic "Expand" translation | Low | Only the `detailView.*` keys are removed, each confirmed by `git grep`. |
| Users lose the resizable side panel they relied on | Low | Product decision in the request. The compact panel was modal anyway. |

## 14. Rollback considerations
- Each commit is self-contained and green. `git revert` of commit 1 restores the mode
  only if commits 2–3 are reverted first (the hook, icons and keys must exist). Revert in
  reverse order: 3 → 2 → 1.
- No data, API or persisted-state change (the mode was never persisted). Rollback is
  code-only.

## 15. Acceptance criteria
- [ ] `DetailView` has no compact or right-drawer mode, no `mode` state, no `data-mode`,
  no `DetailViewMode` export.
- [ ] Row click opens the centred DetailView directly, on the first section.
- [ ] No "Compact view" or "Expand" action and no resize handle exists.
- [ ] `md`/`lg`/`xl` remain with the same widths and consumer assignments.
- [ ] At 390 px the dialog fits the viewport, navigation wraps horizontally, content
  scrolls, the footer stays reachable, and there is no horizontal overflow.
- [ ] All 17 consumers work. No feature-specific behaviour is lost.
- [ ] Focused tests (§6) pass. `npm run lint` and `npm run typecheck` pass.
- [ ] Browser verification (§10) passes, including dark mode, with a clean console.
- [ ] Orphaned hook, icons and the 3 locale keys are removed. Cleanup searches are clean.
- [ ] No unrelated files changed or committed.

## Open questions
- Delete `useResizablePanel` and the two icons (proposed, as they become dead code) or
  keep them for possible future side panels? The plan deletes them, following "no dead
  abstractions".
