# Implementation Plan: DetailView / Metro Mirror pre-merge cleanup

## Overview
The last focused cleanup on `spike/ant-design-shell` before the PR. It removes the mock Dashboard
Preview from the production app. It makes HelpPopover use the usable viewport (without the classic
scrollbar), as DetailView already does (1faac357). It drops one unused barrel export, documents the
Access Log ordering assumption and records a known RelationshipGraph limitation. There is no
redesign: DetailView (md/lg/xl, dialogStack, portaled help), the Metro Mirror chain on the shared
`relationship-graph` and the feature-local FlashCopy fan-out all stay as approved.

## Audit findings (read-only, 2026-10-06, clean worktree at 1faac357)

### Dashboard Preview
- 13 files under `src/features/dashboard-preview/**` (pages, variants A–D, components, mock model).
- Only consumers: `src/app/routes.ts:35-36` (`dashboardPreview: '/dashboard-preview'` + comment) and
  `src/app/AppRoutes.tsx:132-135` (lazy `DashboardPreviewPage`), `:245-248` (`<Route path=…/:variant?>`).
- Nothing else in `src/`, tests, e2e or config imports it. The `statusTone` functions in `audit/` are
  unrelated local functions. → Remove the routes and delete the whole directory. `prototypes/` and
  `tasks/` are kept.

### HelpPopover (`src/shared/components/help-popover/HelpPopover.tsx`)
- Width: `default: w-[min(22rem,calc(100vw-2rem))]`, `wide: w-[min(55rem,calc(100vw-2rem))]`. `100vw`
  includes a classic scrollbar.
- Horizontal clamp: `left = min(max(8, anchor.right - width), window.innerWidth - 8 - width)`. The
  right boundary therefore includes the scrollbar, so at a right edge the panel can sit up to
  scrollbar-width px under the scrollbar, leaving a right gap of `8 - 15 = -7 px` against `clientWidth`.
- Vertical logic uses `window.innerHeight`. Pages scroll vertically only, so there is no horizontal
  scrollbar and that stays correct.
- Tests: `HelpPopover.test.tsx` already has placement tests that stub `innerWidth=800` and
  `innerHeight=600` and mock `getBoundingClientRect`, plus a class test that asserts the `100vw` strings.
  Escape, the Tab bridge, portal and aria-owns are already covered.

### DetailView barrel
- `DetailCopyButton` is exported from `detail-view/index.ts:7`. Its only users are `DetailField`,
  `DetailStatusBlock` and `DetailCode` (relative imports). No external consumer. → Remove only the
  export line.

### Access Log
- `selectAccessLogs.ts:24`: `[...response.entries].reverse().map(toAccessLogRecord)` has no comment.
  → Add a comment only.

### Stale "drawer" code comments (code, not i18n keys)
- `recovery-runs/components/RecoveryRunHistoryDetailView.tsx:30` "while this drawer is open"
- `recovery-groups/helpers/recoveryGroupOrchestrationState.ts:24` "Model C drawer plan" (keep the filename
  `tasks/detail-drawer-model-c-plan.md`, it is a real path)
- `recovery-groups/helpers/recoveryGroupOrchestrationState.ts:62` "drawer meta row"
- `ibm-power/PowerInventoryView.tsx:26` "passed to the drawer"
- `providers/components/ProvidersCatalogueTable.tsx:132` "in the drawer help"
- Test-file comments and test names (`PowerInventoryView.test.tsx`, `ProvidersCatalogueTable.test.tsx`,
  `RecoveryAppPoliciesTable.test.tsx`) are out of scope ("do not rename tests"), so they are left alone.
- `DetailView.tsx:115` and `test-utils/detailView.ts:4` mention `DetailDrawer` historically
  ("replaces DetailDrawer", "used to be visible in DetailDrawer"). This is intentional history and is kept.

### Baseline dead-code greps (already clean)
- `git ls-files "*DetailDrawer*"` → none. `git grep -w DetailDrawer -- src` → only the 2 historical comments.
- Compact-mode grep (`DetailViewMode|useResizablePanel|PanelRightIcon|MaximizeIcon|…`) → no hits.
- Metro Mirror: `RecoveryGroupReplicationChain.tsx` imports from `@/shared/components/relationship-graph`.
  `RecoveryGroupFlashCopyFanOut.tsx` stays in `recovery-groups/components/` (feature-local).

## Architecture decisions
- **HelpPopover width** mirrors DetailView: nominal `w-[22rem]` / `w-[55rem]` plus a shared
  `max-w-[calc(100%-2rem)]`. For a `position: fixed` box the percentage resolves against the fixed
  containing block, which is the viewport *without* a classic scrollbar. The browser must confirm this
  before commit (measure `panel.width === clientWidth - 32` at 390 px with a scrollbar).
- **HelpPopover horizontal clamp** uses `document.documentElement.clientWidth` instead of
  `window.innerWidth` for the right boundary only. Vertical keeps `window.innerHeight`. No other
  positioning logic changes.
- No i18n key renames, no RelationshipGraph code change, no selector behavior change.

## Task list
See `tasks/pre-merge-cleanup-todo.md` (Tasks 1–6 plus the final verification).

## Risks and mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `100%` on the fixed panel does not resolve to `clientWidth` in Edge | Med | Measure in Edge CDP before commit; fall back to a JS-set `maxWidth` from `clientWidth` only if the measurement disproves it |
| jsdom `clientWidth` is 0 by default, so the existing placement tests break | Low | Stub `document.documentElement.clientWidth` in the placement `layout()` helper |
| User's full suite is running in parallel | Med | Run focused vitest files only; never start a second full suite; stage explicit paths |
| Other sessions share the worktree | Med | `git status` before each commit; commit explicit paths only |
| Keycloak login needed in Edge :9333 | Low | Navigate to login and ask the user to authenticate; never bypass |

## Open questions
- None blocking. If the browser shows that `max-w-[calc(100%-2rem)]` does not exclude the scrollbar on a
  fixed element, I'll report it and propose the JS fallback before committing.
