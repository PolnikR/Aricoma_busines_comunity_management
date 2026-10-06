# Pre-merge cleanup — todo

Plan: `tasks/pre-merge-cleanup-plan.md` (approved 2026-10-06 with corrections, reflected below).
Stage explicit paths only, never `git add .` / `-A`; `git status --short` before every task and commit,
`git diff --cached` before every commit. Do not start a full test suite (the user runs one separately).

Foreign-session files, never touched/staged: `prototypes/detail-overview-design/`,
`tasks/detail-view-content-centering-{plan,todo}.md`, and uncommitted edits to
`src/layouts/app-shell/{AppShell,AppSidebar}{,.test}.tsx`, `src/shared/components/detail-view/DetailView{,.test}.tsx`.

## Phase 1 — Production surface

- [x] **Task 1: Remove Dashboard Preview from production** (S)
  - Remove `routes.dashboardPreview` + its comment, lazy `DashboardPreviewPage`, its `<Route>`, and
    `src/features/dashboard-preview/**` (13 files, no other consumer).
  - Acceptance: `git grep -n -E "dashboardPreview|dashboard-preview" -- src` → no hits; `prototypes/` and
    `tasks/` untouched.
  - Verification: typecheck; lint changed files.
  - Commit: `refactor(dashboard): remove mock preview from production routes`

## Phase 2 — HelpPopover usable-viewport geometry

- [x] **Task 2: Measure before change** — Edge CDP `127.0.0.1:9333`, 800×900, page with a classic
  vertical scrollbar, wide help: `innerWidth`, `clientWidth`, scrollbar width, trigger rect, panel rect,
  panel width, left/right gaps against `clientWidth`. Stop and report if the root cause is disproved.
- [x] **Task 3: Fix** — `w-[22rem]` / `w-[55rem]` + shared `max-w-[calc(100%-2rem)]`; horizontal clamp uses
  `document.documentElement.clientWidth`; vertical unchanged.
  - Tests: nominal widths, shared max-w, no `100vw`, right-edge clamp with 800/785, left-edge clamp,
    upward placement, resize and scroll re-placement; existing Escape/Tab/portal/aria tests green.
- [x] **Task 4: Browser verify after fix** — VMware, IBM Power, FlashSystem, Provider Catalogue at
  1440×900, 800×900 (scrollbar proof) and 390×844 (narrow regression only, no scrollbar required);
  light + dark. Commit: `fix(help): constrain popovers to usable viewport`

### Checkpoint A
- [x] Focused HelpPopover / nested dialogs / DetailView tests green; measurements recorded.

## Phase 3 — Small cleanups

- [x] **Task 5: Remove unused `DetailCopyButton` barrel export** (keep the component).
  Commit: `refactor(detail-view): remove unused copy-button barrel export`
- [x] **Task 6: Access Log ordering contract comment** (no behavior change).
  Commit: `docs(audit): document access log ordering contract`
- [x] **Task 7: Stale production "drawer" comments** — comment-only, all non-test production comments:
  `BackingStorageInfo.tsx:185`, `PowerInventoryView.tsx:26`, `ProvidersCatalogueTable.tsx:132`,
  `RecoveryRunHistoryDetailView.tsx:30`, `useAppRunHistory.ts:26`, `recoveryRunTypes.ts:2`,
  `recoveryGroupOrchestrationState.ts:24,62` (keep the `tasks/detail-drawer-model-c-plan.md` path),
  `KeyedHelpPopover.tsx:16`. Keep: `DetailView.tsx` "replaces DetailDrawer", `test-utils/detailView.ts`;
  local variables (`drawerOpen`), i18n keys, tests untouched.
- [x] **Task 8: RelationshipGraph known limitation note** in
  `tasks/recovery-group-metro-mirror-chain-todo.md`. Commit with Task 7:
  `docs(detail-view): clean stale drawer terminology`

## Phase 4 — Final verification

- [x] **Task 9: Dead-code audit** (DetailDrawer, compact mode, dashboard preview, DetailCopyButton greps;
  DetailView consumers import the barrel; Metro Mirror chain imports shared relationship-graph;
  FlashCopy fan-out stays in `recovery-groups/`).
- [x] **Task 10: Focused validation** — vitest on help-popover, nestedDialogs, detail-view,
  relationship-graph, Recovery Group Inventory / Metro Mirror, Access Log; `npm run lint`,
  `npm run typecheck`, `git diff --check`.

## Measurements

