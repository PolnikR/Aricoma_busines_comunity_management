# Implementation Plan: Dynamic-Data-Only Loading Skeletons

## Overview

Change API loading states so that skeleton placeholders replace only values that
depend on remote data. Static page headings, descriptions, card labels, table
column names, tabs, and controls remain rendered during the initial request.
Controls whose valid options depend on the response remain visible but disabled.
Background refreshes keep the last successful data visible and use the existing
fetching indication instead of returning to an initial skeleton.

The work is split into two delivery stages. Stage 1 establishes the shared table
and metric contracts and migrates the high-volume consumers. Stage 2 handles
specialized loading layouts: topology, whole-page editors/details, sidebars, and
the non-table Identity & Access sections.

## Scope Boundaries

### In scope

- Initial loading states for API-backed tables, metrics, details, editors,
  topology, and list/sidebar data.
- Static text and structure that can be known before an API response.
- Disabled presentation for controls that cannot safely operate without data.
- Focused component/page tests for loading, success, error, empty, and cached
  background-refresh transitions.
- Accessible busy states scoped to the dynamic region.

### Out of scope

- `RouteLoadingSkeleton`, because it represents lazy JavaScript route loading;
  the route component and its static content may not exist yet.
- Mutation feedback for save, delete, rollback, connection tests, and similar
  actions. Existing button spinners and loading labels remain unchanged.
- API clients, query keys, generated OpenAPI code, backend behavior, and caching
  policy changes.
- Unrelated visual redesign or shared table refactoring beyond loading support.

## Confirmed Behavior

- Static copy never becomes an anonymous pulse block during an API request.
- Table toolbars and translated column headers remain visible on initial load.
- Only table body cells containing remote values use skeleton blocks.
- Pagination remains mounted; response-derived counts/page bounds use loading
  placeholders and navigation is disabled until those values are known.
- Metric cards retain their icon, label, and static helper copy; only values or
  genuinely response-derived helper fragments are skeletonized.
- Controls remain usable if their behavior is local and independent of data.
  Controls requiring API-derived options or selected entities remain visible but
  disabled and expose the same accessible label as in the loaded state.
- Initial request errors replace only the dynamic data region. Static page chrome
  remains present together with retry UI.
- Background fetching with cached data never replaces values with skeletons.
- Each loading region has one `aria-busy="true"`/status announcement; decorative
  skeleton blocks remain hidden from assistive technology.

## Architecture Decisions

- Extend the real `DataTable` rendering path with a loading-row mode driven by
  the existing `ColumnDef` list. This preserves actual headers and avoids asking
  a separate skeleton to duplicate column structure.
- Keep `DataTableSkeleton` temporarily for lazy-route and transitional consumers,
  but stop using its full-shell mode for migrated API tables. Do not remove it
  until every valid non-route consumer has migrated and its remaining ownership
  is clear.
- Add a value-level loading contract to `StatCard` rather than teaching the
  generic `MetricsSkeleton` about feature-specific labels and icons.
- Keep loading-state ownership at the component that owns the query/result. A
  shared primitive renders placeholders; it must not infer query state.
- Preserve component trees across loading/success where practical. This reduces
  layout shift and prevents toolbar/search state from being remounted.
- Treat error and empty-success as separate data-region states. Loading changes
  must not turn a failed request into an empty table or blank editor.

## Dependency Graph

