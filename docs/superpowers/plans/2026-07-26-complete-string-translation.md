# Complete String Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every hardcoded string (text, label, message, button, placeholder, tooltip, validation error) throughout the React application with t() calls using the existing useTranslation hook, ensuring 100% translation coverage across all three languages (English, Slovak, Czech).

**Architecture:** The LanguageProvider is already configured at the root level in main.tsx. All translation keys are centralized in src/locales/{en,sk,cs}.json. Components already have useTranslation() hooks added in Phase 10. This phase systematically adds missing translation keys and replaces all remaining hardcoded strings.

**Tech Stack:** React, TypeScript, custom useTranslation hook, JSON locale files for en/sk/cs

## Global Constraints

- All hardcoded strings must use t() function
- Translation keys follow dot-notation: `section.subsection.item`
- Keys must exist in ALL THREE locale files (en.json, sk.json, cs.json)
- No fallback to English in code — all keys must be properly translated
- Maintain existing translation key naming conventions
- Build must pass with zero TypeScript errors after each phase

---

## Phase 1: Foundation — Add Missing Translation Keys

### Task 1.1: Add missing button and message translation keys

**Description:** Identify and add missing translation keys for common buttons, messages, and validations used throughout the app. These are keys referenced in code but not yet in locale files.

**Acceptance criteria:**
- [ ] All new keys added to en.json, sk.json, and cs.json
- [ ] Keys follow naming convention: `buttons.*`, `messages.*`, `validation.*`
- [ ] File format valid JSON (verified by attempting to load)
- [ ] No duplicate keys introduced

**Verification:**
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] All keys in code match keys in locale files (grep verification)

**Dependencies:** None

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Small (3 files, JSON additions only)

**Required keys to add:**

```json
{
  "buttons.apply": "Apply",
  "buttons.refresh": "Refresh",
  "buttons.refreshing": "Refreshing",
  "buttons.refreshInventory": "Refresh inventory",
  "buttons.clearAll": "Clear all",
  "buttons.clearFilters": "Clear filters",
  "buttons.add": "Add",
  "buttons.create": "Create",
  "buttons.edit": "Edit",
  "buttons.delete": "Delete",
  "buttons.save": "Save",
  "buttons.cancel": "Cancel",
  "buttons.back": "Back",
  "buttons.close": "Close",
  "buttons.search": "Search",
  "buttons.filter": "Filter",
  "buttons.retry": "Retry",
  
  "messages.noResults": "No results",
  "messages.loading": "Loading",
  "messages.unknownError": "Unknown error",
  "messages.error": "Error",
  "messages.success": "Success",
  "messages.warning": "Warning",
  "messages.noDataAvailable": "No data available",
  "messages.failed": "Failed",
  "messages.deleting": "Deleting…",
  "messages.saving": "Saving…",
  "messages.creating": "Creating…",
  
  "validation.required": "This field is required",
  "validation.invalid": "Invalid input",
  "validation.duplicateId": "This ID already exists",
  
  "pages.recovery.applicationDetails": "Application Details",
  "pages.recovery.latestRequestFailed": "Latest request failed",
  "pages.recovery.showingPrevious": "Showing the previous successful data"
}
```

**Steps:**

- [ ] **Step 1:** Open `src/locales/en.json`
- [ ] **Step 2:** Add all missing keys from the list above to the English locale file
- [ ] **Step 3:** Open `src/locales/sk.json` and translate each key to Slovak
- [ ] **Step 4:** Open `src/locales/cs.json` and translate each key to Czech
- [ ] **Step 5:** Verify JSON syntax in all three files (no trailing commas, proper formatting)
- [ ] **Step 6:** Run `npm run build` and confirm success

---

## Phase 2: Core Feature Areas — Virtual Machines & Infrastructure

### Task 2.1: Translate VirtualMachinesPage strings

**Description:** Add useTranslation hook and replace all hardcoded strings in VirtualMachinesPage.tsx (already has hook, add remaining strings).

