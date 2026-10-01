# TODO: Short-viewport floor for Resources and Infrastructure

Source: `tasks/short-viewport-route-floor-plan.md`.

## Rules for every task

- Run `git status --short` before you start, and stage only the files this task owns.
  `tasks/detail-drawer-model-c-plan.md` is not part of this work.
- Verify with `npm exec vitest run <the touched test files>`, `npx eslint <the touched files>`,
  `npx tsc -p tsconfig.app.json --noEmit` and `git diff --check`.
- Make no changes to `PageHeader`, `AppHeader`, `AppSidebar`, `AppShell`, the route handles, `DataTable`, typography,
  button sizes or density.
- Only `lg:` classes change. Below lg the classes must be byte-identical.

---

## Task 1: Baseline measurements (no code)

**Description:** Using the same CDP-driven Edge approach as compact-header Task 13, measure the following on the
current `HEAD` at 1280×600, 1366×600, 1366×768, 1024×768, 1536×864, 1920×1080 and 390×844:

- Resources (VMware): card section height, row-region height and the number of visible rows
- Infrastructure: toolbar height, canvas-region height and card height

Use the results to confirm or lower the tentative floors (440 px card, 280 px canvas). The rule is that
1366×768 and taller must stay unchanged.

**Acceptance criteria:**
- [x] Baseline numbers recorded for both routes at every size (HEAD `84f48d14`; same layout code as `9aed7488`)
- [x] Final floor values chosen, and the headroom at 1366×768 stated

**Baseline (px):**

| Viewport | Resources section | Resources visible row band (fully visible rows) | Infra toolbar | Infra canvas | Infra card |
|---|---|---|---|---|---|
| 1280×600 | 353 | 26 (0/2) | 69 | 143 | 291 |
| 1366×600 | 353 | 26 (0/2) | 69 | 143 | 291 |
| 1366×768 | 521 | 149 (2/2) | 69 | 311 | 459 |
| 1024×768 | 529 | 149 (2/2) | 167 | 221 | 467 |
| 1536×864 | 617 | 65 (2/2) | 69 | 407 | 555 |
| 1920×1080 | 833 | 65 (2/2) | 69 | 623 | 771 |
| 390×844 | 607 | 149 (2/2) | 267 | 457 | 844 |

No route or page scrollbar and no horizontal overflow at any size. A wrapped row is about 62 px at 1366 px wide
and about 32 px at 1536 px and wider.

**Chosen floors:**
- Resources section `lg:min-h-[480px]` (raised from the tentative 440, which would only add 1 wrapped row):
  - row band at 600 px height becomes ≈153 px (2 full wrapped rows, or 4–5 compact rows)
  - headroom at 1366×768 is 41 px
- Infrastructure canvas `lg:min-h-[280px]`, **lowered to 260 px in Task 3** because the Slovak canvas at 1366×768 is 265 px:
  - headroom at 1366×768 is 31 px
  - 1024×768 grows by about 59 px and scrolls
  - 1280/1366×600 grows by about 137 px and scrolls

**Dependencies:** None
**Files:** none in the repo (results go into the Task 4 doc)
**Scope:** XS

## Task 2: Resources floor plus route-frame scroll

**Description:**
- `InventoryShell` gets the optional `surfaceMinHeightClassName` prop. When it is set, it replaces the section's
  `lg:min-h-0`, and the root drops its own `lg:min-h-0`.
- `ResourceInventoryShell.tsx` becomes a wrapper that passes `lg:min-h-[<floor>px]`.
- `ContainedViewportFrame` changes `lg:overflow-hidden` to `lg:overflow-y-auto`.

**Acceptance criteria:**
- [x] Without the prop, `InventoryShell` renders exactly today's classes
- [x] VMware, FlashSystem, IBM Power and Resources ISE pick the floor up through `ResourceInventoryShell`
- [x] The frame scrolls only when the floor does not fit (browser check in Task 4)

