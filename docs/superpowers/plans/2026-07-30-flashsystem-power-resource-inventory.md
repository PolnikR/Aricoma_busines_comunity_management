# Implementation Plan: FlashSystem and IBM Power Resource Inventory

## Overview

Implement the approved provider-scoped resource inventory design for FlashSystem volumes and IBM Power partitions. The work keeps VMware behavior stable, validates and normalizes the supplied payloads, fetches only the selected source, and adds source-specific metrics, filters, tables, details, and EN/SK/CS copy. No git commit is part of this plan.

## Architecture Decisions

- Keep source-specific schemas, mappers, field registries, and presentation components behind one Resources page shell.
- Cache each provider independently under `['resource-inventory', providerType, providerId]`; aggregate successful queries in memory.
- Preserve raw API values and unknown additive fields, while exposing typed normalized records to UI code.
- Display IBM Power `VolumeCapacity` exactly as supplied because the API does not declare its unit.
- Derive FlashSystem pool and host relations during mapping so filters, metrics, table cells, and details share one canonical result.

## Dependency Graph

```text
Complete payload fixtures
  └─ schemas and raw types
      └─ normalized resource types and mappers
          ├─ provider-scoped query hook
          ├─ filters and metrics
          └─ columns and detail field registries
              └─ source-specific UI components
                  └─ ResourcesPage integration and translations
                      └─ full quality gates
```

## Task 1: Register and validate complete API payloads

**Description:** Expand FlashSystem and IBM Power Zod schemas and TypeScript raw types from the supplied complete payloads. Add a typed Power field registry containing every observed field and its UI metadata.

**Acceptance criteria:**

- [ ] Every supplied FlashSystem field, pool, host, cluster, and host mapping validates.
- [ ] Every observed IBM Power field is represented in `powerFieldRegistry.ts`.
- [ ] Unknown additive response fields are preserved without weakening required identity fields.

**Verification:**

- [ ] Schema tests parse both supplied complete fixtures.
- [ ] Registry coverage test proves every fixture key is registered.
- [ ] `npm run typecheck` passes.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/api/schemas/flashSystemInventorySchema.ts`
- `src/features/discovery-inventory/api/schemas/powerInventorySchema.ts`
- `src/features/discovery-inventory/model/discoveryTypes.ts`
- `src/features/discovery-inventory/resources/config/powerFieldRegistry.ts`
- colocated schema tests and fixtures

**Estimated scope:** Medium

## Task 2: Normalize FlashSystem volume inventory

**Description:** Map raw volumes into stable provider-aware resources, resolve pools/hosts/clusters, and add conservative capacity parsing for unit-bearing FlashSystem values.

**Acceptance criteria:**

- [ ] Volume identity includes provider and volume ID.
- [ ] Pool and host mappings resolve names and cluster context while retaining raw IDs.
- [ ] Capacity totals use only recognized units and deduplicate provider/pool pairs.

**Verification:**

- [ ] Mapper tests cover resolved and unresolved relations.
- [ ] Capacity tests cover TB, GB, MB, zero, invalid, and unitless values.
- [ ] Targeted tests pass.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/discovery-inventory/helpers/mapFlashSystemInventory.ts`
- `src/features/discovery-inventory/resources/helpers/parseCapacity.ts`
- `src/features/discovery-inventory/model/discoveryTypes.ts`
- colocated tests

**Estimated scope:** Medium

## Task 3: Normalize IBM Power partition inventory

**Description:** Select the populated `lpar` or `vios` record, assign partition kind, retain raw data, and expose typed normalized fields used by the Resources UI.

**Acceptance criteria:**

- [ ] LPAR and VIOS records receive stable provider-aware identities.
- [ ] Empty and both-populated payload shapes are handled deterministically.
- [ ] `VolumeCapacity` remains an unformatted raw string.

**Verification:**

