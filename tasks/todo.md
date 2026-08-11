# Task Checklist: Discovery Inventory Source Boundaries

## Baseline

- [ ] Task 1: Lock existing endpoint and query behavior with tests
- [ ] Verify `/vms`, `/vms_by_tag`, `/tags`, `/vdisks_by_vm`
- [ ] Verify `/get_volumes`, `/get_volume_tree`, `/get_power_vm`
- [ ] Run focused discovery-inventory tests and typecheck

## VMware source

- [ ] Task 2: Move VMware inventory API, schema, mapper, model and hook
- [ ] Rename `useDiscoveryInventory` to `useVmwareInventory`
- [ ] Preserve query keys, cache settings and request activation
- [ ] Task 3: Move tags to VMware source
- [ ] Rename `useTags` to `useVmwareTags`
- [ ] Move `/vdisks_by_vm` integration to VMware source
- [ ] Rename hook/API around VM storage volumes
- [ ] Verify detail-panel request timing

## Checkpoint 1

- [ ] No VMware endpoint implementation remains in generic API files
- [ ] VMware Resources tests pass
- [ ] VMware Infrastructure tests pass
- [ ] Lint and typecheck pass

## FlashSystem source

- [ ] Task 4: Move `/get_volumes` API, schema, mapper, model and hook
- [ ] Keep FlashSystem resource UI in `resources`
- [ ] Task 5: Move `/get_volume_tree` API, schema, model and hook
- [ ] Keep topology mapping and UI in `infrastructure`
- [ ] Verify both Resources and Infrastructure flows

## IBM Power source

- [ ] Task 6: Move `/get_power_vm` API, schema, mapper, model and hook
- [ ] Move VIOS exclusion test with the mapper
- [ ] Verify Power Resources and Infrastructure flows

## Checkpoint 2

- [ ] Every endpoint has exactly one source owner
- [ ] No source imports from Resources or Infrastructure
- [ ] Focused tests, lint and typecheck pass

## Integration cleanup

- [ ] Task 7: Replace mixed `useResourceInventoryQueries`
- [ ] FlashSystem page consumes FlashSystem source hook
- [ ] IBM Power page consumes IBM Power source hook
- [ ] Confirm no duplicate React Query requests
- [ ] Task 8: Remove obsolete generic APIs, hooks, schemas and mappers
- [ ] Remove or minimize `discoveryTypes.ts`
- [ ] Confirm no imports reference removed paths

## Final verification

- [ ] Task 9: Audit source/view dependency direction
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Production Vite build passes
- [ ] Manually verify request URLs, parameters and timing in Network panel
- [ ] Review final diff for accidental UI or behavior changes