**Acceptance criteria:**
- [ ] All hardcoded strings replaced with t() calls
- [ ] All translation keys exist in locale files
- [ ] Component renders without console warnings
- [ ] TypeScript build clean

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: navigate to Virtual Machines page, verify text displays in selected language

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`

**Estimated scope:** Small (1 file)

### Task 2.2: Translate VirtualMachinesToolbar strings

**Description:** Replace all hardcoded strings in toolbar (search placeholder, filter labels, button labels, validation messages).

**Acceptance criteria:**
- [ ] All search placeholders, filter field labels, dropdown options use t()
- [ ] Button labels translate
- [ ] Tooltip text translates
- [ ] Build succeeds

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: open filters, verify all labels and options are translated

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.tsx`

**Estimated scope:** Small (1 file)

### Task 2.3: Translate VirtualMachineDetailPanel strings

**Description:** Replace all hardcoded strings in detail panel (row labels, status labels, empty states, loading messages).

**Acceptance criteria:**
- [ ] All DetailRow labels translate
- [ ] Status badge labels translate
- [ ] Empty state messages translate
- [ ] Loading messages translate

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: select a VM, verify detail panel shows translated text

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.tsx`

**Estimated scope:** Small (1 file)

### Task 2.4: Translate VirtualMachinesTable strings

**Description:** Replace column headers, status badges, and table-specific labels.

**Acceptance criteria:**
- [ ] Column headers translate
- [ ] Status indicators translate
- [ ] Empty content message translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: table displays translated headers

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.tsx`

**Estimated scope:** Small (1 file)

### Task 2.5: Translate VirtualMachineStatusBadge and VirtualMachineMetrics

**Description:** Replace status labels, metric labels, and health indicator strings.

**Acceptance criteria:**
- [ ] All status values translate
- [ ] All metric labels translate
- [ ] No hardcoded strings remain

**Verification:**
- [ ] `npm run build` succeeds

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineStatusBadge.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineMetrics.tsx`

**Estimated scope:** Small (2 files)

### Task 2.6: Translate Infrastructure topology components

**Description:** Replace strings in InfrastructureTopologyToolbar, InfrastructureTopologyLegend, and node tooltip components.

**Acceptance criteria:**
- [ ] All node labels translate
- [ ] Topology legend strings translate
- [ ] Toolbar options translate
- [ ] Tooltip content translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: navigate to Infrastructure page, verify topology labels and legends are translated

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyToolbar.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyLegend.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/ClusterNodeTooltip.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/HostNodeTooltip.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx`

**Estimated scope:** Medium (5 files)

### Checkpoint: After Tasks 2.1-2.6
- [ ] All Virtual Machines and Infrastructure pages fully translated
- [ ] `npm run build` succeeds with zero errors
- [ ] All three languages display correctly for these features

---

## Phase 3: Providers & Connectors Translation

### Task 3.1: Translate ProviderCreateForm strings

**Description:** Replace all form field labels, placeholders, and validation error messages.

**Acceptance criteria:**
- [ ] Field labels use t()
- [ ] Placeholders use t()
- [ ] Validation messages use t()
- [ ] Disabled state text translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: create/edit provider form shows translated labels and placeholders

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`

**Estimated scope:** Small (1 file)

### Task 3.2: Translate ProvidersCreateModal and ProviderConnectionsTable

**Description:** Replace modal titles, button labels, and table strings.

**Acceptance criteria:**
- [ ] Modal titles and footers translate
- [ ] Button labels translate
- [ ] Table headers and content translate
- [ ] Error messages translate

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: open provider modal and connections table, verify all text is translated

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProviderConnectionsTable.tsx`

**Estimated scope:** Small (2 files)

### Task 3.3: Translate ProvidersCatalogueTable strings

**Description:** Replace table headers, detail drawer labels, and action button labels.

