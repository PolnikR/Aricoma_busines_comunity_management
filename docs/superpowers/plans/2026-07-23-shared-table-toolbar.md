# Shared Table Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the PageHeader + RowDensityToggle + Refresh logic into a reusable TableToolbar component, then apply it consistently across VirtualMachinesPage, RecoveryApplicationsListPage, and ProvidersPage.

**Architecture:** The TableToolbar component will accept title/description/eyebrow props, a density state and setter, an optional isFetching flag, and an onRefresh callback. This consolidates the header layout, density toggle, and refresh UI into one composable unit that keeps all three pages consistent.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing Button and RowDensityToggle components.

## Global Constraints

- All components use existing design tokens (colors, spacing from `[#...]` palette)
- Density toggle shows `['comfortable', 'compact']` buttons with stateful styling
- Refresh button appears in PageHeader actions slot when onRefresh is provided
- "Updating" indicator appears next to density toggle when isFetching is true
- TableDensity type is `'comfortable' | 'compact'`

---

## Task 1: Create TableToolbar Shared Component

**Description:** Create a new reusable `TableToolbar` component in the shared components directory. This component combines the PageHeader layout, RowDensityToggle, and refresh button UI into a single composable unit. It accepts all required props (title, description, eyebrow, density, onDensityChange, isFetching, onRefresh) and renders them in a consistent layout matching VirtualMachinesPage's current design.

**Files:**
- Create: `src/shared/components/table/TableToolbar.tsx`

**Interfaces:**
- Consumes: `RowDensityToggle` (already created at `src/shared/components/table/RowDensityToggle.tsx`), `PageHeader` (existing), `Button` (existing)
- Produces: `TableToolbar` component with props interface: `{ eyebrow: string; title: string; description: string; density: TableDensity; onDensityChange: (density: TableDensity) => void; isFetching?: boolean; onRefresh?: () => void }`

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/table/TableToolbar.test.tsx` with a test that verifies:
- Component renders PageHeader with provided eyebrow, title, description
- RowDensityToggle is rendered with correct density and onDensityChange callback
- When onRefresh is provided, "Refresh" button appears in PageHeader actions
- When isFetching is true, "Updating" indicator shows next to density toggle

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { TableToolbar } from './TableToolbar'

describe('TableToolbar', () => {
  afterEach(cleanup)

  it('renders PageHeader with title, eyebrow, and description', () => {
    render(
      <TableToolbar
        eyebrow="Test"
        title="Test Title"
        description="Test Description"
        density="compact"
        onDensityChange={vi.fn()}
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('renders RowDensityToggle with correct density', () => {
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

  it('shows Refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn()
    render(
      <TableToolbar
        eyebrow="Test"
        title="Title"
        description="Description"
        density="compact"
        onDensityChange={vi.fn()}
        onRefresh={onRefresh}
      />
    )

    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    expect(refreshBtn).toBeInTheDocument()
    fireEvent.click(refreshBtn)
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows Updating indicator when isFetching is true', () => {
    render(
      <TableToolbar
        eyebrow="Test"
        title="Title"
        description="Description"
        density="compact"
        onDensityChange={vi.fn()}
        isFetching={true}
      />
    )

    expect(screen.getByText('Updating')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/components/table/TableToolbar.test.tsx`
Expected: FAIL with "TableToolbar is not exported" or similar

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/components/table/TableToolbar.tsx`:

```tsx
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'
import { RowDensityToggle } from './RowDensityToggle'
import type { TableDensity } from './types'

interface TableToolbarProps {
  eyebrow: string
  title: string
  description: string
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  isFetching?: boolean
  onRefresh?: () => void
}

export function TableToolbar({
  eyebrow,
  title,
  description,
  density,
  onDensityChange,
  isFetching,
  onRefresh,
}: TableToolbarProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-3">
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          <RowDensityToggle density={density} onDensityChange={onDensityChange} isFetching={isFetching} />
        </div>
      }
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/components/table/TableToolbar.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/table/TableToolbar.tsx src/shared/components/table/TableToolbar.test.tsx
git commit -m "feat: add shared TableToolbar component with density toggle and refresh"
```

---

## Task 2: Update VirtualMachinesPage to use TableToolbar

**Description:** Replace the inline PageHeader + RowDensityToggle code in VirtualMachinesPage with the new TableToolbar component. This removes duplication and establishes the component as the standard for table pages.

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx` (lines 96-139)

