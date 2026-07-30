# FlashSystem and IBM Power Resource Inventory Design

**Date:** 2026-07-30  
**Status:** Approved for implementation planning  
**Scope:** Resources page inventory, fetching, caching, tables, filters, metrics, and detail panels for IBM FlashSystem volumes and IBM Power partitions

## Context

The Resources page currently presents a VMware-oriented interface even though it exposes VMware, FlashSystem, and IBM Power tabs. The API layer can already request:

- VMware inventory from `/api/get_vmware_vm`
- IBM Power inventory from `/api/get_power_vm`
- FlashSystem volumes from `/api/get_volumes`

The FlashSystem and IBM Power payloads contain substantially different structures. A single generic JSON table would hide domain meaning, produce unstable columns, and make filtering and detail presentation difficult. The page therefore needs a shared resource shell with source-specific models and presentation.

The expected inventory size is currently approximately 200 records per source/provider. This allows client-side filtering, sorting, and pagination after each provider-scoped response is cached.

## Goals

- Fetch inventory only for the currently selected resource tab.
- Cache each provider response independently so Resources and Recovery Groups can reuse it.
- Validate and retain every documented field in the supplied payloads.
- Show a curated, readable set of columns and metrics rather than exposing raw JSON.
- Provide complete, grouped detail panels for operational troubleshooting.
- Resolve FlashSystem volume relations to pools, hosts, and clusters.
- Support provider, pool, host, status, and text filtering where applicable.
- Keep all user-facing strings source-specific and translated in English, Slovak, and Czech.
- Tolerate partial provider failures and additive backend fields.

## Non-goals

- Changing the backend payload shape.
- Inferring an IBM Power `VolumeCapacity` unit that the payload does not declare.
- Loading all resource types when the Resources page opens.
- Server-side pagination at the current inventory size.
- Implementing Recovery Groups in this change. Recovery Groups will reuse the same query keys and cached source data later.

## Chosen Architecture

Use a shared Resources page shell with source-specific inventory modules.

The shared layer owns:

- selected tab
- provider discovery
- query state and provider-scoped caching
- common loading, empty, partial-error, and retry behavior
- common table shell, pagination, and detail-panel lifecycle

Each source module owns:

- API schema
- raw and normalized types
- mapper
- field registry
- columns
- filters
- metrics
- detail sections
- source-specific translations

This is preferred over:

1. **A dynamic JSON table:** quick initially, but unstable and unable to express domain relationships or useful labels.
2. **One large polymorphic component:** centralizes branching and makes source-specific evolution and testing difficult.

## Data Fetching and Cache Model

### Query granularity

Inventory is fetched lazily for the active tab and independently for each configured provider of that source type.

The canonical cache key is:

```ts
['resource-inventory', providerType, providerId]
```

Examples:

```ts
['resource-inventory', 'FLASHCOPY', 'ibm-flashsystem-01']
['resource-inventory', 'IBM_POWER', 'power-hmc-01']
```

Provider type maps to the existing API endpoint configuration:

- `VMWARE` → VMware virtual machines
- `IBM_POWER` → IBM Power partitions
- `FLASHCOPY` → FlashSystem volumes

### Query defaults

- `staleTime`: 15 minutes
- `gcTime`: 60 minutes
- `retry`: 1
- `refetchOnWindowFocus`: false

Data remains fresh enough for inventory browsing while tab changes and Recovery Group selection reuse cached responses. Manual refresh invalidates only the active source/provider queries.

### Multiple providers

The client runs one query per provider, then combines successful normalized results with `useMemo`. Every normalized item carries `providerId` and `providerType`, so identical resource names from different providers remain distinct.

A failure from one provider does not discard successful results from other providers. The page shows:

- successful resources
- a non-blocking partial-data warning listing failed providers
- retry for failed queries

The full-page error state is used only when no provider query succeeds.

### Client-side operations

At the expected scale, search, filtering, sorting, and pagination operate on the combined cached data. If measured inventories later approach thousands of records per provider or payloads become expensive, server-side filtering and pagination can be added behind the same normalized interfaces.

## FlashSystem Volume Model

### API validation

The Zod schema explicitly registers all supplied volume fields:

- `id`
- `name`
- `IO_group_id`
- `IO_group_name`
- `status`
- `mdisk_grp_id`
- `mdisk_grp_name`
- `capacity`
- `type`
- `FC_id`
- `FC_name`
- `RC_id`
- `RC_name`
- `vdisk_UID`
- `fc_map_count`
- `copy_count`
- `fast_write_state`
- `se_copy_count`
- `RC_change`
- `compressed_copy_count`
- `parent_mdisk_grp_id`
- `parent_mdisk_grp_name`
- `formatting`
- `encrypt`
- `volume_id`
- `volume_name`
- `function`
- `protocol`
- `host_maps`

