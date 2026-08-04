# Recoverable Resource Inventory Error State

## Problem

When a resource inventory request fails without cached data, each resource page replaces its complete inventory view with a full error state. The inventory view owns the filter toolbar, so the provider filter disappears with the table. A user whose selected provider fails cannot select another provider that has valid data.

## Scope

Apply the same recoverable error behavior to VMware, FlashSystem, and IBM Power resource inventories. Provider-list loading failures and the no-provider state remain terminal because no provider choices are available in those states.

## Shared component boundary

Introduce a shared `ResourceInventoryPanel` in the discovery-inventory resource feature. It owns the common table frame:

- toolbar slot;
- scrollable content region;
- optional shared resource-request error state;
- optional pagination slot.

The error contract contains only presentation-safe values: localized title, localized description, retry label, retry state, and retry callback. The component uses the existing `FetchErrorAlert` and never renders raw API or schema error details.

When an inventory request fails, `ResourceInventoryPanel` keeps the toolbar mounted and replaces only the content region with the shared error message. Pagination is hidden while no dataset exists.

## Data flow

### VMware

The page always renders its inventory toolbar after providers are available. If VM data is unavailable, it supplies empty data-derived filter options while retaining the provider list. Applying a new provider filter updates the URL query and triggers the existing provider-scoped request.

### FlashSystem and IBM Power

Their inventory views remain mounted with an empty resource list during a terminal inventory request failure. The provider control continues to use the successfully loaded provider list. Pool, host, state, partition, operating-system, and volume options are empty until the new provider request succeeds.

### Cached or partial data

Existing behavior remains unchanged: stale or partial data stays visible and a non-terminal notice is shown above the panel.

## Interaction and accessibility

- The `Filters` button and provider select remain keyboard accessible during resource API failures.
- The error is exposed as an alert inside the table content region.
- Retry repeats the current request.
- Selecting another provider replaces the provider-scoped query and can recover without a page reload.
- Search and density controls may remain visible, but only provider selection is guaranteed to recover data while the dataset is unavailable.

## Testing

- Shared panel test: toolbar remains rendered while the error replaces content, retry remains available, and pagination is absent.
- VMware regression test: an initial inventory error still exposes the filter toolbar and a provider change updates the provider filter.
- FlashSystem and IBM Power regression tests: a full resource failure retains the shared toolbar and changing provider requests the new provider scope.
- Existing loading, no-provider, cached-data, partial-failure, localization, lint, typecheck, and production-build checks continue to pass.

## Non-goals

- Changing API endpoints, query keys, caching, retry counts, or provider contracts.
- Exposing backend error details.
- Making data-derived filter values available when no dataset was loaded.
