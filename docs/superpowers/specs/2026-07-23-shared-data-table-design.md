# Design: Shared Data-Table Toolkit ("etalon")

## Overview
Lift the Virtual Machines inventory table's design into a generic, reusable set
of shared components so any tab can display tabular data with the same look and
behaviour. The VM table is the **etalon** (reference standard) and stays exactly
as it is today — untouched. The shared toolkit is a design copy of it, decoupled
from VM-specific data. Providers adopts the toolkit now; future tabs use it going
forward. Intentional duplication between the VM table and the shared toolkit is
accepted: VM remains the reference.

## Architecture Decisions
- **VM table is not migrated.** It is the etalon and must remain byte-for-byte
  functional (URL-state filters, detail drawer, metrics, density, 73 passing
  tests). The toolkit is modelled on it, not carved out of it.
- **Composable, controlled toolkit** (not one batteries-included component):
  `DataTable` + `DataTableToolbar` + `DataTablePagination` + optional
  `useTableState`. State lives in the feature (client-side hook or URL-state);
  the components are presentational/controlled. This is what lets simple tabs
  (Providers, client-side) and complex tabs (URL-state) share the same pieces.
- **Declarative columns** via a `ColumnDef<T>[]` array with a `cell` render
  function — the standard, type-safe pattern.
- **Density is a standard, opt-in toolkit feature** (toggle in the toolbar, row
  padding in the table). Tables that omit the density props simply don't show
  the toggle.
- **Location:** `src/shared/components/data-table/`, alongside the existing
  low-level `table/` primitives (which `DataTable` builds on).

## Components

### `DataTable<T>`
Presentational dense table lifted from `VirtualMachinesTable`. No data fetching,
no filtering.

```ts
interface ColumnDef<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'          // right => tabular-nums
  hideInCompact?: boolean           // e.g. a secondary sub-line
  cellClassName?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  density?: 'comfortable' | 'compact'   // default 'compact'
  onRowClick?: (row: T) => void
  selectedRowKey?: string | null
  minWidthClassName?: string            // e.g. "min-w-295"
  emptyContent?: ReactNode
}
```
Behaviour: compact/comfortable row padding, uppercase hairline headers, hover,
row-selection highlight (left accent), horizontal scroll container. Keyboard: a
clickable row is focusable and activates on Enter/Space.

### `DataTableToolbar`
The VM toolbar chrome, controlled.

```ts
interface Segment { label: string; value: string }

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  segments?: Segment[]
  segmentValue?: string
  onSegmentChange?: (value: string) => void
  filterPanel?: ReactNode           // feature-provided modal body
  activeFilterCount?: number
  onApplyFilters?: () => void
  onClearFilters?: () => void
  density?: 'comfortable' | 'compact'
  onDensityChange?: (density: 'comfortable' | 'compact') => void
}
```
Renders: search input (left); optional segmented tabs and a "Filters" button
(right) that opens a modal whose body is `filterPanel`, with a shared
Cancel / Clear / Apply footer; optional density toggle. The feature owns any
temp filter state inside `filterPanel`.

### `DataTablePagination`
Lifted from `VirtualMachinesPagination`, controlled.

```ts
interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]        // default [10, 25, 50]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}
```
Renders "Showing X–Y of Z" + rows `Select` + shared `Pagination`.

### `useTableState<T>` (optional)
Client-side glue for simple tabs.

```ts
function useTableState<T>(rows: T[], options: {
  searchFields: (keyof T)[]
  initialPageSize?: number
  predicate?: (row: T) => boolean   // extra categorical filter (e.g. type)
}): {
  search: string; setSearch: (v: string) => void
  page: number; setPage: (n: number) => void
  pageSize: number; setPageSize: (n: number) => void
  density: 'comfortable' | 'compact'; setDensity: (d) => void
  filtered: T[]; pageItems: T[]; pageCount: number; total: number
}
```
Changing search/predicate/pageSize resets to page 1. Features needing URL-state
skip this hook and drive the controlled components directly.

### `StateCell` (shared helper)
The colored status dot + label used for on/warn/off states, so recurring status
columns render consistently.

## Data Flow
Feature owns state → passes rows + column defs to `DataTable`, controlled props
to `DataTableToolbar` / `DataTablePagination`. `useTableState` is the default
state source for client-side tabs.

## Migration
- **VM:** no change.
- **Providers:** re-implement `ProvidersCatalogueTable` on the toolkit —
  `useTableState` (searchFields `['name']`, predicate for `type`), `DataTable`
  columns (Provider name+id, Description, Type badge, IP address),
  `DataTableToolbar` (type segments + type `filterPanel` + density toggle),
  `DataTablePagination`. Remove the bespoke `ProvidersToolbar` once replaced.

## Error / Loading / Empty States
Owned by the feature container (as today): show a loading line/skeleton, an
error box, and pass `emptyContent` to `DataTable` for the no-rows case.

## Testing
- Unit-test `useTableState`: search filters, predicate, pagination math, page
  reset on filter change (vitest, same style as existing api tests).
- Keep the full suite green (73 tests). VM tests unaffected since VM is untouched.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Toolkit API doesn't fit a future complex tab | Med | Controlled + composable; proven first on Providers, VM stays as the reference to model against |
| Duplication drift between VM etalon and toolkit | Low | Accepted by design; toolkit is the forward path, VM can adopt later if desired |
| Providers regression during re-implementation | Low | Same visible behaviour; verify build/lint and manual check |

## Open Questions
None outstanding — density = standard opt-in, adopt in Providers now, Test
branch only.