**Interfaces:**
- Consumes: `TableToolbar` from `src/shared/components/table/TableToolbar`
- Produces: Simplified VirtualMachinesPage using new component

- [ ] **Step 1: Update imports**

At the top of VirtualMachinesPage.tsx, replace the imports:
```tsx
// Remove: import { PageHeader } from '@/shared/components/page/PageHeader'
// Add:
import { TableToolbar } from '@/shared/components/table/TableToolbar'
```

- [ ] **Step 2: Replace inline UI with component**

Find lines 98-103 (the current PageHeader) and lines 123-138 (density toggle), replace with:

```tsx
<TableToolbar
  eyebrow="Discovery & Inventory"
  title="Virtual machines"
  description="VMware inventory, health and placement overview."
  density={density}
  onDensityChange={setDensity}
  isFetching={isFetching}
  onRefresh={refetch}
/>
```

The full replacement spans from line 98 down through line 139. After replacement, the page structure becomes:
```tsx
<div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
  <TableToolbar {...props} />

  <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
    {/* metrics, card, etc. */}
  </div>

  <VirtualMachineDetailPanel {...props} />
</div>
```

- [ ] **Step 3: Run tests to verify no regression**

Run: `npm test -- VirtualMachinesPage`
Expected: All tests pass (same behavior, different implementation)

- [ ] **Step 4: Manual check**

Start the dev server and navigate to Virtual Machines page. Verify:
- Title, description, and eyebrow render correctly
- Refresh button works (triggers refetch)
- Density toggle switches between comfortable/compact
- "Updating" indicator appears when data is refetching

- [ ] **Step 5: Commit**

```bash
git add src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx
git commit -m "refactor: use shared TableToolbar in VirtualMachinesPage"
```

---

## Task 3: Add density state to RecoveryApplicationsListPage and apply TableToolbar

**Description:** Add local state for `density` to RecoveryApplicationsListPage, ensure RecoveryApplicationsTable supports the density prop, then replace the static PageHeader with the new TableToolbar component. This enables consistent UI and density controls across both pages.

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- Modify: `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx` (verify density support exists)

**Interfaces:**
- Consumes: `TableToolbar` component, existing `RecoveryApplicationsTable` with density prop support
- Produces: RecoveryApplicationsListPage with managed density state and refresh capability

- [ ] **Step 1: Add density state to RecoveryApplicationsListPage**

At the top of the component function, add:
```tsx
const [density, setDensity] = useState<TableDensity>('compact')
```

And add the import:
```tsx
import type { TableDensity } from '@/shared/components/data-table'
```

- [ ] **Step 2: Import TableToolbar**

Add to imports:
```tsx
import { TableToolbar } from '@/shared/components/table/TableToolbar'
```

- [ ] **Step 3: Replace PageHeader with TableToolbar**

Find the current PageHeader (lines 41-50 in loading state, and lines 83-92 in main render). Replace the first occurrence with:

```tsx
<TableToolbar
  eyebrow="Recovery Plans"
  title="Recovery Applications"
  description="Manage disaster recovery application definitions and test recovery workflows."
  density={density}
  onDensityChange={setDensity}
  onRefresh={refetch}
/>
```

For the error state PageHeader (lines 63-67), replace with:
```tsx
<TableToolbar
  eyebrow="Recovery Plans"
  title="Recovery Applications"
  description="Manage disaster recovery application definitions and test recovery workflows."
  density={density}
  onDensityChange={setDensity}
/>
```

- [ ] **Step 4: Pass density to RecoveryApplicationsTable**

Locate where `RecoveryApplicationsTable` is rendered and add the density prop. Based on the DataTable component, the table should already support density; verify that the render call includes: `density={density}`

- [ ] **Step 5: Run tests**

Run: `npm test -- RecoveryApplicationsListPage`
Expected: All tests pass

- [ ] **Step 6: Manual check**

Navigate to Recovery Applications page. Verify:
- Title and description render
- Density toggle switches between comfortable/compact (if table renders; may be empty state)
- Refresh button works (if applicable)

