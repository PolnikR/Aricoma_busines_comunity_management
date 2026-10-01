# TODO: Compact page header (Variant A, global)

Source: `tasks/compact-page-header-plan.md`.

## Rules for every task

- Run `git status --short` before you start. Stage only the files this task owns. Make one commit per task.
- Verify with `npm exec vitest run <the touched test files>`, `npx eslint <the touched files>`, and
  `npx tsc -p tsconfig.app.json --noEmit` whenever a prop type changes.
- When an eyebrow key becomes unused, remove it from `en.json`, `cs.json` and `sk.json`.
  Keep `nav.recovery`: the sidebar still uses it.
- No changes to API, generated code, queries or business logic.

---

## Task 1: Compact `PageHeader` template

**Description:** Rewrite `PageHeader` to the Variant A geometry: no eyebrow rendered, `text-xl leading-9`
title, optional one-line description, and actions on the title row that wrap below `sm`.
`eyebrow` stays as an optional prop that is ignored. `TableToolbar.eyebrow` becomes optional.

**Acceptance criteria:**
- [ ] `PageHeader` renders `h1` + optional `p` + optional actions, and nothing uppercase
- [ ] `description` is optional; the DOM nesting root > text block > h1 is unchanged
- [ ] `TableToolbar` Refresh/Updating come from `common.refresh` / `status.updating`

**Verification:**
- [ ] New `src/shared/components/page/PageHeader.test.tsx`, existing `TableToolbar.test.tsx` green
- [ ] `tsc` clean

**Dependencies:** None
**Files:** `PageHeader.tsx`, `PageHeader.test.tsx` (new), `TableToolbar.tsx`, `TableToolbar.test.tsx`
**Note:** `TableToolbar.test.tsx` renders without the translation mock, so mock `@/hooks/useTranslation` with `@/test-utils/mockUseTranslation` the way the page tests do
**Scope:** S

## Task 2: Remove global search; 56 px top bar and sidebar brand row

**Description:** Delete the search input, the Ctrl K listener and the `header.search` / `header.searchHint` keys.
`AppHeader` and the sidebar brand row go from `h-16 lg:h-[72px]` / `h-[72px]` to `h-14`, so their bottom
borders stay aligned. Add an `AppHeader` test, since none exists.

**Acceptance criteria:**
- [ ] No `input[type=search]` in the top bar; the user menu and the mobile sidebar toggle are still present
- [ ] The header and the sidebar brand row are both `h-14`
- [ ] The search keys are gone from all three locales

**Verification:**
- [ ] New `src/layouts/app-shell/AppHeader.test.tsx`, plus `AppSidebar.test.tsx` and `AppShell.test.tsx` green
- [ ] Locales parse (`node -e JSON.parse`)

**Dependencies:** None
**Files:** `AppHeader.tsx`, `AppHeader.test.tsx` (new), `AppSidebar.tsx`, `src/locales/{en,cs,sk}.json`
**Scope:** M

## Task 3: Skeletons mirror the new geometry

**Description:** In `AppShellSkeleton`, set the header and the brand row to `h-14`, drop the search placeholder,
drop the eyebrow bar, and use a `h-9` title bar with `mb-4`. Apply the same heading change to
`RouteLoadingSkeleton` (table and builder variants).

**Acceptance criteria:**
- [ ] No eyebrow placeholder bar in either skeleton
- [ ] The heading placeholder is the same height as the real `PageHeader` (36 + 20 + 16 px)

**Verification:**
- [ ] `AppShellSkeleton.test.tsx` (update the class assertion at :19) and `RouteLoadingSkeleton.test.tsx` green

**Dependencies:** Task 1, Task 2
**Files:** `AppShellSkeleton.tsx`, `AppShellSkeleton.test.tsx`, `RouteLoadingSkeleton.tsx`, `RouteLoadingSkeleton.test.tsx`
**Scope:** S

## Checkpoint A
- [ ] Tasks 1–3 focused tests green, `tsc` clean
- [ ] Browser (`run` skill, `http://localhost:5173`): Platform providers and Resources at 1366×768 and 1920×1080.
      No clipping, no new page scrollbar, and no jump from skeleton to loaded page
