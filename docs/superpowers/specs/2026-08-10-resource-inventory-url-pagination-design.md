# Resource Inventory URL Pagination Design

## Goal

Use one production-oriented URL state pattern for the VMware, FlashSystem, and
IBM Power inventory tabs. The frontend will continue to paginate the currently
returned inventories locally until the backend pagination contract is known,
but the URL and component boundaries will already be ready for a later
server-side implementation.

## Current state

- VMware reads pagination and filters from URL search parameters through
  `useVirtualMachineSearchParams`.
- FlashSystem and IBM Power keep pagination and filters in component-local
  `useState`.
- The active resource and provider are already represented by `resource` and
  `providerId`.
- Changing the active source writes `page=1`, but only VMware pagination updates
  the page value after that.
- All three API clients currently download a complete provider inventory.
  VMware then uses `applyFiltersAndPagination`; FlashSystem and IBM Power filter
  and slice arrays inside their views.

The inconsistent ownership means refresh and shared URLs restore VMware table
state but not FlashSystem or IBM Power table state.

## URL contract

The active inventory URL uses these common parameters:

```text
resource=<flashsystem|ibm-power>  # omitted means the default VMware view
providerId=<provider-id>
page=<positive integer>
pageSize=<10|25|50>
search=<text>
```

Resource-specific filter parameters remain flat because only one resource is
active at a time:

- VMware: `powerState`, `connectionState`, `cluster`, `tags`, `untagged`
- FlashSystem: `poolId`, `hostId`, `status`
- IBM Power: `partitionKind`, `partitionState`, `operatingSystemType`,
  `volumeState`

`providerId` is navigation context owned by the top source tab, not a table
filter and not part of the active-filter count.

Legacy or manually entered URLs may omit `resource`, `page`, or `pageSize`.
They resolve to `vmware`, page `1`, and page size `10`. Invalid page values fall
back to these defaults. URL mutations write normalized `page` and `pageSize`
values explicitly; `resource` remains omitted only for the default VMware view
to preserve the existing URL convention.

## State ownership

`useResourceTabSearchParam` continues to own `resource` and `providerId`.
A shared inventory search-parameter hook owns common table state and supplies
validated parsing and immutable URL updates. Thin resource-specific wrappers
define their filter keys and codecs without duplicating pagination behavior.

The shared behavior is:

- changing page updates only `page`;
- changing `pageSize`, search, or any filter resets `page` to `1`;
- changing provider or resource resets `page` to `1`;
- changing provider or resource removes incompatible source-specific filters;
- `pageSize` and the universal name search are preserved across source tabs;
- updates use `replace` so pagination and live search do not flood browser
  history;
- density, modal visibility, and selected-row UI state remain local.

The resource-specific pages receive the selected provider from `ResourcesPage`
and must not create another provider selection state.

## Current client-side data flow

Until backend pagination exists, the flow remains:

```text
URL resource + providerId
  -> provider-scoped inventory query
  -> complete provider inventory
  -> URL-backed search and source filters
  -> client-side page slice
  -> table and pagination controls
```

The selected page is clamped when filtering or changed data reduces the number
of pages. The normalized page is written back to the URL. Switching source tabs
remounts the source page, closes a stale detail drawer, and starts from page 1.

## Future backend pagination boundary

The browser URL is a UI contract, not the backend transport contract. Once the
backend contract is confirmed, the API layer maps the normalized frontend
query to either:

```text
page + pageSize -> page + page_size
```

or:

```text
page + pageSize -> offset + limit
```

The UI components and URLs do not change when that adapter changes.

Server-side pagination must include server-side search, filtering, and sorting.
Filtering only the returned page would produce incorrect totals and missing
matches. The backend response must expose at least the page items and total
filtered count. Page count can be returned or derived from `total` and
`pageSize`.

Metrics must describe the complete selected provider inventory or complete
filtered result, not only the current page. They therefore require aggregate
metadata in the paginated response or a separate metrics endpoint.

The current implementation will not send speculative pagination parameters to
the API before this backend contract is available.

## Error and loading behavior

- Invalid URL pagination values use safe defaults instead of blocking render.
- An out-of-range page is clamped after the total is known.
- Existing cached data remains visible during a background page refresh where
  the later server-side query supports placeholder data.
- Backend or schema errors remain visible through the existing localized error
  states.
- A failed request never becomes an apparently successful empty page.

## Testing

Automated coverage will prove:

- parsing and serializing valid, missing, and invalid common parameters;
- page reset after page-size, search, filter, provider, and resource changes;
- preservation of unrelated valid parameters during atomic URL updates;
- removal of source-specific filters when switching provider or resource;
- refresh-safe FlashSystem and IBM Power state;
- identical pagination interaction for all three inventory views;
- page clamping after filtering reduces the result count;
- provider context remains separate from active table filters;
- existing VMware behavior does not regress.

Browser verification will cover refresh, copied URLs, back navigation to the
Resources page, all three source types, and mobile/desktop pagination controls.

## Non-goals

- Guessing the future backend parameter names or response schema.
- Sending `page` or `pageSize` to endpoints that do not yet support them.
- Implementing cursor pagination before the backend contract is known.
- Persisting density, open modals, or selected rows in the URL.
- Remembering a separate page for every provider while switching tabs.
- Changing the existing top-level provider tab design.

## Acceptance criteria

1. VMware, FlashSystem, and IBM Power use the same validated URL pagination
   behavior.
2. Refreshing or copying any active inventory URL restores its table state.
3. Every state change that can invalidate a page resets or clamps it safely.
4. Provider selection remains owned by the source tab and cannot conflict with
   table filters.
5. Current API requests remain compatible with the unpaginated backend.
6. The later backend pagination integration is isolated to API/query adapters
   and response mapping rather than table components.
