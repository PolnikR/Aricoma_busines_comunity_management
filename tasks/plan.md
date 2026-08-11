# Implementation Plan: Discovery Inventory Source Boundaries

## Overview

Reorganize `src/features/discovery-inventory` so backend-facing code is owned by a
technology source (`vmware`, `flash-system`, `ibm-power`) while the `resources`
and `infrastructure` folders remain presentation layers. This is a structural
refactor only: endpoint URLs, request parameters, response validation, React
Query behavior, user-visible text, routes and UI behavior must remain unchanged.

## Target Structure

```text
src/features/discovery-inventory/
├── sources/
│   ├── vmware/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── model/
│   │   └── helpers/
│   ├── flash-system/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── model/
│   │   └── helpers/
│   └── ibm-power/
│       ├── api/
│       ├── hooks/
│       ├── model/
│       └── helpers/
├── resources/       # tables, filters, detail panels and resource-page state
└── infrastructure/  # topology UI, layout and topology mapping
```

Tests stay next to the units they verify. Zod schemas belong under the relevant
source's `api/schemas` folder. Shared UI and cross-source presentation contracts
remain outside `sources`.

## Architecture Decisions

- Organize transport, validation, mapping, source models and server-state hooks
  by technology, not by endpoint name or consuming screen.
- Keep `API_ENDPOINTS` centralized in `src/config/apiEndpoints.ts`; endpoint
  strings are application configuration, while request behavior belongs to each
  source API module.
- Use semantic FE names rather than copying imprecise backend names. Examples:
  `fetchPowerInventory` may call `/get_power_vm`, and `useVmStorageVolumes` may
  call `/vdisks_by_vm`.
- Preserve React Query keys during the migration where possible, so moving files
  does not invalidate cache behavior or create duplicate requests.
- `resources` and `infrastructure` may import from `sources`; source modules must
  never import presentation modules.
- Avoid broad barrel files initially. Direct imports make ownership and cycles
  visible. A small public `index.ts` may be added only if it creates a proven,
  stable boundary.
- Do not implement the currently unused `/vms_in_folder` endpoint as part of
  this refactor.

## Dependency Flow

```text
API_ENDPOINTS
    ↓
sources/<technology>/api + schemas
    ↓
sources/<technology>/helpers + model
    ↓
sources/<technology>/hooks
    ↓
resources and infrastructure presentation
```

## Tasks

### Task 1: Establish a behavioral baseline

**Description:** Confirm and, only where necessary, strengthen tests around the
current requests and query activation rules before moving files.

**Acceptance criteria:**
- [ ] Tests assert endpoint, query parameters and mapping for `/vms`,
  `/vms_by_tag`, `/tags`, `/vdisks_by_vm`, `/get_volumes`,
  `/get_volume_tree` and `/get_power_vm`.
- [ ] Hook tests cover their current `enabled`, query-key and cache settings.
- [ ] No production behavior is changed.

**Verification:**
- [ ] `npm test -- src/features/discovery-inventory`
- [ ] `npm run typecheck`

**Dependencies:** None

**Files likely touched:** Existing API and hook tests only.

**Estimated scope:** Medium

### Task 2: Move VMware inventory ownership

**Description:** Create the VMware source boundary for VM inventory, including
the response schema, mapper, model and React Query hook. Rename the misleading
`useDiscoveryInventory` to `useVmwareInventory` while preserving its behavior.

**Acceptance criteria:**
- [ ] `/vms` and `/vms_by_tag` are called only from `sources/vmware/api`.
- [ ] VMware inventory schema, mapper and source models live below
  `sources/vmware`.
- [ ] Resources and Infrastructure use `useVmwareInventory` or the VMware API
  through the source boundary.

**Verification:**
- [ ] VMware API, mapper and hook tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** VMware API/schema, mapper/model, hook and their tests.

**Estimated scope:** Medium, implemented as file moves plus import updates.

### Task 3: Move VMware tags and VM storage discovery

**Description:** Complete the VMware source boundary by moving tag lookup and
the `/vdisks_by_vm` integration out of the generic and `resources` folders.
Adopt semantic names that identify the returned storage relationship.

**Acceptance criteria:**
- [ ] `/tags` is owned by `sources/vmware/api` and exposed through
  `useVmwareTags`.
- [ ] `/vdisks_by_vm` is owned by `sources/vmware/api` and exposed through
  `useVmStorageVolumes`.
- [ ] Opening a VM detail remains the trigger for `/vdisks_by_vm`, including
  the requirement for VM name, VMware provider ID and FlashSystem provider ID.

**Verification:**
- [ ] Tags API/hook tests pass.
- [ ] VM storage API/hook and `VirtualMachineDetailPanel` tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 2

**Files likely touched:** Tags and vdisk API, schemas, mappers, models, hooks and
their direct consumers.

**Estimated scope:** Medium

### Checkpoint 1: VMware boundary

- [ ] `rg` finds no VMware endpoint implementation in the old generic API.
- [ ] VMware Resources and VMware Infrastructure render with unchanged data.
- [ ] Opening VM detail issues at most the same request set as before.
- [ ] Focused tests, lint and typecheck pass.

### Task 4: Move FlashSystem volume inventory ownership

**Description:** Move `/get_volumes`, its validation, mapping, models and query
hook into `sources/flash-system`, keeping table/filter/detail UI in `resources`.

**Acceptance criteria:**
- [ ] `/get_volumes` is called only from `sources/flash-system/api`.
- [ ] FlashSystem volume response types do not remain in the generic
  `discoveryTypes.ts` file.
