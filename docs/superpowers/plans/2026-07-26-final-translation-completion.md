# Final Translation Completion Plan — 100% Coverage

> **For inline execution:** Follow tasks sequentially, commit after each phase.

**Goal:** Translate ALL remaining hardcoded strings (AppSidebar, table headers, shared components, infrastructure) to achieve 100% translation coverage.

**Scope:** ~50 remaining hardcoded strings across 8-10 components (low text volume, high impact)

**Estimated Time:** 25-30 minutes

---

## Phase 1: Navigation & Layout (5 minutes)

### Task 1.1: Translate AppSidebar menu items

**Files:**
- `src/app/header/AppSidebar.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Steps:**

- [ ] **Step 1:** Open `src/app/header/AppSidebar.tsx`, find all hardcoded menu section titles and item labels
- [ ] **Step 2:** Add missing translation keys to en.json (if not already present):
  ```json
  "sidebar.menu": "Menu",
  "sidebar.administration": "Platform Administration",
  "sidebar.providers": "Providers & Connectors",
  "sidebar.discovery": "Discovery & Inventory",
  "sidebar.storage": "Storage Orchestration",
  "sidebar.vmware": "VMware Orchestration",
  "sidebar.ibm": "IBM PowerVM Orchestration",
  "sidebar.recovery": "Recovery Plans",
  "sidebar.execution": "Execution Engine",
  "sidebar.monitoring": "Monitoring & Audit",
  "sidebar.apis": "Internal Component APIs"
  ```
- [ ] **Step 3:** Translate same keys to sk.json
- [ ] **Step 4:** Translate same keys to cs.json
- [ ] **Step 5:** Update AppSidebar.tsx to use t() calls for all hardcoded strings
- [ ] **Step 6:** Build and verify: `npm run build`

**Acceptance criteria:**
- [ ] No hardcoded menu labels in AppSidebar
- [ ] All menu items use t() calls
- [ ] Keys exist in all 3 locale files
- [ ] Build succeeds

**Estimated scope:** Small (1 file + locale updates)

---

## Phase 2: Table Headers (5 minutes)

### Task 2.1: Translate remaining table column headers

**Files:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Steps:**

- [ ] **Step 1:** Identify hardcoded table headers in VirtualMachinesTable (e.g., "Virtual Machine", "CPU", "Memory", "Status", etc.)
- [ ] **Step 2:** Add keys to en.json:
  ```json
  "table.header.virtualMachine": "Virtual Machine",
  "table.header.cpu": "CPU",
  "table.header.memory": "Memory",
  "table.header.storage": "Storage",
  "table.header.status": "Status",
  "table.header.connections": "Connections",
  "table.header.tags": "Tags"
  ```
- [ ] **Step 3:** Translate to sk.json and cs.json
- [ ] **Step 4:** Update VirtualMachinesTable.tsx to use t() for headers
- [ ] **Step 5:** Update ProvidersCatalogueTable.tsx similarly
- [ ] **Step 6:** Build and verify

**Acceptance criteria:**
- [ ] All table headers use t() calls
- [ ] Keys exist in all locale files
- [ ] Build succeeds

**Estimated scope:** Small (2 files)

---

## Phase 3: Shared Components (10 minutes)

### Task 3.1: Translate EmptyState and error component strings

**Files:**
- `src/shared/components/empty-state/EmptyState.tsx`
- `src/shared/components/fetch-error-alert/FetchErrorAlert.tsx`
- `src/shared/components/data-table/DataTablePagination.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Steps:**

- [ ] **Step 1:** Read EmptyState.tsx - identify any hardcoded default titles/descriptions
- [ ] **Step 2:** Read FetchErrorAlert.tsx - identify hardcoded retry labels, titles
- [ ] **Step 3:** Read DataTablePagination.tsx - identify pagination labels ("Showing", "of", etc.)
- [ ] **Step 4:** Add keys to en.json:
  ```json
  "pagination.showing": "Showing",
  "pagination.of": "of",
  "pagination.page": "Page",
  "empty.default.title": "No data found",
  "empty.default.description": "No items to display",
  "error.default.title": "Error loading data",
  "error.default.description": "An error occurred while loading"
  ```