- [ ] **Step 7: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx
git commit -m "feat: add TableToolbar with density control to RecoveryApplicationsListPage"
```

---

## Task 4: Add density state to ProvidersPage and apply TableToolbar

**Description:** Add local state for `density` to ProvidersPage, ensure ProvidersCatalogueTable supports the density prop, then wrap the current layout with the new TableToolbar component. This completes the unification of table pages.

**Files:**
- Modify: `src/features/providers-connectors/pages/ProvidersPage.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` (verify density support exists)

**Interfaces:**
- Consumes: `TableToolbar` component, `ProvidersCatalogueTable` with density prop
- Produces: ProvidersPage with managed density state and refresh capability

- [ ] **Step 1: Add density state to ProvidersPage**

Add to component:
```tsx
const [density, setDensity] = useState<TableDensity>('compact')
const { data: providers = [], isFetching } = useProviders()
```

(Note: Change the existing `useProviders()` call to capture `isFetching`)

And add import:
```tsx
import type { TableDensity } from '@/shared/components/data-table'
```

- [ ] **Step 2: Import TableToolbar**

Add to imports:
```tsx
import { TableToolbar } from '@/shared/components/table/TableToolbar'
```

- [ ] **Step 3: Replace PageHeader + button UI with TableToolbar**

The current structure has PageHeader with an absolute-positioned button (lines 14-25). Replace this with:

```tsx
<TableToolbar
  eyebrow="Providers & Connectors"
  title="Providers"
  description="Registered providers discovered from the backend."
  density={density}
  onDensityChange={setDensity}
  isFetching={isFetching}
  onRefresh={() => { void refetch() }}
/>
```

(Capture the `refetch` function from useProviders hook.)

- [ ] **Step 4: Pass density to ProvidersCatalogueTable**

Update the `ProvidersCatalogueTable` call to include: `density={density}` (or verify it's already wired to the table's state)

- [ ] **Step 5: Run tests**

Run: `npm test -- ProvidersPage`
Expected: All tests pass

- [ ] **Step 6: Manual check**

Navigate to Providers page. Verify:
- Title and description render correctly
- Density toggle switches between comfortable/compact
- "Add Provider" button still works
- Refresh button is present and functional

- [ ] **Step 7: Commit**

```bash
git add src/features/providers-connectors/pages/ProvidersPage.tsx
git commit -m "feat: add TableToolbar with density control to ProvidersPage"
```

---

## Checkpoint: After All Tasks

- [ ] All tests pass: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Manual verification: All three pages (VirtualMachines, RecoveryApplications, Providers) render correctly with:
  - Correct title, description, eyebrow
  - Working density toggle (comfortable/compact buttons)
  - Refresh button that updates data
  - "Updating" indicator when data is fetching
  - Table respects density setting (compact shows fewer columns/spacing, comfortable shows full detail)

---

## Architecture Notes

- **TableToolbar vs RowDensityToggle:** TableToolbar wraps PageHeader + RowDensityToggle. RowDensityToggle is the stateless toggle UI; TableToolbar is the full page header with state integration.
- **Density type:** Imported from `@/shared/components/data-table` (already defined there as `TableDensity = 'comfortable' | 'compact'`).
- **Refresh logic:** Each page manages its own refetch function (from useData hooks). TableToolbar just calls the provided `onRefresh` callback.
- **Optional props:** `isFetching` and `onRefresh` are optional, so TableToolbar can be used on pages that don't have refresh or loading state.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RecoveryApplicationsTable and ProvidersCatalogueTable may not support density prop | Medium | Verify density prop exists and wired before Task 3 & 4; add it if missing |
| Pages using TableToolbar need to manage density state locally | Low | Already established pattern in VirtualMachinesPage; copy exactly |
| Refresh button styling inconsistency across pages | Low | TableToolbar standardizes the layout; all pages inherit the same styling |
| Breaking changes to PageHeader or Button components | Medium | Low risk: only props used are eyebrow, title, description, actions, size, variant, onClick |

---

## Open Questions

- Should RecoveryApplicationsTable and ProvidersCatalogueTable already support density, or will Task 3/4 need to add it?
