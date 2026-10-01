# Implementation Plan: Compact page header (Variant A, global)

Tasks: `tasks/compact-page-header-todo.md`.
Visual reference: https://claude.ai/artifact/NPorHYgk6HYrighPMoPc1v (Variant A).

## Overview

Make the page chrome smaller on every page by changing the shared components. Remove the global
search/command bar. Shrink the top bar and the sidebar brand row from 72 px to 56 px. Drop the
category eyebrow. Make `PageHeader` compact: one row with the title on the left and the actions on
the right, with an optional one-line description below. Use sentence case for page titles and
shorten action labels where the page title already gives the context. Pages must keep fitting the
viewport on every monitor size, as they do today.

Expected gain is about 42 px of vertical space per page on desktop. The table starts at about
148 px from the top of the content card instead of 190 px.

## Architecture decisions

- **Change the shared component in place; don't add a new one.** `PageHeader` itself becomes the
  compact template. All 28 callers, including the 12 `TableToolbar` callers, pick it up through
  that one change. A parallel `CompactPageHeader` would leave two templates in the codebase.
- **Retire `eyebrow` in two steps.** Task 1 stops rendering the prop but keeps it as an optional
  prop. The caller tasks then remove it page by page, together with the locale keys that become
  orphaned. Task 11 deletes the prop from the types, so `tsc` catches any caller that was missed.
  The app stays green after every task.
- **Geometry (from the approved mockup):**
  - Root `mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4`
  - `<h1>`: `text-xl font-semibold leading-9 tracking-[-0.01em]`. Its line is 36 px, the same as a
    `size="sm"` button, so the title and the actions share one row.
  - Description: optional, `text-sm text-text-muted max-w-3xl`, no top margin.
  - Actions: `flex flex-wrap items-center gap-3`. Below `sm` they wrap under the title.
- **Fit to viewport needs no new mechanism.** The shell is pure flex
  (`lg:h-screen` → `lg:min-h-0` → `flex-1`) with the `min-h-min` floor from
  `docs/superpowers/specs/2026-08-27-short-viewport-content-overflow-design.md`. No code computes
  a height from the header (no `calc(100vh - …)`). Smaller chrome therefore only gives space to
  the table. A browser matrix (Task 13) is still required, because the floor and the 768p laptop
  behavior depend on the measured chrome height.
- **Skeletons mirror the real geometry.** `AppShellSkeleton` and `RouteLoadingSkeleton` lose the
  eyebrow bar and the search placeholder, and get the 56 px header and the compact heading
  heights. Otherwise the page jumps when loading finishes.
- **Naming rule:** sentence case in `en`. Shorten an action only when the page title already
  supplies the noun. cs/sk get the same shortening; their casing is already natural.
- **Locale files are shared by nearly every task**, so the tasks run in sequence, not in parallel.

## Naming table (en)

| Where | Today | Proposed |
|---|---|---|
| Platform providers title / action | Platform Providers / Add Platform Provider | Platform providers / Add provider |
| Providers action | Add Provider | Add provider |
| Identity title | Identity & Access | Identity & access (cs/sk: use the nav translation) |
| Configuration title | hardcoded "Configuration" | i18n key, Configuration |
| Infrastructure title | Infrastructure Topology | Infrastructure topology |
| Recovery runs title | Recovery Runs | Recovery runs |
| Recovery apps title / action | Recovery Applications / Create Application | Recovery apps / Create app |
| Recovery app builder / editor | Create / Edit Recovery Application | Create recovery app / Edit recovery app |
| Recovery groups title / action | Recovery Groups / Create Recovery Group | Recovery groups / Create group |
| Recovery group builder / editor | Create / Edit Recovery Group | Create recovery group / Edit recovery group |
| Recovery policies title | Recovery Policies | Recovery policies |
| Clean room action | Add Clean Room Policy | Add policy (the tab gives the context) |
| Policy sets title / action | Policy Sets / Add Policy Set | Policy sets / Add policy set (kept long: "Add set" is unclear) |
| Recovery actions title | Recovery Actions | Recovery actions |
| Unchanged | Credentials, Create credential, Discovery settings, Access logs, Virtual machines, FlashSystem volumes, IBM Power partitions, Refresh, Refresh inventory, Back | — |

## Task list

### Phase 1: Foundation (shell and template)
- [x] Task 1: Compact `PageHeader` template
- [x] Task 2: Remove global search; 56 px top bar and sidebar brand row
- [x] Task 3: Skeletons mirror the new geometry

### Checkpoint A
- [x] Focused tests green, `tsc` clean
- [x] Browser: Platform providers and Resources at 1366×768 and 1920×1080; no clipping, no extra scrollbar (user-verified 2026-10-01)

### Phase 2: Callers (remove eyebrow, rename, update tests)
- [ ] Task 4: Platform providers and Audit
- [ ] Task 5: Identity & access and Configuration
- [ ] Task 6: Providers, Provider detail, Credentials and Discovery settings
- [ ] Task 7: Infrastructure and the Resources pages (VMware, FlashSystem, IBM Power)
- [ ] Task 8: Recovery apps (list, builder, editor)
- [ ] Task 9: Recovery groups (list, builder, editor, topology prototype)
- [ ] Task 10: Recovery policies, Policy sets, Recovery runs, Recovery actions and the module placeholder

### Checkpoint B
- [ ] `grep eyebrow src` shows only the `PageHeader`/`TableToolbar` prop definitions
- [ ] All touched page tests green

### Phase 3: Lock-in and verification
- [ ] Task 11: Delete the `eyebrow` prop from the types
- [ ] Task 12: Sidebar nav labels in sentence case
- [ ] Task 13: Browser fit matrix across monitor sizes

### Checkpoint C
- [ ] All acceptance criteria met; measurements recorded; ready for review

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A structure-sensitive test (`TableToolbar.test.tsx:76-79` uses `heading.parentElement.parentElement`) breaks | Low | Keep the same DOM nesting (root > text block > h1) |
| A skeleton and the real page differ in height, so the layout jumps after load | Med | Task 3 mirrors the exact heights; check it in the browser at Checkpoint A |
| The 768p laptop floor changes: chrome ~42 px smaller means the scrollbar appears later | Low (an improvement) | Measure in Task 13 and record the result next to the existing short-viewport spec |
| Long titles or several actions collide on one row at 1024–1280 px | Med | `min-w-0` on the text block, `flex-wrap` on the actions; check Identity & access, which has two actions in the user-federation section |
| Removing Ctrl K breaks someone's habit | Low | Explicitly requested; mention it in the commit message |
| A missed caller still passes `eyebrow` | Low | Task 11 deletes the prop, so `tsc` fails on any leftover |

## Decisions (2026-10-01)

1. Sidebar nav labels move to sentence case to match the page titles. Task 12 is in scope.
2. `TableToolbar` Refresh/Updating defaults switch to `common.refresh` / `status.updating` in Task 1.
3. Tasks are tracked in `tasks/compact-page-header-todo.md`. No GitHub issues.