Each host map registers `host_id` and `scsi_id`.

The response also explicitly registers:

- `count`
- pools keyed by pool ID with `name`, `capacity`, `used_capacity`, and `free_capacity`
- hosts keyed by host ID with `name`, `cluster_id`, and `cluster_name`
- clusters as a keyed, forward-compatible related-resource collection

The schema preserves unknown additive keys after validating known fields so a backend addition does not break inventory loading.

### Normalization

The mapper produces a `FlashSystemVolumeResource` containing:

- stable key composed from provider ID and volume ID
- provider identity
- all validated raw volume values
- resolved pool, using `mdisk_grp_id`
- resolved hosts, using `host_maps[].host_id`
- resolved cluster context from host records and the clusters collection
- parsed byte values for capacity strings only when the input includes a recognized unit
- the original capacity strings for display and diagnostics

Capacity parsing is conservative. Invalid or unitless values remain available as raw strings and do not contribute to byte-based totals.

### Table columns

The default volume table shows:

1. Name
2. Status
3. Capacity
4. Pool
5. I/O group
6. Type
7. Protocol
8. Mapped hosts
9. Copy count
10. FlashCopy mappings

The provider is available through the provider filter and item detail. If multiple providers are combined, provider identity is also shown in the table to prevent ambiguity.

### Filters

- text search across name, volume ID, UID, pool, and resolved host names
- provider
- pool
- host
- status

Filter options are derived from successfully loaded normalized records and related-resource dictionaries.

### Metrics

- discovered volumes
- online volumes
- total pool capacity
- free pool capacity

Pool capacity totals are calculated once per unique provider/pool, not once per volume. Values that cannot be safely parsed are excluded from totals and do not receive fabricated units.

Secondary inventory context can show counts for pools, hosts, and clusters.

### Detail panel

The detail panel groups all registered volume fields instead of presenting one flat list:

- Identity: IDs, name, UID, provider
- Placement and capacity: capacity, pool, parent pool, I/O group
- State and behavior: status, type, function, protocol, fast write, formatting, encryption
- Copy relationships: FlashCopy, Remote Copy, copy counts, compressed and space-efficient copy counts
- Host mappings: resolved host name, host ID, SCSI ID, and cluster
- Related pool: name, capacity, used capacity, free capacity

Empty optional values render as a consistent placeholder and do not shift the layout.

## IBM Power Model

### API validation and field registry

The payload contains an item with `lpar` and `vios` objects. The API schema accepts both and validates their values without assuming that both are populated.

Every field observed in the supplied complete IBM Power payload is listed in a typed `powerFieldRegistry.ts`. Each entry defines:

- API key
- translation key
- display group
- formatting rule
- whether it is available for search, filter, table, or detail

The registry is the authoritative inventory of known Power fields. The raw record remains passthrough-compatible with future additive fields.

### Normalization

For each response item, the mapper:

1. chooses the non-empty `lpar` or `vios` record as `partitionData`
2. records `partitionKind` as `LPAR` or `VIOS`
3. builds a stable key from provider identity and the best available partition identifier
4. retains both raw records for diagnostics
5. extracts normalized values required by tables, metrics, filters, and details

If both records are unexpectedly populated, both are preserved and the mapper applies a documented deterministic preference based on the partition type. If neither is populated, the record is rejected as unusable while the remaining inventory continues to load.

### Table columns

The IBM Power table shows:

1. Partition name
2. Partition kind (`LPAR` or `VIOS`)
3. Operating system type
4. Device name
5. Boot mode
6. Power on with hypervisor
7. Volume capacity
8. Volume name
9. Volume state

`VolumeCapacity` is displayed exactly as received. The sample value `270648` has no declared unit, so the UI must not append `MB`, `GB`, blocks, or another inferred unit. A unit can be introduced only when the API contract supplies it or backend documentation confirms it.

When multiple providers are combined, provider identity is also visible.

### Filters and search

- text search across partition name, system name, logical serial number, IP address, device name, and volume name
- provider
- partition kind
- partition state
- operating system type
- volume state

### Metrics

- discovered partitions
- running partitions
- LPAR count
- VIOS count

The API `counts_by_type` is retained, while aggregate page metrics are calculated from normalized records across providers to avoid mixing provider-level counts incorrectly.

### Detail panel

The default detail view includes the table fields plus:

- partition state
- system name
- provider
- interface state (`State`)
- IP address
- subnet mask
- partition kind
- bootable flag (`IsBootable`)
- maximum virtual I/O slots (`MaximumVirtualIOSlots`)

`State` is labeled as interface/device state to distinguish it from `PartitionState`.

All remaining registered Power values are available in grouped detail sections:

- Identity and partition
- Processor and memory
- Operating system and lifecycle
- Network
- Storage and volumes
- Virtual I/O
- Monitoring and capabilities

