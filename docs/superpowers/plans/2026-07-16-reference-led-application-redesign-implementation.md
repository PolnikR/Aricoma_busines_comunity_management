# Implementation Plan: ABCO reference-led application redesign

## Overview

Apply the approved light, reference-led visual system to the current React application without changing its information architecture or data contracts. Work from shared tokens and primitives outward, then convert the shell, route surfaces, and VM workspace, finishing with the pagination race fix and full verification.

## Architecture decisions

- Keep Tailwind CSS v4 and the existing component structure; do not add a UI framework.
- Make global tokens and shared components the source of truth so route-level styling stays small.
- Use viewport-contained overflow only from the desktop breakpoint upward; mobile retains natural document scrolling.
- Preserve URL-backed filters and pagination, but remove stale page synchronization from the VM page.
- Preserve all existing user changes and edit only files required by the approved redesign.

## Phase 1: Visual foundation

### Task 1: Establish reference-led global tokens

**Description:** Simplify the global stylesheet around the light reference palette, typography, ambient background, shadows, radii, focus behavior, and thin internal scrollbars.

**Acceptance criteria:**
- [ ] Body uses the approved light ambient background and navy text.
- [ ] Shared brand, surface, border, shadow, and scrollbar tokens are available to components.
- [ ] Reduced-motion and keyboard focus behavior remain visible and usable.

**Verification:**
- [ ] Run `npm run typecheck`.
- [ ] Inspect the base page at desktop and mobile widths.

**Dependencies:** None

**Files likely touched:**
- `src/index.css`
- `src/app/App.css`

**Estimated scope:** Small

### Task 2: Restyle shared primitives

**Description:** Align cards, buttons, badges, page headings, form controls, tables, pagination, and empty states with the new token system while preserving their public APIs.

**Acceptance criteria:**
- [ ] Shared controls have consistent radii, borders, typography, hover, focus, and disabled states.
- [ ] Semantic badges retain text labels and sufficient contrast.
- [ ] Shared components no longer depend on dark-mode styling.

**Verification:**
- [ ] Run `npm run lint` and `npm run typecheck`.
- [ ] Keyboard-check representative buttons, inputs, and pagination controls.

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/components/card/Card.tsx`
- `src/shared/components/button/Button.tsx`
- `src/shared/components/form/FormControls.tsx`
- `src/shared/components/page/PageHeader.tsx`
- `src/shared/components/badge/Badge.tsx`

**Estimated scope:** Medium

### Task 3: Complete remaining shared data-display states

**Description:** Convert the table primitives, pagination presentation, empty state, and supporting icons needed by the redesigned routes.

**Acceptance criteria:**
- [ ] Tables and pagination follow the new surface hierarchy.
- [ ] Empty states fit naturally inside the workspace card.
- [ ] Icon-only controls retain accessible names at their call sites.

**Verification:**
- [ ] Run `npm run lint` and `npm run typecheck`.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/shared/components/table/Table.tsx`
- `src/shared/components/pagination/Pagination.tsx`
- `src/shared/components/empty-state/EmptyState.tsx`
- `src/shared/icons/Icons.tsx`

**Estimated scope:** Medium

## Checkpoint: Foundation

- [ ] Lint and typecheck pass.
- [ ] Shared components use one coherent light visual language.

## Phase 2: Application shell and routes

### Task 4: Build the responsive two-surface shell

**Description:** Rework the app shell, sidebar, and header into the pale-blue navigation card plus white workspace card shown by the reference, including accessible mobile drawer behavior and desktop viewport containment.

**Acceptance criteria:**
- [ ] Desktop displays coordinated navigation and workspace cards without normal document scrolling.
- [ ] Mobile navigation opens, closes, and returns to natural page scrolling.
- [ ] The obsolete theme toggle and dark-mode state are removed.

**Verification:**
- [ ] Run `npm run lint` and `npm run typecheck`.
- [ ] Manually inspect at 320, 768, 1024, and 1440 px.
- [ ] Keyboard-check drawer toggle and navigation links.

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `src/layouts/app-shell/AppShell.tsx`
- `src/layouts/app-shell/AppSidebar.tsx`
- `src/layouts/app-shell/AppHeader.tsx`
- `src/layouts/app-shell/SidebarContext.tsx`
- `src/layouts/app-shell/useSidebar.ts`

