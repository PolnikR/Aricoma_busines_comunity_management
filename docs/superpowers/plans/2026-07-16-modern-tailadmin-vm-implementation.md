# Implementation Plan: Modern TailAdmin VM inventory

## Overview

Apply the approved TailAdmin visual direction to the complete ABCO application shell and the first functional Virtual Machines screen. Preserve the existing feature structure, adapt only reusable pieces from the purchased template, and simulate the future paginated API contract over the current fixture.

## Architecture decisions

- Keep Vite, React Router, TanStack Query, and the current feature-oriented source tree.
- Adapt TailAdmin visual primitives; do not copy Next.js routing, image, theme, logistics, chart, or map code.
- Keep the desktop table/detail split and stack the detail below the table on narrower screens.
- Put filters and pagination in URL search parameters and expose a paginated API adapter to the UI.
- Calculate aggregate metrics in the fixture adapter, never from only the visible page.

## Task 1: Normalize shared TailAdmin primitives

**Description:** Modernize card, button, badge, form-control, and pagination primitives using the purchased TailAdmin styles.

**Acceptance criteria:**
- Shared controls use consistent height, radius, border, focus, disabled, and semantic state styles.
- Pagination is controlled, keyboard accessible, responsive, and supports long page ranges.
- Shared components contain no VM-specific logic.

**Verification:** `npm run lint`, `npm run typecheck`, and responsive manual inspection.

**Dependencies:** None.

**Files:** `Card.tsx`, `Button.tsx`, `Badge.tsx`, new `FormControls.tsx`, new `Pagination.tsx`.

**Estimated scope:** Medium.

## Task 2: Modernize the application shell

**Description:** Bring the header, sidebar, background, content width, and responsive navigation in line with the TailAdmin reference while retaining ABCO routes.

**Acceptance criteria:**
- Header and sidebar match the compact white TailAdmin shell.
- Expansion, hover, overlay, active route, and keyboard behavior continue to work.
- Content does not overlap at 320, 768, 1024, and 1440 pixels.

**Verification:** `npm run lint`, `npm run build`, and navigation checks in expanded, collapsed, and mobile states.

**Dependencies:** Task 1.

**Files:** `AppShell.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`, `Icons.tsx`, `index.css`.

**Estimated scope:** Medium.

## Checkpoint: Shared visual foundation

- Lint and build pass.
- Shell and shared controls render consistently on mobile and desktop.

## Task 3: Modernize VM metrics and detail panel

**Description:** Adapt TailAdmin logistics metrics and tracking-panel composition to VM data while preserving the side-by-side layout.

**Acceptance criteria:**
- Metrics use compact horizontal icon cards and aggregate response metadata.
- Detail groups identity, guest, compute, placement, storage, and tools data.
- Long external values do not break the layout and remain accessible.

**Verification:** Check populated and no-selection states and the responsive detail position.

**Dependencies:** Task 1.

**Files:** `VirtualMachineMetrics.tsx`, `VirtualMachineDetailPanel.tsx`, `VirtualMachineStatusBadge.tsx`.

**Estimated scope:** Medium.

## Task 4: Implement the paginated fixture adapter

**Description:** Replace the array-only query boundary with query and page contracts that simulate backend filtering and pagination.

**Acceptance criteria:**
- Query accepts page, page size, search, power state, connection state, and cluster.
- Result returns only the requested slice plus totals, filter options, and aggregate metrics.
- Invalid pages are clamped and JSON remains Zod-validated.

**Verification:** `npm run typecheck`; manually verify 10, 25, and 50 item sizes and filtered totals.

**Dependencies:** None.

**Files:** `types.ts`, `virtualMachinesApi.ts`, `useVirtualMachines.ts`.

**Estimated scope:** Medium.

## Task 5: Modernize VM table controls and pagination

**Description:** Adapt the TailAdmin activity-table header, filters, dense rows, selected state, and footer pagination.

**Acceptance criteria:**
- Search is prominent and secondary filters use compact controls.
- Rows are keyboard selectable and visibly selected without color alone.
- Footer shows visible range, total, page size, and responsive pagination.

**Verification:** Keyboard navigation and horizontal scrolling checks.

**Dependencies:** Tasks 1 and 4.

**Files:** `VirtualMachinesToolbar.tsx`, `VirtualMachinesTable.tsx`, new `VirtualMachinesPagination.tsx`.

**Estimated scope:** Medium.

## Task 6: Integrate URL state and page states

**Description:** Connect pagination, filters, selection, loading, updating, empty, error, and retry behavior in the VM page.

**Acceptance criteria:**
- Page, size, search, and filters survive refresh through URL parameters.
- Search, filter, and size changes reset to page 1.
- Loading, updating, failure, empty inventory, and no-result states are distinct.

**Verification:** Browser refresh/back/forward checks; `npm run lint`, `npm run typecheck`, `npm run build`.

**Dependencies:** Tasks 3, 4, and 5.

**Files:** `VirtualMachinesPage.tsx`, `PageHeader.tsx`, `EmptyState.tsx`.

**Estimated scope:** Medium.

## Task 7: Apply the design to placeholder pages

**Description:** Use the same page heading, surface, and empty-state treatment for Platform Administration, Providers & Connectors, and Infrastructure.

**Acceptance criteria:**
- All routes look like one product.
- Placeholder pages remain explicit and do not imply unavailable functionality.
- Shared primitives are not duplicated.

**Verification:** Navigate all routes at mobile and desktop widths; run `npm run check`.

**Dependencies:** Tasks 1 and 2.

**Files:** the three placeholder page components.

**Estimated scope:** Small.

## Final checkpoint

- `npm run check` passes.
- No component reports console errors.
- Loading, error, empty, updating, and populated states are represented.
- Layout is checked at 320, 768, 1024, and 1440 pixels.
- All interactive elements are keyboard reachable with visible focus.
- No Next.js-only or AGPL map dependencies are introduced.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| TailAdmin relies on Next.js conventions | Medium | Port markup and tokens only. |
| Fixture contains all records | Medium | Hide it behind the future paginated contract. |
| Metrics become page-only | High | Return aggregates separately from page items. |
| Dense table fails on mobile | Medium | Preserve horizontal scroll and stack detail. |
| URL and query state drift | Medium | Centralize parsing and updates at page level. |

## Open questions

None. The approved design and current fixture provide enough information.