This satisfies full field retention without overwhelming the default table.

## Resources Page Behavior

### Tabs

The URL/search state remains the source of truth for the active resource tab. Changing tabs:

- updates the active source
- starts only the newly required provider queries
- immediately reuses a fresh cache entry if one exists
- resets source-incompatible filters and selected detail item

### Loading and empty states

Each source has source-specific copy:

- VMware virtual machines
- FlashSystem volumes
- IBM Power partitions

Skeletons reflect the selected source’s metric and column layout. Empty states distinguish:

- no provider configured
- provider returned no resources
- current filters returned no matches

### Localization

English, Slovak, and Czech translation namespaces include:

- generic Resources page shell
- source tab labels
- source descriptions
- search placeholders
- filter labels and options
- metric labels and helper text
- table headers
- detail section and field labels
- loading, empty, warning, and error messages

Existing VMware-specific translations remain supported but are no longer used as the generic page title.

## File Organization

The implementation should keep source-specific code explicit:

```text
src/features/discovery-inventory/
  api/
    schemas/
      flashSystemInventorySchema.ts
      powerInventorySchema.ts
  helpers/
    mapFlashSystemInventory.ts
    mapPowerInventory.ts
  model/
    discoveryTypes.ts
  resources/
    config/
      flashSystemColumns.tsx
      flashSystemDetailFields.ts
      powerColumns.tsx
      powerDetailFields.ts
      powerFieldRegistry.ts
    components/
      FlashSystemMetrics.tsx
      FlashSystemVolumeDetailPanel.tsx
      IbmPowerMetrics.tsx
      IbmPowerDetailPanel.tsx
      ResourceInventoryToolbar.tsx
      ResourceInventoryTable.tsx
    helpers/
      filterFlashSystemVolumes.ts
      filterPowerPartitions.ts
      parseCapacity.ts
    hooks/
      useResourceInventoryQueries.ts
      useResourceSearchParams.ts
```

Exact names can adapt to existing shared table primitives, but source boundaries and responsibilities should remain.

## Failure Handling and Observability

- Zod validation errors identify the provider and endpoint without logging secrets.
- One malformed resource does not silently corrupt normalized output.
- Partial provider failures remain visible.
- Unsupported capacity formats remain raw and are omitted from numeric totals.
- Unknown related IDs display their raw ID and an unresolved placeholder.
- Stable query keys make invalidation predictable for later Recovery Groups usage.

## Testing Strategy

### Schema and mapper tests

- validate complete supplied FlashSystem fixture
- confirm every supplied volume field survives validation and mapping
- resolve pool, host, and cluster relationships
- validate complete supplied IBM Power fixture
- verify all observed Power fields exist in the registry
- map both LPAR and VIOS shapes
- cover empty, both-populated, and malformed partition objects
- preserve additive unknown fields

### Capacity tests

- parse recognized decimal and binary capacity units
- preserve raw values
- reject ambiguous unitless values for numeric aggregation
- deduplicate pools across volumes

### UI tests

- render requested table columns
- render grouped details and placeholders
- distinguish interface `State` from `PartitionState`
- render raw IBM Power `VolumeCapacity` without a unit
- calculate metrics correctly
- filter by provider, pool, host, status, partition kind, and text
- reset incompatible state on tab changes

### Query tests

- fetch only the active tab
- create one query per provider with the canonical key
- reuse fresh cached data after tab changes
- combine successful provider results
- retain successful results during partial failure
- retry and manual refresh only the intended queries

### Quality gates

- targeted unit and component tests
- full test suite
- TypeScript typecheck
- lint
- production build
- manual responsive check for tables, filters, and details

## Recovery Groups Compatibility

Recovery Groups can consume the same provider-scoped query keys without loading a separate copy of inventory. Group creation can request only providers relevant to the selected resource/provider constraints, then use the normalized stable item identity.

The cache architecture does not force a Recovery Group domain rule. Whether a group accepts one source, multiple resource categories, or provider-paired resources remains a separate domain validation concern. Inventory records always retain provider and source identity so any approved rule can be enforced without changing the fetch layer.

## Acceptance Criteria

- Selecting FlashSystem displays real volume data, relevant metrics, filters, table columns, and complete grouped details.
- Selecting IBM Power displays real partition data, the requested columns, metrics, filters, and grouped details.
- All supplied payload fields are explicitly registered and retained.
- `VolumeCapacity` is shown without an invented unit.
- Pool and host filters operate on resolved FlashSystem relations.
- Only active source data is fetched, separately per provider.
- Cached results can be reused by Resources and future Recovery Groups flows.
- Partial provider failure does not hide successful provider data.
- English, Slovak, and Czech UI text matches the selected source.
- Tests, typecheck, lint, and production build pass.