**Acceptance criteria:**
- [ ] All column headers translate
- [ ] Detail row labels translate
- [ ] Button labels (Delete, Edit) translate
- [ ] Empty state message translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: providers table shows translated headers and buttons

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`

**Estimated scope:** Small (1 file)

### Task 3.4: Translate ProviderDetailPage strings

**Description:** Replace all page headers, metric labels, status labels, and button labels.

**Acceptance criteria:**
- [ ] Page title and description translate
- [ ] Metric labels translate
- [ ] Status indicators translate
- [ ] Button labels translate

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: provider detail page shows translated content

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`

**Estimated scope:** Small (1 file)

### Checkpoint: After Tasks 3.1-3.4
- [ ] All Providers & Connectors pages fully translated
- [ ] `npm run build` succeeds with zero errors

---

## Phase 4: Recovery Applications Translation

### Task 4.1: Translate RecoveryApplicationsListPage strings

**Description:** Replace page headers, button labels, and state messages (loading, error, empty).

**Acceptance criteria:**
- [ ] Page title, description, eyebrow translate
- [ ] Button labels translate
- [ ] Loading message translates
- [ ] Error message translates
- [ ] Empty state translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: recovery applications list page shows translated text

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`

**Estimated scope:** Small (1 file)

### Task 4.2: Translate RecoveryApplicationsTable strings

**Description:** Replace table headers, status labels, detail drawer labels, and button labels.

**Acceptance criteria:**
- [ ] Column headers translate
- [ ] Status badge labels translate
- [ ] Detail row labels translate
- [ ] Button labels translate
- [ ] JSON viewer modal title translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: table headers and buttons are translated

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`

**Estimated scope:** Small (1 file)

### Task 4.3: Translate RecoveryAppBuilder and form components

**Description:** Replace all form field labels, placeholders, button labels, and instruction text.

**Acceptance criteria:**
- [ ] Form section headers translate
- [ ] Field labels translate
- [ ] Placeholders translate
- [ ] Button labels translate
- [ ] Instruction text translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: builder form shows translated labels and buttons

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx`
- `src/features/recovery-plans/recovery-applications/components/VMSidebar.tsx`

**Estimated scope:** Medium (5 files)

### Task 4.4: Translate RecoveryApplicationBuilderPage and EditorPage

**Description:** Replace page headers, button labels, and state messages.

**Acceptance criteria:**
- [ ] Page title and description translate
- [ ] Button labels translate
- [ ] Error and loading messages translate
- [ ] All navigation text translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: builder and editor pages show translated content

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/components/DeleteConfirmationDialog.tsx`

**Estimated scope:** Small (3 files)

### Checkpoint: After Tasks 4.1-4.4
- [ ] All Recovery Applications pages fully translated
- [ ] `npm run build` succeeds with zero errors

---

## Phase 5: Shared Components and Utilities

### Task 5.1: Translate shared component strings

**Description:** Replace hardcoded strings in DataTable pagination, empty states, error alerts, modals, and other shared UI components.

