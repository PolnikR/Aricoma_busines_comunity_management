# Complete Translation Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add translations for all hardcoded UI text across the entire application (buttons, labels, placeholders, empty states, messages) and create comprehensive tests for translated functionality.

**Architecture:** Audit all components for hardcoded strings, define translation keys in en.json/sk.json/cs.json following dot-notation hierarchy (pages.*, tables.*, buttons.*, messages.*), update components to use `useTranslation()` hook, write tests that verify translations render correctly and language switching updates UI.

**Tech Stack:** React 19, TypeScript, React Router, localStorage, existing translation files (en.json, sk.json, cs.json with 300+ keys).

## Global Constraints

- Translation keys use dot-notation: `pages.virtualMachines.title`, `buttons.apply`, `messages.empty`, `messages.loading`
- All hardcoded text in JSX must be replaced with `t('key')` calls
- Components must import and use `useTranslation()` hook from `@/hooks/useTranslation`
- Tests must verify: (1) correct translation key is used, (2) UI updates when language changes, (3) fallback to key if translation missing
- Three language files must have identical key structure (en, sk, cs) with language-specific values
- Build must pass with `npm run build`, tests pass with `npm test`

---

## Phase 1: Audit and Translation Key Definition

### Task 1: Audit Virtual Machines Components

**Files:**
- Read: `src/features/discovery-inventory/virtual-machines/components/*.tsx`
- Read: `src/locales/en.json`

**Interfaces:**
- Produces: List of hardcoded strings and required translation keys (pages.virtualMachines.*)

- [ ] **Step 1: Read VirtualMachinesPage.tsx**

Read `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx` and identify all hardcoded strings:
- Look for text in `<h2>`, `<p>`, button labels, placeholders
- Expected strings: "Inventory records", "Browse and inspect...", filter labels, table headers

- [ ] **Step 2: Read VirtualMachinesToolbar.tsx**

Read `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.tsx` and identify hardcoded strings:
- Expected: "Filters", "Filter Virtual Machines", "Connection", "Cluster", "Provider", "Tag", "Cancel", "Clear all", "Apply", "Search name, hostname or IP"

- [ ] **Step 3: Read VirtualMachinesTable.tsx**

Read `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.tsx` and identify column headers and empty states:
- Expected: Column headers like "Name", "Status", "CPU", "Memory", "Datastore", empty state messages

- [ ] **Step 4: Read VirtualMachineDetailPanel.tsx**

Read `src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.tsx` and identify:
- Labels: "Selected virtual machine", "vCPU", "Memory", "Tags", "Disks", "Snapshots"
- Messages: "No disks available", "Loading snapshots...", "No snapshot data available"

- [ ] **Step 5: Create audit list**

Document findings in text format:
```
VirtualMachinesPage:
- "Inventory records"
- "Browse and inspect discovered VMware resources."

VirtualMachinesToolbar:
- "Filters"
- "Filter Virtual Machines"
- "Connection"
- ... (continue for all found strings)
```

**Acceptance Criteria:**
- [ ] All hardcoded strings in 5 VM-related files identified
- [ ] Strings organized by component
- [ ] Ready to convert to translation keys

**Dependencies:** None

**Estimated scope:** Small (reading only, no code changes)

---

### Task 2: Audit Provider Components

**Files:**
- Read: `src/features/providers-connectors/providers/components/*.tsx`

**Interfaces:**
- Produces: List of hardcoded strings in provider UI

- [ ] **Step 1: Read ProvidersCatalogueTable.tsx, ProviderCreateForm.tsx, ProviderConnectionsTable.tsx**

Identify hardcoded strings in these three files

- [ ] **Step 2: Document findings**

List all found hardcoded strings

**Acceptance Criteria:**
- [ ] All hardcoded strings in provider components identified

**Dependencies:** None

**Estimated scope:** Small (reading only)

---

### Task 3: Audit Infrastructure and Other Components

**Files:**
- Read: `src/features/discovery-inventory/infrastructure/components/*.tsx`
- Read: `src/features/recovery-applications/pages/*.tsx`

**Interfaces:**
- Produces: Complete audit of hardcoded text across all major features

- [ ] **Step 1: Identify strings in infrastructure components**
- [ ] **Step 2: Identify strings in recovery applications**
- [ ] **Step 3: Compile complete audit list**

**Acceptance Criteria:**
- [ ] All major feature areas audited

**Dependencies:** None

**Estimated scope:** Small (reading only)

---

### Task 4: Define Translation Keys and Update JSON Files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`
- Modify: `src/locales/cs.json`

**Interfaces:**
- Consumes: Audit lists from Tasks 1-3
- Produces: Updated translation files with new keys for all hardcoded strings

