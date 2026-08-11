# Frontend feature capabilities

This catalogue records deliberate processing modes, API limitations, and product policies. It is documentation only; application behavior remains explicit in the owning implementation files.

| Feature | Pagination | Filtering | Sorting | Provider/API capability | Data or persistence policy |
|---|---|---|---|---|---|
| Discovery Inventory | Client | Client table filtering | Client | VMware supports server-side tag filtering; IBM Power and FlashSystem do not | IBM Power VIOS is excluded from normalized inventory |
| Providers | Client | Client | Client | Provider-specific API endpoints | Duplicate ID validation is currently client-side |
| Recovery Groups | Client | Client | Client | Resource compatibility is defined by recovery-group resource options | Data is loaded and mutated through the recovery-groups backend API |
| Recovery Applications | Client | Client | Client | Recovery application API | No additional exclusion policy |

## VMware virtual machines: tag filtering

### Current frontend behavior

- Tag filtering is available only in the VMware virtual-machine inventory.
- When exactly one tag is selected, `getServerSideTagFilter` forwards that tag to `useDiscoveryInventory`.
- `fetchVmwareInventory` then calls `/api/vms_by_tag` with the `tag` query parameter. The selected `provider_id` is included when available.
- With no selected tag, or with more than one selected tag, the inventory is loaded through `/api/vms` and the selected tag values are applied to the returned data on the client.
- Search, power state, connection state, cluster, untagged selection, final tag matching, and pagination are performed by `applyFiltersAndPagination` on the client.
- IBM Power and FlashSystem inventory paths do not accept or send a tag parameter.

### Backend migration impact

If the backend later supports multiple tags and the remaining VM filters, update the endpoint contract, query keys, `useDiscoveryInventory`, and `applyFiltersAndPagination` together. Preserve the current single-tag behavior until the new API contract is available and tested.

### Implementation and tests

- API endpoint selection: `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- Query execution: `src/features/discovery-inventory/hooks/useDiscoveryInventory.ts`
- Server-tag selection and client filtering: `src/features/discovery-inventory/resources/helpers/filterVirtualMachines.ts`
- API tests: `src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`
- Filtering tests: `src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts`

## IBM Power virtual machines: VIOS exclusion

### Current frontend behavior

- `/api/get_power_vm` returns entries containing an `lpar` object, a `vios` object, or both.
- `mapPowerInventory` derives `LPAR` when `lpar` is populated and `VIOS` when only `vios` is populated.
- VIOS is currently unsupported by the application. A derived `VIOS` record is discarded centrally in `mapPowerInventory` before it reaches resource tables, metrics, infrastructure topology, or recovery-group resource selection.
- If both `lpar` and `vios` are populated, LPAR has deterministic precedence and the record is retained as LPAR.
- The backend's raw `count` and `counts_by_type` values may still include VIOS. Visible counts must therefore be derived from normalized `partitions` whenever the UI describes displayed resources.

### Backend migration impact

The preferred future backend behavior is to exclude VIOS before returning the inventory, or to expose an explicit supported-partition filter. After that contract is deployed, remove the frontend exclusion only after an integration test confirms that VIOS cannot reach normalized inventory data.

### Implementation and tests

- Response schema: `src/features/discovery-inventory/api/schemas/powerInventorySchema.ts`
- Central exclusion: `src/features/discovery-inventory/helpers/mapPowerInventory.ts`
- Regression tests: `src/features/discovery-inventory/helpers/mapPowerInventory.test.ts`

## Owning implementation files

- VMware tag endpoint selection: `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- IBM Power VIOS exclusion: `src/features/discovery-inventory/helpers/mapPowerInventory.ts`
- Provider client-side table processing: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- Provider duplicate-ID validation: `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- Recovery Groups backend operations: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- Recovery Groups client-side table processing: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- Recovery Applications client-side table processing: `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`

When a backend adds pagination, filtering, sorting, or new provider capabilities, update the referenced implementation and this catalogue together. Do not infer server support from a UI control alone.