**Estimated scope:** Medium

### Task 5: Convert placeholder routes

**Description:** Render the three placeholder routes inside the common workspace with polished, consistent headings and empty-state content without inventing unavailable workflows.

**Acceptance criteria:**
- [ ] All placeholder routes visually match the redesigned shell.
- [ ] Existing copy and route behavior are preserved.
- [ ] Layout remains readable at mobile and desktop widths.

**Verification:**
- [ ] Visit each route manually.
- [ ] Run `npm run typecheck`.

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/platform-administration/pages/PlatformAdministrationPage.tsx`
- `src/features/providers-connectors/pages/ProvidersConnectorsPage.tsx`
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`

**Estimated scope:** Small

## Checkpoint: Shell and routes

- [ ] All four routes render in the new shell.
- [ ] Desktop and mobile overflow behavior matches the specification.

## Phase 3: Virtual-machine workspace

### Task 6: Restyle VM summary and controls

**Description:** Convert the metric cards, toolbar, status badges, and pagination footer to the reference-led component language.

**Acceptance criteria:**
- [ ] Metrics establish a compact, readable summary hierarchy.
- [ ] Search, filters, statuses, and page size remain fully operable.
- [ ] Updating state does not obscure or shift content.

**Verification:**
- [ ] Exercise search and every filter.
- [ ] Run `npm run lint` and `npm run typecheck`.

**Dependencies:** Tasks 2-4

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineMetrics.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineStatusBadge.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesPagination.tsx`

**Estimated scope:** Medium

### Task 7: Create the internally scrolling inventory workspace

**Description:** Restructure the VM page, table, and detail panel so header, toolbar, and pagination remain visible while the table and long detail content own desktop overflow.

**Acceptance criteria:**
- [ ] Desktop VM page fits the workspace height and scrolls inside the table/detail areas.
- [ ] Row selection stays keyboard accessible and visually clear.
- [ ] Mobile stacks content and uses natural document scrolling.

**Verification:**
- [ ] Test with 10, 25, and 50 rows per page.
- [ ] Inspect at all target breakpoints.
- [ ] Keyboard-select a VM and operate controls around the table.

**Dependencies:** Tasks 4 and 6

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.tsx`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.tsx`

**Estimated scope:** Medium

### Task 8: Fix first-click pagination

**Description:** Remove the stale page write-back race caused by deferred query data and previous-page placeholder data while keeping URL-backed pagination shareable.

**Acceptance criteria:**
- [ ] Clicking a page number, previous, or next updates records on the first click.
- [ ] Rapid valid page changes cannot be overwritten by stale response data.
- [ ] Filter and page-size changes still reset to page 1.

**Verification:**
- [ ] Manually navigate forward, backward, and directly between page numbers.
- [ ] Confirm URL query parameters match the visible page.
- [ ] Run `npm run lint` and `npm run typecheck`.

**Dependencies:** Task 7

**Files likely touched:**
- `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`
- `src/features/discovery-inventory/virtual-machines/hooks/useVirtualMachineSearchParams.ts`
- `src/features/discovery-inventory/virtual-machines/api/useVirtualMachines.ts`
- `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesPagination.tsx`

**Estimated scope:** Medium

## Checkpoint: Complete

- [ ] Run `npm run check`.
- [ ] Run `npm run build` if not already covered by the check.
- [ ] Inspect every route at the four target widths.
- [ ] Confirm desktop internal scrolling, mobile natural scrolling, first-click pagination, keyboard focus, loading, empty, and error states.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing staged work overlaps most target files | High | Make focused patches, inspect diffs frequently, and never reset user changes. |
| Nested flex containers prevent internal overflow | High | Apply explicit height, `min-h-0`, and overflow ownership from shell to table. |
| Deferred query displays stale page data | High | Separate transition feedback from authoritative URL page state and remove response-to-URL write-back. |
| Viewport-locked layout harms small screens | Medium | Enable containment only at desktop breakpoints and retain mobile document scrolling. |
| Screenshot styling reduces inventory density | Medium | Reuse the reference hierarchy while keeping compact table and control dimensions. |

## Open questions

None. The approved design specification resolves theme, scope, responsive behavior, and functional constraints.