Edge 154 (CDP `127.0.0.1:9333`, own tab, `Emulation.setDeviceMetricsOverride`, `localhost:5173`).
Scrollbar page: Provider Catalogue (`/providers-connectors/providers`), provider detail → wide
"Provider help". Resources pages scroll inside a container and have no document scrollbar at 800×900.

### Before (Task 2), 800×900, light
- `innerWidth` 800, `clientWidth` 785 → classic scrollbar **15 px**.
- Natural trigger position: trigger 691.2–723.2 (top 99), panel 8–776, width **768** (= innerWidth − 32,
  from `100vw`; usable-viewport cap would be 785 − 32 = 753), left gap 8, right gap 9.
- Trigger moved to the right edge (`translateX`, trigger right 795, then resize re-placement): panel
  24–792, width 768, right gap against `clientWidth` **−7 px → 7 px under the scrollbar**; left clamp came
  from `innerWidth − 8 − 768 = 24`.
- Root cause confirmed: `100vw` width and the `window.innerWidth` right boundary both include the scrollbar.

### After (Task 4), wide help in the detail view of the first row
Width cap = `max-w-[calc(100%-2rem)]` resolves against the fixed containing block = `clientWidth`
(785 − 32 = 752.8 ≈ 753 px). Right gap is measured against `clientWidth`. "Edge" = trigger moved to
`clientWidth + 10` via `translateX` + resize re-placement.

| Page | Viewport | iw / cw (scrollbar) | Panel (left–right, width) | Gap L / R | Edge probe (panel, gap R) |
|---|---|---|---|---|---|
| Provider Catalogue | 800×900 | 800 / 785 (15) | 8–760.8, 752.8 | 8 / 24.2 | 24.2–777, **8** |
| FlashSystem | 800×900 | 800 / 785 (15) | 8–760.8, 752.8 | 8 / 24.2 | 24.2–777, **8** |
| VMware | 800×900 | 800 / 800 (0) | 8–776, 768 | 8 / 24 | 24–792, 8 |
| IBM Power | 800×900 | 800 / 800 (0) | 8–776, 768 | 8 / 24 | 24–792, 8 |
| all four | 1440×900 | 1440 / 1440 (0) | nominal 880 (e.g. Provider 363.2–1243.2) | ≥ 92.8 | — |
| all four | 390×844 | 390 / 375 (15) | 8–351.2, 343.2 | 8 / 23.8 | — |

- 800 px scrollbar proof: before the edge probe ended 7 px under the scrollbar (−7), now 8 px clear of it.
- Every run: panel `position: fixed`, child of `body`, no document horizontal overflow, no horizontal
  overflow inside the panel (relationship diagram not clipped), console clean.
- Interactions (real CDP key/mouse input, focus emulation): focus opens with aria-owns/aria-controls;
  Tab trigger → panel → Close help; Shift+Tab back to panel; Escape closes only the help (detail stays
  open, focus on trigger); pointer down inside the detail outside the panel closes only the help.
- Dark mode (`.dark`): all four pages at 800×900 identical geometry and interactions; screenshots checked.
  390×844 was run in light mode for all four pages (narrow regression check).

## Final audit and validation (Tasks 9–10)
- `git ls-files "*DetailDrawer*" "*DetailDrawerSection*"` → none; `git grep -w DetailDrawer -- src` → only
  the 2 intentional historical comments (`DetailView.tsx`, `test-utils/detailView.ts`).
- Compact-mode grep → no hits. Dashboard-preview grep → no hits.
- `DetailCopyButton` → only `detail-view` internals (DetailCode, DetailField, DetailStatusBlock, itself).
- No production import bypasses `@/shared/components/detail-view`.
- `RecoveryGroupReplicationChain.tsx` imports RelationshipGraph/Group/Chain/Node/Connector/Lanes/Note from
  `@/shared/components/relationship-graph`; `RecoveryGroupFlashCopyFanOut.tsx` stays in `recovery-groups/`.
- Remaining non-test "drawer" comments: the Model C task path (kept) and `AppSidebarContext.ts` (the real
  mobile sidebar drawer, not detail terminology).
- Focused vitest: help-popover (2 files, 26 tests), nestedDialogs + detail-view (48), relationship-graph +
  Recovery Group Inventory / Metro Mirror + nestedDialogs (56), audit + detail-view (88), app router (4) —
  all green. `npm run lint`, `npm run typecheck` green. Full suite: owned by the user's separate run.