- [ ] **Step 1: Add Virtual Machines keys to en.json**

Add new keys under `pages.virtualMachines.*` and `buttons.*`, `messages.*` namespaces:

```json
{
  "pages.virtualMachines.title": "Inventory records",
  "pages.virtualMachines.description": "Browse and inspect discovered VMware resources.",
  "pages.virtualMachines.toolbar.filters": "Filters",
  "pages.virtualMachines.toolbar.filterVMs": "Filter Virtual Machines",
  "pages.virtualMachines.toolbar.search": "Search name, hostname or IP",
  "pages.virtualMachines.filters.connection": "Connection",
  "pages.virtualMachines.filters.cluster": "Cluster",
  "pages.virtualMachines.filters.provider": "Provider",
  "pages.virtualMachines.filters.tag": "Tag",
  "buttons.cancel": "Cancel",
  "buttons.clearAll": "Clear all",
  "buttons.apply": "Apply",
  "messages.noDisks": "No disks available",
  "messages.loading": "Loading snapshots...",
  "messages.noSnapshots": "No snapshot data available"
}
```

- [ ] **Step 2: Add Provider keys to en.json**

Add keys under `pages.providers.*`

- [ ] **Step 3: Add Infrastructure keys to en.json**

Add keys under `pages.infrastructure.*`

- [ ] **Step 4: Add Recovery keys to en.json**

Add keys under `pages.recovery.*`

- [ ] **Step 5: Copy keys to sk.json with Slovak translations**

Run: Copy all new keys from en.json to sk.json, translate values to Slovak

- [ ] **Step 6: Copy keys to cs.json with Czech translations**

Run: Copy all new keys from en.json to cs.json, translate values to Czech

- [ ] **Step 7: Verify JSON validity**

Run: `node -e "['en','sk','cs'].forEach(l => console.log(l, ':', Object.keys(require('./src/locales/' + l + '.json')).length, 'keys'))"`

Expected: Each file has 300+ keys (original 303 + new keys)

- [ ] **Step 8: Commit**

```bash
git add src/locales/en.json src/locales/sk.json src/locales/cs.json
git commit -m "feat: add translation keys for all UI components"
```

**Acceptance Criteria:**
- [ ] All hardcoded strings have translation keys
- [ ] All three language files have identical key structure
- [ ] Keys follow dot-notation hierarchy (pages.*, buttons.*, messages.*)
- [ ] JSON files are valid
- [ ] Key count is consistent across all three files

**Dependencies:** Tasks 1-3 (audit lists)

**Estimated scope:** Medium (3 files, 50-100 new keys per file)

---

## Checkpoint: Translation Keys Complete

- [ ] All hardcoded strings identified across codebase
- [ ] Translation keys defined in en.json, sk.json, cs.json
- [ ] JSON files valid, build succeeds
- [ ] Ready to update components

---

## Phase 2: Component Updates by Feature

