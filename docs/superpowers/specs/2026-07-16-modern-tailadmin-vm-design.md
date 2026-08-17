# Modern TailAdmin VM inventory design

## Goal

Modernize the ABCO frontend with a consistent visual system derived from the purchased TailAdmin Next.js Pro Starter while preserving the existing feature-oriented React and Vite architecture. The first complete screen remains Discovery & Inventory / Virtual Machines.

The result should visually match the compact TailAdmin dashboard reference: restrained surfaces, dense operational data, clear status indicators, compact controls, and responsive behavior already represented by the source template.

## Scope

This change covers:

- the application shell, header, and sidebar;
- shared cards, buttons, badges, form controls, table primitives, pagination, and application states;
- the Virtual Machines page, metrics, filters, table, pagination, and detail panel;
- consistent placeholder presentation for Platform Administration, Providers & Connectors, and Infrastructure;
- simulated paginated VM loading through the existing HTTP fixture.

It does not add charts, maps, logistics-specific content, real backend integration, authentication, dark-mode persistence, or new ABCO business features.

## Visual direction

The purchased TailAdmin source is the visual and responsive reference. Components are adapted to the ABCO domain instead of copying complete logistics pages or Next.js-specific code.

The visual system uses:

- a light gray application background and white content surfaces;
- a compact white header with subtle borders;
- a white collapsible sidebar with restrained active navigation styling;
- small border radii and minimal shadows;
- dense typography suitable for an operational console;
- blue as the primary action and selection color;
- green, amber, red, and gray only for semantic states;
- compact tables and form controls with clear keyboard focus states.

Existing TailAdmin global tokens and responsive utility styles remain authoritative. New arbitrary colors and one-off spacing values are avoided.

## Page layout

The existing VM page composition remains intact:

1. compact page heading and page actions;
2. a horizontal row of summary metrics;
3. a two-column desktop workspace with the inventory table on the left and VM detail on the right;
4. a single-column mobile and tablet layout where the detail follows the table.

The detail panel remains persistently visible on desktop. Selecting a table row updates it without navigating away or losing filters and pagination state.

## Component boundaries

Shared visual primitives remain under `src/shared/components` and contain no VM-specific logic:

- `Button`
- `Badge`
- `Card`
- form controls used by filters
- table primitives
- `Pagination`
- loading, empty, and error states
- page heading and section heading components

VM-specific components remain under `src/features/discovery-inventory/virtual-machines/components`:

- `VirtualMachineMetrics`
- `VirtualMachinesToolbar`
- `VirtualMachinesTable`
- `VirtualMachinesPagination`
- `VirtualMachineDetailPanel`
- `VirtualMachineStatusBadge`

Data fetching, runtime validation, mapping, and query state remain separate from presentation components.

## Virtual Machines table

The table follows the compact TailAdmin activity-table style. It includes:

- VM identity with hostname or IP as secondary text;
- power and connection status;
- operating system;
- compute allocation;
- placement;
- storage summary;
- snapshot count;
- a selected-row state that is visible without relying on color alone.

The table remains horizontally scrollable at narrow widths. Interactive rows are keyboard accessible and expose their selected state to assistive technology.

The table footer shows the visible range and total count, page controls, and a page-size selector. Default page size is 10, with 10, 25, and 50 as available values.

## Simulated pagination contract

The fixture currently contains all 151 records and has no pagination metadata. The API layer will expose a paginated contract even while the fixture remains the data source:

```ts
interface VirtualMachinesQuery {
  page: number
  pageSize: 10 | 25 | 50
  search: string
  powerState: string
  connectionState: string
  cluster: string
}

interface VirtualMachinesPage {
  items: VirtualMachine[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}
```

The development adapter fetches and validates the fixture, applies the query, and returns only the requested slice. Presentation components consume `VirtualMachinesPage` and do not know whether pagination is simulated or provided by a real backend.

When the real endpoint exists, only the API adapter and its response schema should change. The real request is expected to transmit page, page size, search, and active filters so the backend can paginate the complete filtered result set.

## URL and query state

Page number, page size, search, and filters are stored in URL search parameters. This makes the current inventory view refresh-safe and shareable.

Changing search, filters, or page size resets the page to 1. Changing only the selected VM does not refetch the current page. If a requested page becomes invalid after filters change, the view moves to the last valid page.

Search input is debounced before it changes the query. Pagination controls are disabled while the next page is loading, while the existing page remains visible to avoid layout flashing.

## Metrics and filtering

Metrics use compact horizontal TailAdmin cards. Because a paginated backend may not return all records, aggregate metrics must not be calculated from only the current page.

During fixture simulation, the adapter calculates aggregate values from the validated full fixture and returns them as response metadata. A future backend must provide equivalent aggregate data or a dedicated summary endpoint.

Filters use compact controls inside the table header area. Search remains visible. Secondary filters may wrap to a second line on medium screens and become a collapsible filter area on mobile.

## Detail panel

The detail panel is styled as a compact operational summary inspired by the TailAdmin tracking panel. It groups:

- identity and status;
- operating system and guest networking;
- compute;
- placement;
- storage and snapshots;
- VMware tools state.

The panel renders all external strings as text. Long host, folder, and datastore values wrap or truncate with an accessible full-value affordance. Empty values use a consistent dash placeholder.

## Application states

All feature pages use the same design language for:

- loading skeletons sized like the final content;
- controlled error messages with retry actions;
- empty inventory responses;
- no-results states caused by filters;
- not-yet-implemented pages.

During page changes, TanStack Query keeps the previous page visible and marks the inventory region as updating. A failed next-page request leaves the previous successful data visible and presents a non-destructive retry message.

## Responsive and accessibility requirements

The implementation is verified at 320, 768, 1024, and 1440 pixel widths.

- The sidebar collapses according to the TailAdmin behavior.
- Metrics stack on mobile and form a horizontal row on wider screens.
- The table scrolls horizontally without clipping pagination controls.
- The detail panel moves below the table before either column becomes unusably narrow.
- All controls are keyboard reachable and have visible focus styles.
- Status is communicated through text and icons in addition to color.
- Form controls have programmatic labels.
- Pagination exposes current-page state and descriptive labels.

## Validation and testing

External fixture and future API responses remain `unknown` until Zod validation succeeds.

Automated tests cover:

- fixture-to-model mapping;
- pagination boundary calculations;
- page-size changes;
- search and filter resets to page 1;
- URL query parsing and invalid-value fallback;
- loading, updating, error, empty, and no-results states;
- row selection and detail updates;
- keyboard interaction with rows and pagination.

Quality gates remain:

```text
npm run lint
npm run typecheck
npm run build
```

## Implementation sequence

1. Extract the relevant TailAdmin primitives and normalize shared design tokens.
2. Modernize the application shell and shared application states.
3. Add reusable form and pagination primitives.
4. Introduce the paginated VM query and response types.
5. Implement the fixture pagination adapter and query hook.
6. Move filters and pagination to URL state.
7. Modernize VM metrics, toolbar, table, and detail panel.
8. Apply the shared design to placeholder pages.
9. Add focused tests and run all quality checks.