**Acceptance criteria:**
- [ ] Empty state messages translate
- [ ] Error alert messages translate
- [ ] Pagination labels translate
- [ ] Modal titles and messages translate
- [ ] Button labels in shared components translate

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: verify shared components display translated text

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/shared/components/empty-state/EmptyState.tsx`
- `src/shared/components/fetch-error-alert/FetchErrorAlert.tsx`
- `src/shared/components/data-table/DataTable.tsx`
- `src/shared/components/data-table/DataTablePagination.tsx`
- `src/shared/components/modal/Modal.tsx`
- `src/shared/components/modal/ConfirmDialog.tsx`
- Other shared component files with user-facing strings

**Estimated scope:** Medium (6+ files)

### Task 5.2: Translate app layout and navigation

**Description:** Replace sidebar menu labels, breadcrumbs, and navigation text (already partially done in earlier phases).

**Acceptance criteria:**
- [ ] All nav items already translated via locale keys
- [ ] Sidebar titles and labels translate
- [ ] Any remaining hardcoded navigation text translates
- [ ] Command palette or search text translates

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: navigate through menu, verify all items translate

**Dependencies:** Task 1.1

**Files likely touched:**
- `src/layouts/app-shell/AppSidebar.tsx`
- `src/app/header/UserMenu.tsx`
- `src/app/header/AppHeader.tsx`

**Estimated scope:** Small (3 files)

### Checkpoint: After Tasks 5.1-5.2
- [ ] All shared components and layout fully translated
- [ ] `npm run build` succeeds with zero errors
- [ ] Manual check: navigate entire app, no hardcoded strings visible

---

## Phase 6: Verification and Final Testing

### Task 6.1: Full translation verification pass

**Description:** Systematically verify every page and feature has complete translation coverage in all three languages.

**Acceptance criteria:**
- [ ] Navigate to each major page/feature in English, confirm no hardcoded text
- [ ] Switch to Slovak, verify all text translates
- [ ] Switch to Czech, verify all text translates
- [ ] No missing translation keys (no key names visible like "pages.example.title")
- [ ] Placeholder text and tooltips are translated
- [ ] Error messages are translated
- [ ] Validation messages are translated

**Verification:**
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests
- [ ] Manual testing checklist completed

**Dependencies:** Tasks 2.1-5.2 complete

**Files likely touched:** None (verification only)

**Estimated scope:** Verification (no code changes)

**Checklist:**
- [ ] Virtual Machines page — all three languages
- [ ] Infrastructure Topology page — all three languages
- [ ] Providers page — all three languages
- [ ] Provider detail page — all three languages
- [ ] Recovery Applications page — all three languages
- [ ] Create/Edit recovery application — all three languages
- [ ] All modals and dialogs — all three languages
- [ ] All error states — all three languages
- [ ] All empty states — all three languages
- [ ] All loading states — all three languages

### Task 6.2: Test language switching functionality

**Description:** Verify language switching persists across pages and updates all text dynamically.

**Acceptance criteria:**
- [ ] Select language in header menu
- [ ] All page text updates immediately
- [ ] Language preference persists on page reload
- [ ] localStorage correctly stores language choice
- [ ] No console errors during language switching

**Verification:**
- [ ] Run language-switching integration tests: `npm test -- language-switching`
- [ ] Manual check: switch languages multiple times, verify persistence and immediate updates

**Dependencies:** Task 6.1

**Files likely touched:** None (verification only)

**Estimated scope:** Verification (no code changes)

### Task 6.3: Final build and lint verification

**Description:** Run full build and lint to ensure no errors remain.

**Acceptance criteria:**
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` succeeds with zero errors
- [ ] `npm test` passes all test suites
- [ ] No TypeScript compilation errors
- [ ] No ESLint violations

**Verification:**
- [ ] Run `npm run build` — confirm success message
- [ ] Run `npm run lint` — confirm zero issues
- [ ] Run `npm test` — confirm all tests pass

**Dependencies:** Tasks 6.1-6.2

**Files likely touched:** None (verification only)

**Estimated scope:** Verification (no code changes)

### Checkpoint: Complete
- [ ] All hardcoded strings translated
- [ ] All three languages fully supported
- [ ] Build passes with zero errors
- [ ] Tests pass
- [ ] Language switching works correctly
- [ ] Ready for merge

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing translation keys cause undefined references | High | Task 1.1 adds all needed keys upfront; build verification catches missing keys |
| Hardcoded strings scattered across many files | High | Systematic phase-by-phase approach ensures comprehensive coverage |
| Translation inconsistency (different wording for same concept) | Medium | Follow existing locale file patterns; review similar keys for consistency |
| Performance regression from additional t() function calls | Low | t() is a simple object lookup (O(1)); no performance impact expected |
| Test failures from hardcoded strings in test files | Medium | Update test fixtures and mock data as strings are replaced |

---

## Open Questions

- Should validation error messages be hardcoded in form components or come from locale files? (Recommend: locale files for consistency)
- Are there any dynamically generated strings (e.g., from APIs) that should NOT be translated? (Recommend: only translate static UI strings, not data from backend)
- Should component prop types be updated to use translation keys instead of strings? (Recommend: no, components should accept strings; translation happens at call site)