### Task 5: Update Virtual Machines Components

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.tsx`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.tsx`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.tsx`
- Create: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesPage.test.tsx` (if doesn't exist)
- Create: Test updates for other components

**Interfaces:**
- Consumes: Translation keys from Task 4
- Produces: Components using `useTranslation()` hook, tests verifying translations

- [ ] **Step 1: Add useTranslation to VirtualMachinesPage.tsx**

Import hook: `import { useTranslation } from '@/hooks/useTranslation'`
Call in component: `const { t } = useTranslation()`

- [ ] **Step 2: Replace hardcoded strings in VirtualMachinesPage.tsx**

Replace:
- `"Inventory records"` → `{t('pages.virtualMachines.title')}`
- `"Browse and inspect..."` → `{t('pages.virtualMachines.description')}`

- [ ] **Step 3: Add useTranslation to VirtualMachinesToolbar.tsx**

Same pattern: import, call hook, replace strings

Replacements:
- `"Filters"` → `{t('pages.virtualMachines.toolbar.filters')}`
- `"Filter Virtual Machines"` → `{t('pages.virtualMachines.toolbar.filterVMs')}`
- `"Connection"`, `"Cluster"`, `"Provider"`, `"Tag"` → respective t() calls
- `"Cancel"` → `{t('buttons.cancel')}`
- `"Clear all"` → `{t('buttons.clearAll')}`
- `"Apply"` → `{t('buttons.apply')}`

- [ ] **Step 4: Add useTranslation to VirtualMachinesTable.tsx**

Replace column headers with t() calls

- [ ] **Step 5: Add useTranslation to VirtualMachineDetailPanel.tsx**

Replace:
- `"vCPU"` → `{t('pages.virtualMachines.detail.vcpu')}`
- `"Memory"` → `{t('pages.virtualMachines.detail.memory')}`
- Error/empty messages → respective t() calls

- [ ] **Step 6: Create/update tests for VM components**

Create `VirtualMachinesPage.test.tsx` (if missing) with tests:
```typescript
it('renders translated title', () => {
  render(<VirtualMachinesPage />)
  expect(screen.getByText('Inventory records')).toBeInTheDocument()
})

it('updates text when language changes', async () => {
  // Switch language, verify text updates
})
```

Update existing test files to verify translations.

- [ ] **Step 7: Verify build and tests**

Run:
```bash
npm run build
npm test -- --grep "VirtualMachines"
```

Expected: Build succeeds, tests pass

- [ ] **Step 8: Commit**

```bash
git add src/features/discovery-inventory/virtual-machines/
git commit -m "feat: add translations to virtual machines components and tests"
```

**Acceptance Criteria:**
- [ ] All hardcoded strings replaced with t() calls
- [ ] Components use useTranslation() hook
- [ ] Tests verify translations render correctly
- [ ] Language switching updates all VM component text
- [ ] Build succeeds, tests pass

**Dependencies:** Task 4

**Estimated scope:** Medium (4 files modified, 2 files created/updated with tests)

---

### Task 6: Update Provider Components

**Files:**
- Modify: Provider-related component files (similar pattern to Task 5)
- Create/Update: Provider component tests

**Pattern:** Same as Task 5 - add hook, replace strings, create tests

**Acceptance Criteria:**
- [ ] All provider UI text uses translations
- [ ] Tests verify translations
- [ ] Build succeeds, tests pass

**Dependencies:** Task 4

**Estimated scope:** Medium (3-4 files)

---

### Task 7: Update Infrastructure Components

**Files:**
- Modify: Infrastructure-related components
- Create/Update: Tests

**Pattern:** Same pattern - useTranslation, replace strings, test

**Acceptance Criteria:**
- [ ] All infrastructure UI text uses translations
- [ ] Tests verify translations
- [ ] Build and tests pass

**Dependencies:** Task 4

**Estimated scope:** Medium (3-4 files)

---

### Task 8: Update Recovery Applications Components

**Files:**
- Modify: Recovery application component files
- Create/Update: Tests

**Pattern:** Same pattern

**Acceptance Criteria:**
- [ ] All recovery app UI text uses translations
- [ ] Tests verify translations
- [ ] Build and tests pass

**Dependencies:** Task 4

**Estimated scope:** Medium (3-4 files)

---

## Checkpoint: Component Updates Complete

- [ ] All major feature areas updated with translations
- [ ] Tests created for translated components
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Manual verification: language switching updates all UI text

---

## Phase 3: Final Integration and Testing

### Task 9: Comprehensive Language Switching Test

**Files:**
- Create: `src/__tests__/language-switching.integration.test.tsx`

**Interfaces:**
- Consumes: All translated components
- Produces: Integration test verifying end-to-end language switching

- [ ] **Step 1: Create integration test file**

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import App from '@/app/App'

describe('Language Switching Integration', () => {
  it('switches all UI text when language changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Find a translated element
    expect(screen.getByText('Inventory records')).toBeInTheDocument()
    
    // Click language button to switch
    // Verify all text updates to new language
  })
})
```

- [ ] **Step 2: Run test**

Run: `npm test -- --grep "Language Switching Integration"`

Expected: Test passes, verifies language switching works across entire app

- [ ] **Step 3: Verify no console errors**

Run dev server, check console for missing translation key warnings

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/language-switching.integration.test.tsx
git commit -m "test: add integration test for language switching across all components"
```

**Acceptance Criteria:**
- [ ] Integration test passes
- [ ] No missing translation key errors
- [ ] All UI text updates when language changes
- [ ] Build succeeds

**Dependencies:** Tasks 5-8

**Estimated scope:** Small (1 test file)

---

## Checkpoint: Implementation Complete

- [ ] All hardcoded UI text replaced with translations
- [ ] Tests created for all translated components
- [ ] Integration test verifies end-to-end language switching
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Manual QA: Open app, verify all text, switch languages, verify all text updates

---

## Execution Notes

**Parallel Opportunities:**
- Tasks 5-8 can run in parallel after Task 4 completes (different feature areas)
- Each component update follows identical pattern: audit → replace strings → create tests

**High-Risk Areas:**
- Missing translation keys will cause fallback to key name in UI (caught by tests)
- Language files must maintain identical key structure (verified in Task 4)

**Testing Strategy:**
- Unit tests: Verify each component uses correct translation key
- Integration test: Verify language switching updates entire app
- Manual: Open app in browser, switch languages, verify all visible text updates

