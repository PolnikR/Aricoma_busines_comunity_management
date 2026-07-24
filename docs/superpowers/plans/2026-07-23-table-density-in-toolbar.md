# Table Density Controls in Table Toolbars - Corrected Plan

> **Goal:** Add density toggle controls to the table-level toolbars where they belong - next to search bars and filter buttons - NOT in the page header.

**Scope:**
1. **VirtualMachinesToolbar** - Add density toggle next to filter/search controls
2. **DataTableToolbar** - Add density toggle for RecoveryApplicationsTable and ProvidersCatalogueTable

**Architecture:**
- Keep TableToolbar simple (page header only, no density)
- Table toolbars manage density state and pass to their respective tables
- Density toggle appears where table controls are (filter, search, pagination)

---

## Task 1: Add Density to VirtualMachinesToolbar

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.tsx`
- Modify: VirtualMachinesPage to manage density state and pass to toolbar

**Steps:**
1. Add density state to VirtualMachinesPage
2. Pass density to VirtualMachinesToolbar
3. Add density prop to VirtualMachinesToolbar interface
4. Render RowDensityToggle in the toolbar's right-side actions
5. Test and commit

---

## Task 2: Add Density to DataTableToolbar

**Files:**
- Modify: `src/shared/components/data-table/DataTableToolbar.tsx`

**Steps:**
1. Verify DataTableToolbar already has access to density via useTableState
2. Add RowDensityToggle next to search/filter controls
3. Test and commit

---

## Task 3: Verify Integration

- [ ] VirtualMachinesPage: density toggle in table toolbar, controls table rows
- [ ] RecoveryApplicationsPage: density toggle in DataTableToolbar, controls table rows
- [ ] ProvidersPage: density toggle in DataTableToolbar, controls table rows