- [ ] Provider selection, query keys, stale time and failure behavior remain
  unchanged.

**Verification:**
- [ ] FlashSystem API/schema/mapper/hook tests pass.
- [ ] FlashSystem resource page tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** FlashSystem volume API/schema, mapper/model, hook and
resource-page imports.

**Estimated scope:** Medium

### Task 5: Move FlashSystem topology ownership

**Description:** Move `/get_volume_tree`, its schema and source response models
under `sources/flash-system`; keep topology conversion and visualization under
`infrastructure` because they are presentation-specific.

**Acceptance criteria:**
- [ ] `/get_volume_tree` is called only from `sources/flash-system/api`.
- [ ] `useFlashSystemVolumeTree` resides in the FlashSystem source boundary.
- [ ] Infrastructure topology helpers consume source models without importing
  source implementation details from Resources.

**Verification:**
- [ ] Volume-tree API/schema/hook tests pass.
- [ ] FlashSystem topology mapping and Infrastructure page tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 4

**Files likely touched:** FlashSystem tree API/schema/model/hook and Infrastructure
imports.

**Estimated scope:** Medium

### Task 6: Move IBM Power inventory ownership

**Description:** Move `/get_power_vm`, its schema, mapper, models and hook to
`sources/ibm-power`. Preserve the existing VIOS exclusion and document it close
to the Power mapper tests.

**Acceptance criteria:**
- [ ] `/get_power_vm` is called only from `sources/ibm-power/api`.
- [ ] IBM Power schema, mapper and models live below `sources/ibm-power`.
- [ ] VIOS records remain excluded and the regression test moves with the
  mapper.

**Verification:**
- [ ] IBM Power API/schema/mapper/hook tests pass.
- [ ] Power Resources and Infrastructure tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** Power API/schema, mapper/model, hook and presentation
imports.

**Estimated scope:** Medium

### Checkpoint 2: All source boundaries

- [ ] Each backend endpoint has exactly one owning source API module.
- [ ] Resources and Infrastructure use source hooks without cross-importing
  each other's internals.
- [ ] Focused tests, lint and typecheck pass.

### Task 7: Replace the mixed resource query coordinator

**Description:** Remove the FlashSystem/Power-specific branching from the
misleading `useResourceInventoryQueries`. Each source page should consume its
own source hook; only genuinely shared presentation state stays in Resources.

**Acceptance criteria:**
- [ ] No hook selects an API implementation using a provider-type ternary.
- [ ] FlashSystem and IBM Power source pages invoke their technology-specific
  hooks.
- [ ] Provider filtering and partial/error UI behavior remain unchanged.

**Verification:**
- [ ] Resource page, source tab and source-page tests pass.
- [ ] React Query tests confirm no duplicate request is introduced.
- [ ] `npm run typecheck`

**Dependencies:** Tasks 4 and 6

**Files likely touched:** Resource query coordinator, FlashSystem page, IBM Power
page and associated tests.

**Estimated scope:** Medium

### Task 8: Remove obsolete generic data-layer files

**Description:** Delete old files only after every consumer has migrated, then
reduce shared types and helpers to contracts genuinely used across sources.

**Acceptance criteria:**
- [ ] Old `discoveryInventoryApi.ts`, obsolete generic hooks and superseded
  schemas/mappers are removed.
- [ ] `discoveryTypes.ts` is removed or contains only true cross-source types.
- [ ] No compatibility re-export remains without a documented consumer.

**Verification:**
- [ ] `rg` confirms no imports from removed paths.
- [ ] `npm run lint`
- [ ] `npm run typecheck`

**Dependencies:** Tasks 2–7

**Files likely touched:** Obsolete generic files and remaining imports.

**Estimated scope:** Small

### Task 9: Full regression verification and architecture audit

**Description:** Verify the structural refactor end to end and ensure it did not
change runtime behavior or introduce circular dependencies.

**Acceptance criteria:**
- [ ] All seven documented endpoints still use the same URL and parameters.
- [ ] VMware, FlashSystem and IBM Power Resources flows work.
- [ ] VMware, FlashSystem and IBM Power Infrastructure flows work.
- [ ] No source module imports from `resources` or `infrastructure`.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `vite build` (or `npm run build` once the preceding commands are green)
- [ ] Manual Network-panel check for request timing and duplicate calls.

**Dependencies:** Task 8

**Files likely touched:** Tests only if a missing regression is discovered.

**Estimated scope:** Small

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Large import churn hides a behavior change | High | Move one technology at a time and run focused tests after every task. |
| Query keys change and trigger duplicate requests | High | Preserve key factories and asserted key values until the migration is complete. |
| Circular dependency between sources and views | High | Enforce one-way imports: views → sources; never sources → views. |
| Shared `discoveryTypes.ts` is split incorrectly | Medium | Move a type only with its schema/mapper slice; retain truly cross-source contracts temporarily. |
| Git moves conflict with unrelated work | Medium | Do not touch current provider-test modifications; review `git status` before every slice. |
| Naming follows backend implementation accidents | Medium | Use domain names in files and keep endpoint strings only in `API_ENDPOINTS`. |

## Out of Scope

- Backend endpoint renaming.
- Implementing `/vms_in_folder`.
- UI text, layout, routing or filter behavior changes.
- Changing client-side/server-side filtering decisions.
- Adding new providers or resource types.

## Completion Definition

- Every backend-facing inventory capability has one clearly owned source module.
- Resources and Infrastructure remain independent presentation layers.
- Existing runtime behavior and query semantics are protected by tests.
- Lint, typecheck, full tests and production build pass.