```text
Stage 1

Shared DataTable loading-row contract (#1)
  |-- provider and credential tables (#2)
  |-- platform provider table (#3)
  |-- recovery policy tables (#4, #5)
  |-- recovery list tables (#6a, #6b, #6c)
  `-- inventory and Identity table consumers (#7a, #7b)

Shared StatCard value-loading contract (#8)
  |-- VMware metrics (#9)
  `-- FlashSystem and IBM Power metrics (#10a, #10b)

Stage 1 checkpoint
        |
        v
Stage 2

Topology dynamic canvas (#11)
Whole-page detail/editor shells (#12, #13, #14)
Recovery builder/list loading regions (#15a, #15b)
Identity non-table sections (#16, #17)
        |
        v
Final accessibility and transition audit (#18)
```

Tasks #2-#7 can proceed independently after #1. Tasks #9 and #10 can proceed
independently after #8. Stage 2 starts after the shared Stage 1 contracts are
stable so specialized screens reuse the same semantics where applicable.

## Stage 1: Tables and Metrics Through Shared Components

### Task 1: Add value-only loading rows to DataTable

**Description:** Extend `DataTable` with a small loading API that keeps real
column headers and table layout mounted while rendering deterministic skeleton
cells in the body. Keep the existing loaded and empty APIs backward compatible.

**Acceptance criteria:**
- [ ] `DataTable` renders translated `column.header` values during loading and
      skeleton blocks only inside body cells.
- [ ] Loading rows respect visible columns, density, fit/scroll layout, and expose
      one accessible busy state without focusable placeholder rows.
- [ ] Existing consumers that do not pass loading props behave identically.

**Verification:**
- [ ] Focused tests cover default/configured row counts, compact-hidden columns,
      accessibility, and transition to loaded/empty rows.
- [ ] Run `npm exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx`.
- [ ] Run focused ESLint for changed shared table files.

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/data-table/DataTable.tsx`
- `src/shared/components/data-table/DataTable.test.tsx`
- `src/shared/components/data-table/DataTableSkeleton.tsx`
- `src/shared/components/data-table/DataTableSkeleton.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 2: Migrate provider catalogue and credentials tables

**Description:** Keep each table's real toolbar and headers mounted while provider
or credential data loads. Disable only actions/search behavior that requires a
loaded collection, and render loading rows through Task 1.

**Acceptance criteria:**
- [ ] Provider and credential loading states show real toolbars and column names.
- [ ] Only response-backed rows/counts are skeletonized; loaded, empty, error,
      selection, edit, and delete flows remain unchanged.
- [ ] Cached background refresh retains existing rows.

**Verification:**
- [ ] Run the focused `ProvidersCatalogueTable` and `CredentialsTable` tests.
- [ ] Add assertions for static copy during loading and cached-data refresh.
- [ ] Run focused ESLint for the four changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 3: Migrate the platform providers table

**Description:** Adopt value-only table loading for platform providers while
preserving the page header, create action, table toolbar, and static headers.

**Acceptance criteria:**
- [ ] Initial loading keeps all platform-provider static UI visible.
- [ ] API-derived rows and counts alone use loading placeholders.
- [ ] SMTP actions, error/retry, empty, and loaded states are unaffected.

**Verification:**
- [ ] Run `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`.
- [ ] Run focused ESLint for the changed component and tests.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- `src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`

**Estimated scope:** Medium (3 files)

### Task 4: Migrate policy sets and application recovery policies

**Description:** Replace full-shell table skeleton branches with mounted toolbars,
real headers, and value-only rows for policy sets and application recovery
policies.

**Acceptance criteria:**
- [ ] Both tables keep search, filters/density, and column labels visible during
      initial loading.
- [ ] Filter options that depend on API results remain visible but disabled until
      available.
- [ ] Error, retry, empty, JSON, edit, and delete behavior remains unchanged.

**Verification:**
- [ ] Run the focused `PolicySetsTable` and `RecoveryAppPoliciesTable` tests.
- [ ] Assert loading visibility of static headers and disabled dependent controls.
- [ ] Run focused ESLint for the four changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 5: Migrate snapshot and clean-room policy tables

**Description:** Apply the same table loading contract to snapshot and clean-room
policy lists without changing their feature-specific filters or actions.

**Acceptance criteria:**
- [ ] Both policy tables retain real toolbar and column text while loading.
- [ ] Only API-backed row values and pagination values are skeletonized.
- [ ] Existing error, retry, empty, edit, delete, and JSON behavior remains green.

**Verification:**
- [ ] Run the focused `SnapshotPoliciesTable` and `CleanRoomPoliciesTable` tests.
- [ ] Add loading-state assertions for static labels and body skeletons.
- [ ] Run focused ESLint for the four changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 6a: Migrate the Recovery Applications list

**Description:** Keep the list page header, primary action, toolbar, and table
headers mounted while application records load; skeletonize only rows/counts.

**Acceptance criteria:**
- [ ] Static list content remains visible during initial loading.
- [ ] Only application rows/counts use placeholders.
- [ ] Error, empty, detail, delete, and cached-refresh behavior is unchanged.

**Verification:**
- [ ] Run the focused `RecoveryApplicationsListPage` tests.
- [ ] Run focused ESLint for the page and test.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx`

**Estimated scope:** Small (2 files)

### Task 6b: Migrate the Recovery Groups list

**Description:** Keep the list page/card structure and real column labels mounted
while group records load; skeletonize only rows/counts.

**Acceptance criteria:**
- [ ] Static list content remains visible during initial loading.
- [ ] Only group rows/counts use placeholders.
- [ ] Error, empty, detail, delete, rollback, and cached-refresh behavior is unchanged.

**Verification:**
- [ ] Run the focused `RecoveryGroupsListPage` tests.
- [ ] Run focused ESLint for the page and test.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx`

**Estimated scope:** Small (2 files)

### Task 6c: Migrate the Recovery Runs table

**Description:** Keep the real run-search toolbar and table headers mounted while
entities load; skeletonize only run rows/counts.

**Acceptance criteria:**
- [ ] Search and static column labels remain visible during initial loading.
- [ ] Only run data uses placeholders.
- [ ] Error, empty, selection, history, and cached-refresh behavior is unchanged.

**Verification:**
- [ ] Run the focused `RecoveryRunsTable` and `RecoveryRunsPage` tests.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`
- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`

**Estimated scope:** Medium (3 files)

### Task 7a: Migrate VM inventory and snapshot tables

**Description:** Apply value-only loading rows to VM inventory and VM snapshot
details while retaining their real column labels, tabs, and panel shells.

**Acceptance criteria:**
- [ ] VM inventory and snapshot headers remain visible while data loads.
- [ ] Only response-backed cells use placeholders.
- [ ] Error, empty, retry, selection, and detail behavior is unchanged.

**Verification:**
- [ ] Run focused `VirtualMachinesTable` and `VirtualMachineDetailPanel` tests.
- [ ] Run focused ESLint for the four changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 7b: Migrate Permissions and Realm Roles tables

**Description:** Keep Identity table panel chrome, toolbars, and column labels
mounted while role/permission records load.

**Acceptance criteria:**
- [ ] Static Identity table content remains visible during initial loading.
- [ ] Only response-backed rows use placeholders and dependent actions are disabled.
- [ ] Error, empty, selection, and detail behavior is unchanged.

**Verification:**
- [ ] Run focused `PermissionsSection` and `RealmRolesSection` tests.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/identity-access/components/PermissionsSection.tsx`
- `src/features/platform-administration/identity-access/components/PermissionsSection.test.tsx`
- `src/features/platform-administration/identity-access/components/RealmRolesSection.tsx`
- `src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 8: Add value-level loading to StatCard

**Description:** Add a loading state that preserves the supplied icon, label, and
static helper content while replacing only the metric value and explicitly marked
dynamic helper fragments.

**Acceptance criteria:**
- [ ] A loading `StatCard` renders its real icon and label with a value skeleton.
- [ ] The component's loaded API and visual sizing remain backward compatible.
- [ ] The busy state is accessible and the pulse block is decorative.

**Verification:**
- [ ] Run `npm exec vitest run src/shared/components/stat-card/StatCard.test.tsx`.
- [ ] Test loading with and without helper content and transition to a value.
- [ ] Run focused ESLint for the component and test.

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/stat-card/StatCard.tsx`
- `src/shared/components/stat-card/StatCard.test.tsx`

**Estimated scope:** Small (2 files)

### Task 9: Migrate VMware metrics

**Description:** Render the real VMware metric-card definitions during provider
and inventory loading and mark only their remote values as loading.

**Acceptance criteria:**
- [ ] VMware metric icons and translated labels remain visible during initial load.
- [ ] Values derived from inventory use skeletons until available.
- [ ] Error/no-provider and loaded metric behavior remains unchanged.

**Verification:**
- [ ] Run focused `VmwareResourcesPage` and `VirtualMachineMetrics` tests.
- [ ] Verify initial load and cached background refresh separately.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 10a: Migrate FlashSystem metrics

**Description:** Keep the real FlashSystem metric definitions mounted while its
inventory query is pending.

**Acceptance criteria:**
- [ ] FlashSystem metric labels/icons remain visible during initial loading.
- [ ] Only inventory-derived values/helpers use placeholders.
- [ ] Partial failure, no-provider, error, loaded, and cached refresh are unchanged.

**Verification:**
- [ ] Run focused FlashSystem resource-page and source-metric tests for both roles.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.tsx`
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`

**Estimated scope:** Medium (5 files)

### Task 10b: Migrate IBM Power metrics

**Description:** Reuse the source-metric loading contract for IBM Power while its
inventory query is pending.

**Acceptance criteria:**
- [ ] IBM Power metric labels/icons remain visible during initial loading.
- [ ] Only inventory-derived values/helpers use placeholders.
- [ ] Partial failure, no-provider, error, loaded, and cached refresh are unchanged.

**Verification:**
- [ ] Run focused IBM Power resource-page and source-metric tests for both roles.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Tasks 8 and 10a

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`

**Estimated scope:** Medium (3 files)

## Checkpoint: Stage 1 Complete

- [ ] Tasks 1-5, 6a-6c, 7a-7b, 8-9, and 10a-10b focused Vitest files pass together.
- [ ] Static toolbar copy, column labels, metric icons, and metric labels are
      present in every migrated initial-loading test.
- [ ] Background refresh tests prove cached rows/values do not revert to skeletons.
- [ ] Error and successful-empty states remain distinguishable.
- [ ] Changed TS/TSX files pass focused ESLint with zero warnings.
- [ ] `npm run typecheck` passes because shared component contracts changed.
- [ ] Browser checks at 320, 768, 1024, and 1440 px show no material loading-to-
      loaded layout shift for one representative table and each metric family.
- [ ] Each task/sub-slice is committed atomically before Stage 2 begins.

## Stage 2: Specialized Screens and Individual Loading States

### Task 11: Preserve infrastructure topology chrome during loading

**Description:** Keep the real page toolbar, source selector, topology controls,
legend labels, and surrounding canvas shell visible. Restrict skeleton treatment
to API-derived topology nodes/edges and response-backed counts.

**Acceptance criteria:**
- [ ] Static topology controls and legend text remain visible during provider and
      topology requests.
- [ ] Controls requiring provider/topology data remain visible but disabled.
- [ ] Loading, provider error, topology error, no-provider, empty, and loaded
      canvas states remain distinct.

**Verification:**
- [ ] Run focused `InfrastructurePage` and `InfrastructureTopologySkeleton` tests.
- [ ] Verify provider loading and selected-provider topology loading separately.
- [ ] Manually compare initial and loaded canvas dimensions at mobile/desktop.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.test.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 12: Preserve the provider detail shell during loading

**Description:** Remove the whole-page loading early return. Always render the
static provider detail header, description, back action, section labels, and card
structure; skeletonize only provider values.

**Acceptance criteria:**
- [ ] Static detail header/back action and property labels remain visible while
      providers load.
- [ ] Provider-derived title, badges, and property values use appropriately sized
      placeholders.
- [ ] Error, missing-provider, and loaded branches preserve existing behavior.

**Verification:**
- [ ] Run `npm exec vitest run src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx`.
- [ ] Assert loading, error, missing, and loaded states independently.
- [ ] Run focused ESLint for the page and test.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx`

**Estimated scope:** Small (2 files)

### Task 13: Preserve the recovery application editor shell

**Description:** Replace the editor's whole-page loading return with a mounted
page header and form/wizard structure whose API-derived initial values and
dependent selections use localized loading placeholders.

**Acceptance criteria:**
- [ ] Editor title, description, navigation, step labels, and field labels remain
      visible while the application loads.
- [ ] Data-backed field values/options are skeletonized or disabled without
      presenting editable false defaults.
- [ ] Error, not-found, dirty-state guard, loaded edit, save, and orchestration
      behavior remains unchanged.

**Verification:**
- [ ] Run the focused `RecoveryApplicationEditorPage` and affected builder/form
      tests.
- [ ] Assert no user-editable placeholder defaults are submitted during loading.
- [ ] Run focused ESLint and typecheck for the affected editor contract.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Medium (2-4 files)

### Task 14: Preserve the recovery group editor shell

**Description:** Apply the editor-shell behavior from Task 13 to recovery groups,
keeping known page/wizard copy visible and isolating skeletons to fetched group
values and dependent resource options.

**Acceptance criteria:**
- [ ] Static editor and wizard content remains visible during initial loading.
- [ ] Group-derived values/options are placeholders or disabled until available.
- [ ] Error, missing, dirty-state guard, loaded edit, and save behavior remains
      unchanged.

**Verification:**
- [ ] Run the focused `RecoveryGroupEditorPage` and affected builder/step tests.
- [ ] Assert loading data cannot be mistaken for valid empty form state.
- [ ] Run focused ESLint and typecheck for the affected editor contract.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Estimated scope:** Medium (2-4 files)

### Task 15a: Refine recovery builder loading regions

**Description:** Preserve real headings, field labels, and step copy in Recovery
Group builder/type selection while skeletonizing API-backed entries only.

**Acceptance criteria:**
- [ ] Known builder/step labels remain visible while collections load.
- [ ] API-backed entries alone use placeholders and selection stays disabled.
- [ ] Empty-success and request error are not presented as loading.

**Verification:**
- [ ] Run focused `RecoveryGroupBuilderPage` and `RecoveryGroupTypeStep` tests.
- [ ] Run focused ESLint for the four changed files.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 15b: Refine shared resource-sidebar loading regions

**Description:** Keep sidebar title, search/action labels, and container mounted;
use placeholders only for API-backed list entries.

**Acceptance criteria:**
- [ ] Static sidebar content remains visible during loading.
- [ ] Only remote list entries use placeholders and dependent selection is disabled.
- [ ] Error, empty, selected, and loaded list behavior is unchanged.

**Verification:**
- [ ] Run focused `ResourceSidebar` and `ListSkeleton` tests.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/shared/components/resource-sidebar/ResourceSidebar.tsx`
- `src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`
- `src/shared/components/list-skeleton/ListSkeleton.tsx`
- `src/shared/components/list-skeleton/ListSkeleton.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 16: Refine Identity users and clients loading states

**Description:** Keep section headings, descriptions, tabs, toolbar controls, and
known empty-state copy mounted in Users and Clients. Replace only remote records,
counts, selected-user values, and API-dependent options.

**Acceptance criteria:**
- [ ] Users and Clients retain static section chrome during initial loading.
- [ ] Response-backed lists/details use placeholders and dependent actions are
      disabled.
- [ ] Error, empty, selection, mutation, and loaded states remain distinct.

**Verification:**
- [ ] Run focused `UsersSection` and `ClientsSection` tests.
- [ ] Add initial-loading and cached-refresh assertions.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/platform-administration/identity-access/components/UsersSection.tsx`
- `src/features/platform-administration/identity-access/components/UsersSection.test.tsx`
- `src/features/platform-administration/identity-access/components/ClientsSection.tsx`
- `src/features/platform-administration/identity-access/components/ClientsSection.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 17: Refine Identity realm and authentication loading states

**Description:** Replace loading-specific empty states in realm settings and
authentication with their real section/card structure and value-level
placeholders.

**Acceptance criteria:**
- [ ] Static realm/authentication labels and descriptions remain visible during
      adapter requests.
- [ ] Only remote settings, required actions, and counts use placeholders.
- [ ] Adapter errors, unavailable capabilities, empty-success, and loaded states
      retain their existing meaning.

**Verification:**
- [ ] Run focused `RealmSettingsSection` and `AuthenticationSection` tests.
- [ ] Assert loading is not announced as a successful empty state.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Stage 1 checkpoint

**Files likely touched:**
- `src/features/platform-administration/identity-access/components/RealmSettingsSection.tsx`
- `src/features/platform-administration/identity-access/components/RealmSettingsSection.test.tsx`
- `src/features/platform-administration/identity-access/components/AuthenticationSection.tsx`
- `src/features/platform-administration/identity-access/components/AuthenticationSection.test.tsx`

**Estimated scope:** Medium (4 files)

### Task 18: Complete loading-transition accessibility and visual audit

**Description:** Audit all migrated API read states for consistent busy regions,
static-copy visibility, layout stability, and cached refresh behavior. Remove only
loading helpers/imports made obsolete by Tasks 1-5, 6a-6c, 7a-7b, 8-9,
10a-10b, and 11-17.

**Acceptance criteria:**
- [ ] No migrated initial-loading branch hides known static headings, labels,
      table headers, tabs, or available actions.
- [ ] No migrated background refresh replaces cached content with skeletons.
- [ ] Each dynamic region has a single accessible busy announcement and no
      focusable decorative placeholders.

**Verification:**
- [ ] Search all non-test TSX files for remaining `DataTableSkeleton`,
      `MetricsSkeleton`, `ListSkeleton`, and whole-page `if (isLoading)` branches;
      document why every remaining use is valid.
- [ ] Run all focused tests collected by Tasks 1-5, 6a-6c, 7a-7b, 8-9,
      10a-10b, and 11-17 together, then
      `npm run typecheck`, focused ESLint, and `git diff --check`.
- [ ] Browser-check representative table, metric, topology, editor, sidebar, and
      Identity screens at 320, 768, 1024, and 1440 px with throttled requests.

**Dependencies:** Tasks 11-14, 15a, 15b, 16, and 17

**Files likely touched:**
- only obsolete loading imports/helpers identified by the final audit
- affected focused tests if the audit exposes a missing assertion

**Estimated scope:** Medium (verification plus surgical cleanup)

## Final Checkpoint

- [ ] All task-level acceptance criteria are satisfied.
- [ ] The complete focused Vitest command assembled from affected test files passes.
- [ ] Changed TS/TSX files pass focused ESLint with zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] `git diff --check` and staged-diff inspection pass.
- [ ] Browser/network verification proves static content remains visible during
      delayed initial API responses and cached data remains during refetch.
- [ ] `RouteLoadingSkeleton` and mutation loading indicators remain intentionally
      unchanged.
- [ ] Each implementation task/sub-slice is committed atomically with only its
      in-scope files staged.
- [ ] The complete repository test suite/build is not run by default; run it only
      if a focused check reveals cross-cutting impact or the reviewer requests it.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Shared table change regresses many consumers | High | Backward-compatible props, focused shared tests, then small vertical migrations |
| Static controls imply they are usable before data exists | High | Define API-dependent controls explicitly and keep them visible but disabled |
| Loading placeholders are confused with valid empty data | High | Preserve explicit loading/error/empty/success state ordering in every owner |
| Background refetch causes flicker or loses user input | High | Render cached rows/values whenever present and keep component trees mounted |
| Duplicate screen-reader announcements | Medium | One busy/status owner per dynamic region; decorative blocks are aria-hidden |
| Table headers and loading cells diverge | Medium | Derive loading cells from the real visible `ColumnDef` list |
| Metric helper text mixes static and remote content | Medium | Mark dynamic helper fragments explicitly; keep static copy rendered |
| Specialized screens expand beyond one task | Medium | Stop and split any task exceeding five files into the named vertical sub-slices |
| Route loading is incorrectly treated like API loading | Low | Keep `RouteLoadingSkeleton` explicitly out of scope |

## Open Questions

None. The plan assumes the approved rule applies to all initial API read states,
while route-code loading and mutation feedback remain unchanged.
