# Shared Data Table Loading Skeleton — Implementation Plan

## Goal

Create one shared loading skeleton for the complete table block and use it consistently while loading table data in:

- Virtual Machines
- Providers
- Recovery Applications

Remove the existing feature-specific or text-based table loading UI from these flows.

## Approved design

The shared skeleton represents the whole data-table area, not only body rows:

- table toolbar/search and density controls
- column headers
- table rows
- pagination area

The skeleton must visually follow the existing shared `DataTable` structure so the page does not noticeably jump when real data replaces it.

## Scope

### In scope

- A reusable shared `DataTableSkeleton` component.
- Accessibility state and loading announcement.
- Adoption in VM, Providers, and Recovery Applications table views.
- Removal of obsolete table-loading UI.
- Component and feature-level test updates.

### Out of scope

- Changes to API calls or query logic.
- Changes to table data, columns, filtering, sorting, or pagination behavior.
- Changes to non-table VM skeletons such as metrics or detail panels.
- Recovery Applications tier model changes.

## Task 1 — Add the shared table skeleton

### Files

- Create `src/shared/components/data-table/DataTableSkeleton.tsx`
- Update `src/shared/components/data-table/index.ts`
- Create or update the matching shared component test file according to the repository test naming convention.

### Implementation

Add a typed component with a small, stable API:

```ts
type DataTableSkeletonProps = {
  columnCount: number;
  rowCount?: number;
  ariaLabel?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
};
```

Defaults:

- `rowCount`: 6
- `showToolbar`: true
- `showPagination`: true
- `ariaLabel`: a generic table-loading label

Implementation requirements:

- Reuse the layout, border, background, spacing, and sizing conventions of the shared `DataTable`.
- Render deterministic skeleton widths; do not use random values.
- Keep the skeleton block responsive and preserve horizontal overflow behavior used by the real table.
- Use a private internal skeleton-cell helper rather than importing a VM feature-owned skeleton component.
- Mark the container as busy and expose a concise loading label to assistive technology.
- Mark visual placeholder shapes as decorative.
- Export the component from the existing data-table barrel file.

### Acceptance criteria

- Consumers can render a complete table skeleton with only `columnCount`.
- Optional props correctly control rows, toolbar, and pagination.
- The component has no dependency on a feature directory.
- Skeleton dimensions closely match the real shared table and minimize layout shift.
- The accessible loading state is present exactly once.

### Tests

- Renders the requested number of header cells and rows.
- Uses the default number of rows when `rowCount` is omitted.
- Shows toolbar and pagination by default.
- Hides optional sections when explicitly disabled.
- Exposes `aria-busy` and the supplied accessible label.

## Task 2 — Use the shared skeleton for Virtual Machines

### Files

- Update `src/features/discovery-inventory/virtual-machines/skeletons/VirtualMachinesSkeleton.tsx`
- Update `src/features/discovery-inventory/virtual-machines/skeletons/index.ts`
- Delete `src/features/discovery-inventory/virtual-machines/skeletons/TableSkeleton.tsx`
- Update relevant VM skeleton/page tests.

### Implementation

- Replace the feature-local table skeleton inside `VirtualMachinesSkeleton` with `DataTableSkeleton`.
- Configure `columnCount` to match the visible VM table columns.
- Preserve existing non-table loading placeholders such as metrics and detail-panel skeletons.
- Remove the obsolete feature-local `TableSkeleton` export and file after confirming it has no remaining references.

### Acceptance criteria

- VM loading displays the shared complete table skeleton.
- Existing metrics/detail skeleton behavior remains unchanged.
- No VM code imports or references the deleted `TableSkeleton`.
- Loaded, empty, and error states are unaffected.

### Tests

- VM pending state renders the shared table loading state.
- VM pending state still renders required non-table skeletons.
- The real table replaces the skeleton after loading.

## Task 3 — Use the shared skeleton for Providers

### Files

- Update `src/features/providers-connections/providers/components/ProvidersCatalogueTable.tsx`
- Update the corresponding Providers table/page tests.

### Implementation

- Replace the current text-only `Loading providers…` branch with `DataTableSkeleton`.
- Configure the column count to match the Providers table.
- Keep actions visible outside the loading table exactly as they are now.
- Preserve error and empty-state behavior.

### Acceptance criteria

- Providers loading uses the shared full-table skeleton.
- The old loading text and old loading markup are removed.
- Provider actions are not hidden by this change.
- Success, error, and empty states behave as before.

### Tests

- Loading state renders the shared accessible skeleton.
- The old loading text is absent.
- Loaded provider rows and actions still render.

## Task 4 — Use the shared skeleton for Recovery Applications

### Files

- Update `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- Update relevant Recovery Applications list tests.

### Implementation

- Replace the current early loading UI/text with `DataTableSkeleton`.
- Keep page-level heading and actions visible.
- Place the shared skeleton in the same container used by the loaded Recovery Applications table.
- Configure the column count to match all currently visible application columns, including the actions/JSON column where applicable.
- Do not modify recovery application data mapping or tier handling.

### Acceptance criteria

- Recovery Applications loading displays the shared complete table skeleton.
- Page actions remain visible while data loads.
- The previous loading text/markup is removed.
- Error, retry, empty, and loaded states remain unchanged.

### Tests

- Loading state renders the shared accessible skeleton.
- Page actions remain present during loading.
- Loaded recovery application rows still replace the skeleton.
- Error and retry UI are unaffected.

## Task 5 — Remove stale loading implementations and verify usage

### Files

- Search all files under `src/features` that render the shared `DataTable`.
- Update only VM, Providers, and Recovery Applications as approved.

### Implementation

- Search for old loading strings and feature table skeleton imports.
- Confirm all three approved table flows use `DataTableSkeleton`.
- Confirm no deleted exports or dead imports remain.
- Do not replace loading UI in unrelated tables without separate approval.

### Acceptance criteria

- One shared component owns table skeleton rendering.
- No obsolete VM table skeleton remains.
- No text-only loading UI remains in Providers or Recovery Applications.
- TypeScript reports no missing or unused imports.

## Verification

Run the repository-standard commands discovered from `package.json`, in this order:

1. Focused shared `DataTableSkeleton` tests.
2. Focused VM tests.
3. Focused Providers tests.
4. Focused Recovery Applications tests.
5. Type checking.
6. Linting.
7. Full test suite or the broadest practical frontend test command.
8. Production build.

Manual verification:

- Throttle the three data requests and confirm the skeleton is visible.
- Compare loading and loaded layouts for noticeable height or width jumps.
- Verify compact/comfortable table layouts remain unchanged after loading.
- Verify toolbar and row actions remain available where required.
- Verify loading state is announced once by accessibility tooling.
- Verify error, retry, empty, and success states for all three pages.

## Risks and mitigations

- **Column mismatch:** derive `columnCount` from each table's actual rendered columns during implementation.
- **Layout shift:** mirror the shared table container, toolbar, row heights, and pagination spacing.
- **Duplicate screen-reader announcements:** expose one status label on the outer skeleton and hide placeholder elements.
- **Accidental feature regressions:** change only pending/loading branches and retain current error, empty, and loaded branches.
- **Dirty worktree conflicts:** preserve unrelated user changes and inspect diffs before every edit.

## Completion checkpoint

Before final handoff:

- Review the diff to ensure only skeleton-related files changed.
- Confirm no changes were committed.
- Report created, modified, and deleted files.
- Report exact verification commands and results.

