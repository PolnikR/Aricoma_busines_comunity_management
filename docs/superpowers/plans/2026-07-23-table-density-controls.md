# Table Density Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row density toggle controls to the TableToolbar component so users can switch between comfortable and compact row heights from the page header, and wire this to control density in tables across VirtualMachinesPage, RecoveryApplicationsListPage, and ProvidersPage.

**Architecture:** TableToolbar will accept optional `density`, `onDensityChange`, and `isFetching` props. When provided, it renders the RowDensityToggle alongside the Refresh button. Each page manages its own density state and passes it to both TableToolbar and its table component, keeping state in one place and syncing the UI.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing RowDensityToggle component.

## Global Constraints

- TableToolbar accepts optional density-related props (backward compatible with pages that don't use it)
- Density buttons always show ['comfortable', 'compact'] in stateful toggle styling
- "Updating" indicator appears when isFetching is true
- TableDensity type is `'comfortable' | 'compact'`
- Each page manages density state independently (no shared state)
- Density state in TableToolbar and table component must be synchronized (same value)

---

## Task 1: Enhance TableToolbar to Support Density Controls

**Description:** Update the TableToolbar component to accept optional density-related props and render the RowDensityToggle alongside the Refresh button. This makes TableToolbar a full-featured page header that can control table density without breaking existing pages that don't use these props.

**Files:**
- Modify: `src/shared/components/table/TableToolbar.tsx`
- Modify: `src/shared/components/table/TableToolbar.test.tsx`

**Interfaces:**
- Consumes: `RowDensityToggle` component (already exists), `PageHeader`, `Button`
- Produces: TableToolbar component with extended props including optional `density`, `onDensityChange`, `isFetching`

- [ ] **Step 1: Update TableToolbar interface and component**

Add back the density-related props to `TableToolbarProps`:

```tsx
interface TableToolbarProps {
  eyebrow: string
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  // New props for density control:
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
}
```

And update the component to render RowDensityToggle when density props are provided:

```tsx
export function TableToolbar({
  eyebrow,
  title,
  description,
  isFetching = false,
  onRefresh,
  actions,
  density,
  onDensityChange,
}: TableToolbarProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-3">
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-[#71819a]">
              <span className="size-2 animate-pulse rounded-full bg-[#0d91d7]" />
              Updating
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          {density && onDensityChange ? (
            <RowDensityToggle 
              density={density} 
              onDensityChange={onDensityChange} 
              isFetching={isFetching}
            />
          ) : null}
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Add imports to TableToolbar**

At the top, restore the imports:
```tsx
import { RowDensityToggle } from './RowDensityToggle'
import type { TableDensity } from './RowDensityToggle'
```

- [ ] **Step 3: Update TableToolbar tests**

Add test cases for the new density props:

```tsx
it('renders density toggle when density props are provided', () => {
  const onDensityChange = vi.fn()
  render(
    <TableToolbar
      eyebrow="Test"
      title="Title"
      description="Description"
      density="comfortable"
      onDensityChange={onDensityChange}
    />
  )

  const comfortableBtn = screen.getByRole('button', { name: 'comfortable' })
  expect(comfortableBtn).toHaveAttribute('aria-pressed', 'true')
})

it('does not render density toggle when density props are absent', () => {
  render(
    <TableToolbar
      eyebrow="Test"
      title="Title"
      description="Description"
    />
  )

  expect(screen.queryByRole('group', { name: 'Row density' })).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- TableToolbar`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/table/TableToolbar.tsx src/shared/components/table/TableToolbar.test.tsx
git commit -m "feat: add optional density controls to TableToolbar component"
```

---

## Task 2: Add Density State to VirtualMachinesPage and Wire to TableToolbar

**Description:** Add density state management to VirtualMachinesPage and pass it to both TableToolbar (for the page header toggle) and VirtualMachinesTable (for the actual table control). This creates the unified density control experience.

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`

**Interfaces:**
- Consumes: TableToolbar with density props, VirtualMachinesTable with density prop
- Produces: VirtualMachinesPage with managed density state passed to both

- [ ] **Step 1: Add density state to VirtualMachinesPage**

Replace the current `const density: TableDensity = 'compact'` with a stateful version:

```tsx
const [density, setDensity] = useState<TableDensity>('compact')
```

- [ ] **Step 2: Wire density to TableToolbar**

Update the TableToolbar call to include density props:

```tsx
<TableToolbar
  eyebrow="Discovery & Inventory"
  title="Virtual machines"
  description="VMware inventory, health and placement overview."
  isFetching={isFetching}
  onRefresh={refetch}
  density={density}
  onDensityChange={setDensity}
/>
```

- [ ] **Step 3: Verify VirtualMachinesTable gets density**

Confirm the table call already passes density:
```tsx
<VirtualMachinesTable 
  virtualMachines={data.items} 
  selectedId={selectedId} 
  density={density}  // ← should already be here
  onSelect={...} 
/>
```

- [ ] **Step 4: Run tests and linting**

Run: `npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx
git commit -m "feat: add density state to VirtualMachinesPage with TableToolbar integration"
```

---

## Task 3: Add Density State to RecoveryApplicationsListPage and Wire to TableToolbar

**Description:** Add density state management to RecoveryApplicationsListPage. Note: RecoveryApplicationsTable manages its own internal density state via `useTableState` hook, but adding a TableToolbar toggle at the page level creates a unified UI pattern across all pages.

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`

**Interfaces:**
- Consumes: TableToolbar with density props, RecoveryApplicationsTable (manages own density internally)
- Produces: RecoveryApplicationsListPage with density state for page header UI

- [ ] **Step 1: Add density state**

Add to the component:
```tsx
const [density, setDensity] = useState<TableDensity>('compact')
```

And add the import:
```tsx
import type { TableDensity } from '@/shared/components/data-table'
```

- [ ] **Step 2: Update all TableToolbar calls**

Update the three TableToolbar instances (loading, error, main return) to include density props:

Loading state:
```tsx
<TableToolbar
  eyebrow="Recovery Plans"
  title="Recovery Applications"
  description="Manage disaster recovery application definitions and test recovery workflows."
  density={density}
  onDensityChange={setDensity}
  actions={/* Create button */}
/>
```

Error state:
```tsx
<TableToolbar
  eyebrow="Recovery Plans"
  title="Recovery Applications"
  description="Manage disaster recovery application definitions and test recovery workflows."
  density={density}
  onDensityChange={setDensity}
/>
```

Main return:
```tsx
<TableToolbar
  eyebrow="Recovery Plans"
  title="Recovery Applications"
  description="Manage disaster recovery application definitions and test recovery workflows."
  density={density}
  onDensityChange={setDensity}
  isFetching={isFetching}
  onRefresh={() => { void refetch() }}
  actions={/* Create button */}
/>
```

- [ ] **Step 3: Run linting**

Run: `npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx
git commit -m "feat: add density state to RecoveryApplicationsListPage with TableToolbar integration"
```

---

## Task 4: Add Density State to ProvidersPage and Wire to TableToolbar

**Description:** Add density state management to ProvidersPage. Similar to RecoveryApplicationsListPage, ProvidersCatalogueTable manages its own density via `useTableState`, but adding a page-level toggle creates UI consistency.

**Files:**
- Modify: `src/features\providers-connectors\pages\ProvidersPage.tsx`

**Interfaces:**
- Consumes: TableToolbar with density props, ProvidersCatalogueTable (manages own density internally)
- Produces: ProvidersPage with density state for page header UI

- [ ] **Step 1: Add density state**

Add to the component:
```tsx
const [density, setDensity] = useState<TableDensity>('compact')
```

And add the import:
```tsx
import type { TableDensity } from '@/shared/components/data-table'
```

- [ ] **Step 2: Update TableToolbar call**

Update the existing TableToolbar to include density props:

```tsx
<TableToolbar
  eyebrow="Providers & Connectors"
  title="Providers"
  description="Registered providers discovered from the backend."
  density={density}
  onDensityChange={setDensity}
  isFetching={isFetching}
  onRefresh={() => { void refetch() }}
  actions={/* Add Provider button */}
/>
```

- [ ] **Step 3: Run linting**

Run: `npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/providers-connectors/pages/ProvidersPage.tsx
git commit -m "feat: add density state to ProvidersPage with TableToolbar integration"
```

---

## Checkpoint: After All Tasks

- [ ] All tests pass: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] All three pages render correctly with density toggle in TableToolbar
- [ ] Clicking density buttons switches row heights in the table
- [ ] "Updating" indicator shows when data is fetching
- [ ] Refresh button still works
- [ ] Custom actions (Create, Add) still visible and functional

---

## Architecture Notes

- **Backward Compatibility:** Pages that don't pass density props to TableToolbar will still work (density toggle simply won't render)
- **Synchronized State:** Each page manages one density state value passed to both TableToolbar and its table
- **Internal Table State:** RecoveryApplicationsTable and ProvidersCatalogueTable have their own density state via `useTableState`, but the page-level toggle creates a consistent UI pattern
- **Order of Operations:** "Updating" indicator → Custom actions → Refresh button → Density toggle (left to right)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Two density states for RecoveryApplications/Providers (page level + table level) | Medium | Accept for now; can be unified later by making tables controlled. Page-level toggle provides consistent UX. |
| Breaking change if density props made required | Low | Density props are optional; existing usage without them continues to work |
| Test coverage for density | Low | Add test cases in Task 1 to verify toggle rendering |

---

## Open Questions

- None identified. All dependencies clear, tasks well-scoped, approach straightforward.
