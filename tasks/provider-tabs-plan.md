# Implementation Plan: Shared Scrollable Provider Tabs

## Overview

Extend the existing shared tabs component with optional overflow controls and use it to select individual VMware inventory providers. Ten or more provider tabs stay on one line, remain keyboard accessible, and can be reused above other tables.

## Architecture Decisions

- Enhance the existing shared `Tabs` component to avoid duplicate tab semantics and keyboard logic.
- Make arrow controls opt-in so current source, drawer, and recovery-group tabs keep their existing appearance.
- Keep provider selection in the existing `providerId` URL parameter and use the current provider-scoped backend request.
- Remove provider from the filter modal because it becomes source navigation above the table.
- Pass localized arrow labels into the shared component instead of coupling shared UI to the translation hook.

## Task List

### Task 1: Add overflow behavior to shared Tabs

**Description:** Add optional previous/next controls, scroll-boundary detection, active-tab reveal, and full-label tooltips to the existing generic tab component.

**Acceptance criteria:**
- [x] Existing consumers work without changes.
- [x] Overflow controls appear only when required and disable at boundaries.
- [x] Mouse, touch, arrow-button, and keyboard tab navigation remain available.

**Verification:**
- [x] Focused `Tabs` tests pass.
- [x] Typecheck and lint pass.

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/tabs/Tabs.tsx`
- `src/shared/components/tabs/Tabs.test.tsx`

**Estimated scope:** Small

### Task 2: Add VMware provider source tabs

**Description:** Render the shared tab strip above the VM toolbar, connect it to `providerId`, and ensure a valid provider is selected whenever providers are available.

**Acceptance criteria:**
- [x] Ten VMware providers render as ten provider tabs.
- [x] Selecting a provider updates the URL-backed query and loads its inventory.
- [x] Invalid or missing provider selection falls back to the first VMware provider.

**Verification:**
- [x] Focused Resources page tests pass.
- [x] Provider-scoped inventory request behavior remains covered.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Estimated scope:** Medium

### Task 3: Remove duplicate provider filtering and localize controls

**Description:** Remove the provider selector from the VM filter modal and add EN/SK/CZ strings for the provider tablist and its scroll controls.

**Acceptance criteria:**
- [x] Provider selection appears only in the source tabs.
- [x] Search and remaining filters continue to work.
- [x] All new visible and accessible text is translated in EN/SK/CZ.

**Verification:**
- [x] Toolbar tests pass.
- [x] Locale JSON is valid and key sets match.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium

### Checkpoint: Complete

- [x] Focused and discovery-inventory tests pass.
- [x] Typecheck, lint, and production build pass.
- [x] Browser verification passes at 320, 768, 1024, and 1440 pixels.
- [x] No unrelated working-tree changes are modified.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser measurements are unavailable in JSDOM | Medium | Isolate DOM measurement and stub scroll geometry in focused tests. |
| URL without a provider briefly requests aggregate inventory | Medium | Compute the effective first provider before running the query, then canonicalize the URL. |
| Long translated labels crowd the strip | Low | Keep tabs non-wrapping, truncate labels, and expose the full title tooltip. |

## Open Questions

None. The user approved the one-line scrollable variant and requested shared reuse.