- [ ] Mapper tests cover LPAR, VIOS, empty, both-populated, and duplicate-name cases.
- [ ] Tests distinguish `State` from `PartitionState`.
- [ ] Targeted tests pass.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/discovery-inventory/helpers/mapPowerInventory.ts`
- `src/features/discovery-inventory/model/discoveryTypes.ts`
- colocated tests

**Estimated scope:** Small

## Checkpoint: Data foundation

- [ ] Schema, registry, mapper, and capacity tests pass.
- [ ] Typecheck passes.
- [ ] No existing VMware tests regress.

## Task 4: Add lazy provider-scoped query aggregation

**Description:** Add canonical resource query keys and a hook that queries providers belonging to the active tab, combines successful data, and reports loading, fetching, total failure, and partial failure separately.

**Acceptance criteria:**

- [ ] Only providers for the active resource tab are queried.
- [ ] Each provider uses `['resource-inventory', providerType, providerId]`, 15-minute stale time, 60-minute GC, one retry, and no focus refetch.
- [ ] Successful provider results remain usable when another provider fails.

**Verification:**

- [ ] Hook tests prove lazy tab fetching and exact keys/options.
- [ ] Hook tests prove cache reuse and partial-error aggregation.
- [ ] Existing API tests pass.

**Dependencies:** Tasks 2 and 3

**Files likely touched:**

- `src/features/discovery-inventory/api/discoveryInventoryQueryKeys.ts`
- `src/features/discovery-inventory/hooks/useResourceInventoryQueries.ts`
- `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- colocated tests

**Estimated scope:** Medium

## Task 5: Build FlashSystem resource slice

**Description:** Add FlashSystem filters, metrics, columns, toolbar integration, table rendering, and a grouped accessible detail panel using normalized relations.

**Acceptance criteria:**

- [ ] Requested relevant columns and provider identity render responsively.
- [ ] Search, provider, pool, host, and status filters work with pagination.
- [ ] Metrics and grouped detail include pool capacity/used/free and resolved host/cluster information.

**Verification:**

- [ ] Helper tests cover filtering, pagination, and metric aggregation.
- [ ] Component tests cover columns, empty values, detail groups, and accessible controls.
- [ ] Manual keyboard and 320/768/1024/1440 px checks pass.

**Dependencies:** Tasks 2 and 4

**Files likely touched:**

- `src/features/discovery-inventory/resources/config/flashSystemColumns.tsx`
- `src/features/discovery-inventory/resources/config/flashSystemDetailFields.ts`
- `src/features/discovery-inventory/resources/helpers/filterFlashSystemVolumes.ts`
- `src/features/discovery-inventory/resources/components/FlashSystemMetrics.tsx`
- `src/features/discovery-inventory/resources/components/FlashSystemVolumeDetailPanel.tsx`

**Estimated scope:** Medium, split into helpers/config and components if needed

## Task 6: Build IBM Power resource slice

**Description:** Add IBM Power filters, metrics, requested columns, and a grouped accessible detail panel driven by the complete field registry.

**Acceptance criteria:**

- [ ] Table shows partition name/kind, OS type, device, boot mode, hypervisor power-on, raw volume capacity, volume name, and volume state.
- [ ] Search and provider/kind/partition-state/OS/volume-state filters work with pagination.
- [ ] Detail includes interface state, IP, subnet, bootable, maximum virtual I/O slots, and all remaining registered fields by group.

**Verification:**

- [ ] Helper tests cover filtering, pagination, and metrics.
- [ ] Component tests confirm raw `270648` without an added unit.
- [ ] Component tests confirm accessible detail labels and keyboard controls.

**Dependencies:** Tasks 3 and 4

**Files likely touched:**

- `src/features/discovery-inventory/resources/config/powerColumns.tsx`
- `src/features/discovery-inventory/resources/config/powerDetailFields.ts`
- `src/features/discovery-inventory/resources/helpers/filterPowerPartitions.ts`
- `src/features/discovery-inventory/resources/components/IbmPowerMetrics.tsx`
- `src/features/discovery-inventory/resources/components/IbmPowerDetailPanel.tsx`