**Verification:**
- [x] Tests:
  - `src/shared/components/inventory-shell/InventoryShell.test.tsx` (new): the default classes are unchanged, and the
    prop replaces the section `lg:min-h-0` and drops the root `lg:min-h-0`
  - `ContainedViewportFrame.test.tsx` and `ResourceViewportFrame.test.tsx`: class contract updated to
    `lg:overflow-y-auto`
  - a `ResourceInventoryShell` test: the floor class is applied
  - the related resource page tests via `npx vitest related --run`
- [x] `tsc`, eslint, `git diff --check`

**Dependencies:** Task 1
**Files:**
- `src/shared/components/inventory-shell/InventoryShell.tsx` + new test
- `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx` + test
- `src/shared/components/page/ContainedViewportFrame.tsx` + test
- `src/features/discovery-inventory/resources/components/ResourceViewportFrame.test.tsx`

**Scope:** M. Commit: `fix: keep a usable inventory height on short Resources viewports`

## Task 3: Infrastructure canvas floor plus page-root scroll

**Description:**
- `InfrastructurePage` root adds `lg:overflow-y-auto`; the base `overflow-hidden` stays below lg.
- The workspace `Card` changes `lg:min-h-0` to `lg:min-h-min`.
- The canvas region changes `min-h-0` to `min-h-0 lg:min-h-[<floor>px]`.
- The toolbar is untouched.

**Acceptance criteria:**
- [x] The toolbar still wraps and every control stays visible
- [x] At lg the canvas region is never smaller than the floor; mobile classes are unchanged

**Verification:**
- [x] Tests:
  - `InfrastructureTopologyWorkspace.test.tsx`: card has `lg:min-h-min`, canvas region has `lg:min-h-[<floor>px]`,
    and the mobile `h-dvh` is unchanged
  - `InfrastructurePage.test.tsx`: root has `lg:overflow-y-auto` and keeps `overflow-hidden`
- [x] `tsc`, eslint, `git diff --check`

**Dependencies:** Task 1
**Files:** `InfrastructurePage.tsx` + test, `InfrastructureTopologyWorkspace.tsx` + test
**Scope:** S. Commit: `fix: keep a usable topology canvas height on short Infrastructure viewports`

## Checkpoint A
- [x] Tasks 2–3 focused tests, `tsc`, eslint and `git diff --check` green

---

## Task 4: Browser verification and measurements doc

**Description:** Re-run the Task 1 measurements after the fix at the same sizes, plus the drawer and modal checks.
Record before/after results in `tasks/short-viewport-route-floor-measurements.md`.

| Viewport | Expectation |
|---|---|
| 1280×600, 1366×600 | Resources: card ≥ floor and ≥3 rows reachable without scrolling inside the table; the route scrolls vertically. Infrastructure: canvas ≥ floor; the route scrolls. |
| 1024×768 | Infrastructure: toolbar wrapped, every control visible, canvas ≥ floor, the route scrolls |
| 1366×768, 1920×1080 (normal) | Identical to the baseline: no frame scroll (`scrollHeight == clientHeight`) and the same card/canvas heights |
| 390×844 | Identical to the baseline (only `lg:` classes changed) |
| All | No horizontal overflow; the VM detail drawer opens correctly at 1366×600 |

**Acceptance criteria:** every row in the table above is met, and the results are recorded
- [x] Met. See `tasks/short-viewport-route-floor-measurements.md` (en + sk; commits `94bbf09c`, `d9eca4df`)
**Dependencies:** Tasks 2–3
**Scope:** S. Commit: docs only

## Checkpoint B
- [x] All acceptance criteria met; user review (approved 2026-10-01, accepted as implemented)

## Follow-ups (out of scope, track separately)
- Slovak topology toolbar overlap at about 1366 px: the search and host fields cover the All / Powered on / Powered off toggle (`InfrastructureTopologyToolbar`). This predates the fix.
- `InfrastructureTopologySkeleton` has no floor and is still squeezed on short viewports while loading.