- [ ] Get a review from the user before Phase 2

---

## Task 4: Platform providers and Audit

**Description:** Remove the eyebrow. Title becomes `Platform providers`; the action becomes `Add provider`
(cs `Přidat poskytovatele`, sk `Pridať poskytovateľa`). Remove the eyebrow from Audit.
Remove the orphaned keys `pages.platformProviders.eyebrow` and `audit.accessLogs.page.eyebrow`.

**Acceptance criteria:**
- [ ] Neither page passes `eyebrow`
- [ ] The en/cs/sk strings match the naming table

**Verification:** `PlatformProvidersPage.test.tsx` (update the names at :37, :67, :68), `AuditPage.test.tsx`
**Dependencies:** Task 1
**Files:** `PlatformProvidersPage.tsx` + test, `AuditPage.tsx`, locales
**Scope:** S

## Task 5: Identity & access and Configuration

**Description:** Remove the eyebrows. `identity.page.title` becomes `Identity & access` in en, and cs/sk use the
nav translation (`Identita a přístup` / `Identity a prístupy`). Move Configuration's hardcoded eyebrow and
title to i18n (title only). Check that the two-action row (Add LDAP + Add Kerberos) fits at 1024 px.

**Acceptance criteria:**
- [ ] No hardcoded `Platform Administration` string is left in `ConfigurationPage`
- [ ] `identity.page.eyebrow` is removed

**Verification:** `IdentityAccessPage.test.tsx` (h1 at :64), `ConfigurationPage.test.tsx`
**Dependencies:** Task 1
**Files:** `IdentityAccessPage.tsx` + test, `ConfigurationPage.tsx` + test, locales
**Scope:** M

## Task 6: Providers, Provider detail, Credentials and Discovery settings

**Description:** Remove the eyebrows (`pages.providers.eyebrow` ×4, `credentials.page.eyebrow`,
`pages.discoverySettings.eyebrow`). `Add Provider` becomes `Add provider`.

**Verification:** `ProvidersPage.test.tsx` (:53, :133), `ProviderDetailPage.test.tsx`, Credentials and Discovery settings tests
**Dependencies:** Task 1
**Files:** `ProvidersPage.tsx`, `ProviderDetailPage.tsx`, `CredentialsPage.tsx`, `DiscoverySettingsPage.tsx`, their tests, locales
**Scope:** M

## Task 7: Infrastructure and the Resources pages

**Description:** Remove the eyebrows from `InfrastructurePage` and from the VMware, FlashSystem and IBM Power
resource pages (`pages.infrastructure.eyebrow`, `pages.resourcesIse.eyebrow`, `pages.virtualMachines.eyebrow`).
`Infrastructure Topology` becomes `Infrastructure topology`.

**Verification:** `InfrastructurePage.test.tsx`, `VmwareResourcesPage.test.tsx`, `ResourcesPage.test.tsx`, `ResourcesIsePage.test.tsx`
**Dependencies:** Task 1
**Files:** `InfrastructurePage.tsx`, `VmwareResourcesPage.tsx`, `FlashSystemResourcesPage.tsx`, `IbmPowerResourcesPage.tsx`, locales
**Scope:** M

## Task 8: Recovery apps

**Description:** Remove the eyebrows (`pages.recovery.eyebrow`, `pages.recoveryBuilder.eyebrow`,
`pages.recoveryEditor.eyebrow`). Titles become `Recovery apps`, `Create recovery app` and `Edit recovery app`;
the action becomes `Create app`.

**Verification:** `RecoveryApplicationsListPage.test.tsx` (:159, :160, :203), builder and editor tests
**Dependencies:** Task 1
**Files:** `RecoveryApplicationsListPage.tsx`, `RecoveryApplicationBuilderPage.tsx`, `RecoveryApplicationEditorPage.tsx`, their tests, locales
**Scope:** M

## Task 9: Recovery groups