- [ ] **Step 5:** Translate to sk.json and cs.json
- [ ] **Step 6:** Update components to use these keys where applicable
- [ ] **Step 7:** Build and verify

**Acceptance criteria:**
- [ ] EmptyState strings use t()
- [ ] Error alert strings use t()
- [ ] Pagination labels use t()
- [ ] Build succeeds

**Estimated scope:** Small (3 files)

---

## Phase 4: Infrastructure Components (5 minutes)

### Task 4.1: Translate InfrastructureTopologyToolbar and topology labels

**Files:**
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyToolbar.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyLegend.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Steps:**

- [ ] **Step 1:** Read both topology component files
- [ ] **Step 2:** Identify hardcoded toolbar buttons ("Auto layout", "Refresh", "Reset positions", etc.)
- [ ] **Step 3:** Identify hardcoded legend labels (node type names, colors)
- [ ] **Step 4:** Add keys to en.json:
  ```json
  "topology.autoLayout": "Auto layout",
  "topology.resetPositions": "Reset positions",
  "topology.fitView": "Fit view",
  "topology.refresh": "Refresh",
  "topology.legend.cluster": "Cluster",
  "topology.legend.host": "Host",
  "topology.legend.vm": "Virtual Machine",
  "topology.legend.datastore": "Datastore"
  ```
- [ ] **Step 5:** Translate to sk.json and cs.json
- [ ] **Step 6:** Update components to use t()
- [ ] **Step 7:** Build and verify

**Acceptance criteria:**
- [ ] Topology toolbar buttons use t()
- [ ] Legend labels use t()
- [ ] Build succeeds

**Estimated scope:** Small (2 files)

---

## Phase 5: Modal & Dialog Components (3 minutes)

### Task 5.1: Translate DeleteConfirmationDialog and modals

**Files:**
- `src/features/recovery-plans/recovery-applications/components/DeleteConfirmationDialog.tsx`
- `src/shared/components/modal/ConfirmDialog.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Steps:**

- [ ] **Step 1:** Check for hardcoded button labels in DeleteConfirmationDialog ("Delete", "Cancel")
- [ ] **Step 2:** Check ConfirmDialog for hardcoded labels
- [ ] **Step 3:** Add keys to en.json (if not already present):
  ```json
  "modal.delete.title": "Delete item",
  "modal.delete.confirmLabel": "Delete",
  "modal.delete.cancelLabel": "Cancel"
  ```
- [ ] **Step 4:** Translate to sk.json and cs.json
- [ ] **Step 5:** Update components
- [ ] **Step 6:** Build and verify

**Acceptance criteria:**
- [ ] Modal buttons use t()
- [ ] Delete dialogs fully translated
- [ ] Build succeeds

**Estimated scope:** Small (2 files)

---

## Phase 6: Final Verification (2 minutes)

### Task 6.1: Complete verification and final build

**Steps:**

- [ ] **Step 1:** Run full build: `npm run build`
- [ ] **Step 2:** Check for any remaining hardcoded strings by grepping for quotes in JSX:
  ```bash
  grep -r '"[A-Z][a-zA-Z ]' src/**/*.tsx | grep -v "t(" | head -20
  ```
- [ ] **Step 3:** Verify no TypeScript errors
- [ ] **Step 4:** Spot-check 3-4 pages for language switching (English → Slovak → Czech)
- [ ] **Step 5:** Make final commit

**Acceptance criteria:**
- [ ] Build succeeds with zero errors
- [ ] No obvious hardcoded UI strings visible
- [ ] All 3 languages display correctly
- [ ] Language switching works smoothly

**Estimated scope:** Verification only (no code changes)

---

## Checkpoint: Complete

- [ ] All tasks completed
- [ ] Build passes with zero errors
- [ ] 100% translation coverage achieved
- [ ] All 3 languages fully supported
- [ ] Ready for final commit and merge

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Missing translation key | Check locale files before using in component |
| Hardcoded strings still exist | Final grep verification catches them |
| Build failure | Stop immediately, diagnose, fix before continuing |

---

## Success Criteria

✅ **100% Translation Coverage Achieved When:**
- Every hardcoded string in UI components uses t()
- All 3 locale files (en, sk, cs) are synchronized
- Build passes with zero TypeScript errors
- Manual spot-check shows correct translations in all languages