**Estimated scope:** Medium, split into helpers/config and components if needed

## Checkpoint: Source slices

- [ ] FlashSystem and IBM Power targeted tests pass.
- [ ] Loading, empty, full-error, and partial-error states are represented.
- [ ] Tables and drawers remain usable at required breakpoints.

## Task 7: Integrate source slices into ResourcesPage

**Description:** Refactor the page into a shared shell that selects the correct query result and source-specific presentation without changing existing VMware behavior.

**Acceptance criteria:**

- [ ] Tab changes reset incompatible filters and selected detail state.
- [ ] Cached source data is reused when returning to a tab.
- [ ] VMware, FlashSystem, and IBM Power each render their own metrics, toolbar, table, pagination, and detail.

**Verification:**

- [ ] ResourcesPage tests cover all tabs and lazy fetching.
- [ ] Partial and total failure tests pass.
- [ ] Existing VMware page tests remain green or are updated only for intentional generic copy.

**Dependencies:** Tasks 4, 5, and 6

**Files likely touched:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- shared resource toolbar/table/search-param files where reuse is justified

**Estimated scope:** Medium

## Task 8: Add source-specific localization

**Description:** Replace generic VMware-only page wording with source-aware Resources, FlashSystem volume, and IBM Power partition text in all supported locales.

**Acceptance criteria:**

- [ ] EN, SK, and CS contain matching keys for headers, filters, metrics, columns, details, errors, loading, and empty states.
- [ ] No new user-facing string is hard-coded in a component.
- [ ] Existing unrelated translation keys remain intact.

**Verification:**

- [ ] Translation parity test passes.
- [ ] Component tests render representative translated labels.
- [ ] Typecheck/lint pass.

**Dependencies:** Tasks 5, 6, and 7

**Files likely touched:**

- current English, Slovak, and Czech locale files under `src`
- translation parity tests

**Estimated scope:** Small

## Task 9: Production verification and review

**Description:** Run all quality gates, fix regressions within scope, and review the complete uncommitted diff for correctness, accessibility, maintainability, and accidental unrelated changes.

**Acceptance criteria:**

- [ ] Targeted and full test suites pass.
- [ ] Lint, typecheck, and production build pass without warnings.
- [ ] Git diff contains only intended source, test, fixture, plan, and localization changes; no commit is created.

**Verification:**

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] final code review against the approved design

**Dependencies:** Tasks 1–8

**Files likely touched:** Any in-scope file requiring a verified fix

**Estimated scope:** Medium

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Power payload uses many repeated or inconsistently typed values | High | Preserve raw values, centralize field metadata, normalize only display-critical fields |
| Capacity values have inconsistent or absent units | High | Parse only explicit recognized units; keep raw strings; never invent Power units |
| Existing VMware page is tightly coupled to its URL state | Medium | Preserve VMware hook/components first, isolate new source state, add regression tests |
| Multiple provider failures create confusing state | Medium | Model full and partial failure independently and label failed providers |
| Very wide tables become unusable | Medium | Curate columns, retain full details in drawer, preserve horizontal overflow and responsive controls |
| Translation files drift | Medium | Add identical namespaces and parity assertions for EN/SK/CS |

## Open Questions Resolved by Approved Design

- IBM Power `VolumeCapacity` unit: unknown; display raw value only.
- Inventory size: approximately 200 per source/provider; use client-side operations.
- Recovery Groups reuse: share provider-scoped query cache, without coupling fetch logic to group validation rules.
- Field completeness: register all supplied fields, show only relevant defaults, expose the rest in grouped details.

## Final Checkpoint

- [ ] All approved design acceptance criteria are met.
- [ ] Accessibility and responsive checks pass.
- [ ] No git commit was created for implementation changes.
- [ ] Changes are ready for human review.