**Description:** Remove the eyebrows (`pages.recoveryGroups.eyebrow`, `pages.recoveryGroupBuilder.eyebrow`,
`pages.recoveryGroupEditor.eyebrow`, plus the hardcoded eyebrow in `prototype/TopologyPreview.tsx`).
Titles become `Recovery groups`, `Create recovery group` and `Edit recovery group`; the action becomes `Create group`.

**Verification:** `RecoveryGroupsListPage.test.tsx` (:50, :52, :175), builder (:214) and editor (:251) tests
**Dependencies:** Task 1
**Files:** `RecoveryGroupsListPage.tsx`, `RecoveryGroupBuilderPage.tsx`, `RecoveryGroupEditorPage.tsx`, `TopologyPreview.tsx`, tests, locales
**Scope:** M

## Task 10: Recovery policies, Policy sets, Recovery runs, Recovery actions and the module placeholder

**Description:** Remove the eyebrows from `RecoveryPolicyPageShell` and its three pages, `PolicySetsPage`,
`RecoveryRunsPage` (it uses `nav.recovery`, so keep that key), `RecoveryActionsPageShell` and
`ModuleWorkQueuePage`, and remove the eyebrow fields in `modulePageConfigs.ts`. Titles become sentence case.
`Add Clean Room Policy` becomes `Add policy`.

**Verification:** RecoveryPolicyPageShell, the snapshot/app-recovery/clean-room page tests, PolicySets,
RecoveryRuns and ModuleWorkQueuePage tests, `resourcesContainedRoutes.test.tsx`
**Dependencies:** Task 1
**Files:** this task is split as 10a (policies shell + 3 pages) and 10b (policy sets, runs, actions, module placeholder) to stay ≤5 source files each
**Scope:** M + M

## Checkpoint B
- [ ] `grep -rn "eyebrow" src` lists only the two prop definitions
- [ ] Every page test touched in Tasks 4–10 is green

---

## Task 11: Delete the `eyebrow` prop

**Description:** Remove `eyebrow` from `PageHeaderProps` and `TableToolbarProps`, and remove it from the test fixtures
(`TableToolbar.test.tsx`, `ModuleWorkQueuePage.test.tsx`, `RecoveryPolicyPageShell.test.tsx`).

**Acceptance criteria:** `tsc` clean; zero `eyebrow` references in `src` outside the unrelated `IdentityResourceLayout`
**Dependencies:** Tasks 4–10
**Scope:** S

## Task 12: Sidebar nav in sentence case

**Description:** Change the en `nav.*` labels to sentence case so they match the page titles, for example
`Platform providers` and `Recovery apps`. Update `AppSidebar.test.tsx` and `SidebarFlyout.test.tsx`.
**Dependencies:** Task 11
**Scope:** S

## Task 13: Browser fit matrix across monitor sizes

**Description:** Run the app and check one page of each archetype (table: Platform providers, Resources;
workspace: Identity & access; builder: Recovery group create; topology: Infrastructure) at each size below.
Record the y-position where the table starts and whether a scrollbar appears, in
`tasks/compact-page-header-measurements.md`.

| Viewport | Expectation |
|---|---|
| 1280×600 (short) | Page scrolls; the row region keeps its 200 px floor |
| 1366×768 laptop (~600 px usable) | Compare to today; record whether the scrollbar is gone |
| 1536×864 (1920 @125 %) | No page scrollbar |
| 1920×1080 | No page scrollbar; table starts ~42 px higher than today |
| 2560×1440 | No page scrollbar; header row does not stretch oddly |
| 1024×768 | Actions stay on the title row or wrap cleanly; nothing overlaps |
| 390×844 mobile | Actions wrap below the title; sidebar toggle works |

**Acceptance criteria:** no clipping or overlap at any size; skeleton → loaded with no jump; results recorded
**Dependencies:** Tasks 1–11
**Scope:** S (fix-ups become their own tasks)

## Checkpoint C
- [ ] All acceptance criteria met, measurements recorded, focused suites green
- [ ] Ready for review
