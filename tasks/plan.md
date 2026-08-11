# Implementation Plan: Feature-First Discovery & Inventory Structure

## Overview

Reorganize `src/features/discovery-inventory` to follow the same feature-first
convention as `recovery-plans`, `providers-connectors` and
`platform-administration`. The top-level folders will represent user-facing
sections: `resources`, `infrastructure` and, once implemented,
`discovery-jobs`. Technical layers (`api`, `components`, `hooks`, `helpers`,
`model`, `pages`) will live inside the feature that owns them.

This is a structural refactor. It must not change endpoint URLs, query
parameters, response mapping, React Query behavior, routes, filters, UI text or
request timing.

## Target Structure

```text
src/features/discovery-inventory/
├── resources/
│   ├── api/
│   │   ├── schemas/
│   │   ├── resourceInventoryQueryKeys.ts
│   │   ├── vmwareInventoryApi.ts
│   │   ├── vmwareTagsApi.ts
│   │   ├── vmStorageVolumesApi.ts
│   │   ├── flashSystemInventoryApi.ts
│   │   └── powerInventoryApi.ts
│   ├── components/
│   │   ├── vmware/
│   │   ├── flash-system/
│   │   └── ibm-power/
│   ├── config/
│   ├── helpers/
│   ├── hooks/
│   ├── model/
│   ├── pages/
│   └── skeletons/
│
├── infrastructure/
│   ├── api/
│   │   ├── schemas/
│   │   └── flashSystemVolumeTreeApi.ts
│   ├── components/
│   ├── helpers/
│   ├── hooks/
│   ├── layout/
│   ├── model/
│   └── pages/
│
└── discovery-jobs/      # only when the feature receives real implementation
```

After migration, the following generic top-level folders must not remain:

```text
discovery-inventory/api
discovery-inventory/helpers
discovery-inventory/hooks
discovery-inventory/model
discovery-inventory/pages
discovery-inventory/sources
```

## Ownership Rules

| Capability | Owning feature | Endpoint |
|---|---|---|
| VMware VM inventory | `resources` | `/vms`, `/vms_by_tag` |
| VMware tag filter data | `resources` | `/tags` |
| Storage volumes related to a VM | `resources` | `/vdisks_by_vm` |
| FlashSystem volume inventory | `resources` | `/get_volumes` |
| IBM Power partition inventory | `resources` | `/get_power_vm` |
| FlashSystem topology tree | `infrastructure` | `/get_volume_tree` |
| VMware folder inventory | Not implemented in this refactor | `/vms_in_folder` |

`Infrastructure` may consume the public inventory API and normalized resource
models owned by `resources`. Recovery groups may do the same because they select
resources for recovery groups. They must not import Resource UI components,
filters or page state.

## Dependency Direction

```text
config/API_ENDPOINTS
        │
        ├── resources/api → resources/model/helpers/hooks/components/pages
        │                         │
        │                         ├── infrastructure topology consumers
        │                         └── recovery-group resource consumers
        │
        └── infrastructure/api → infrastructure/model/helpers/hooks/components/pages
```

Allowed cross-feature dependency:

```text
infrastructure → resources/api + resources/model
recovery-groups → resources/api + resources/model
```

Forbidden dependencies:

```text
resources → infrastructure
infrastructure → resources/components|pages|config
resources/api → resources/components|pages
```

## Tasks

### Task 1: Lock the existing request contracts

**Description:** Establish a behavioral baseline before moving files. Existing
tests should explicitly protect URLs, query parameters, schemas, mapping and
query activation rules for all implemented inventory endpoints.

**Acceptance criteria:**
- [ ] Tests cover `/vms`, `/vms_by_tag`, `/tags`, `/vdisks_by_vm`,
  `/get_volumes`, `/get_power_vm` and `/get_volume_tree`.
- [ ] Tests cover provider IDs, tag parameters and the three-value activation
  rule for `/vdisks_by_vm`.
- [ ] Current React Query keys, stale times and enabled conditions are recorded
  by tests before any move.

**Verification:**
- [ ] `npm test -- src/features/discovery-inventory`
- [ ] `npm run typecheck`

**Dependencies:** None

**Files likely touched:** Existing API and hook tests only.

**Estimated scope:** Medium

### Task 2: Move VMware inventory into Resources

**Description:** Move VMware inventory transport, schema, mapper, types and hook
from generic top-level folders into the `resources` feature.

**Acceptance criteria:**
- [ ] `/vms` and `/vms_by_tag` are implemented in
  `resources/api/vmwareInventoryApi.ts`.
- [ ] VMware schema, normalized types and mapper live below `resources`.
- [ ] VMware Resources and Infrastructure continue using the same query keys
  and normalized inventory.

**Verification:**
- [ ] VMware API, schema, mapper and hook tests pass.
- [ ] VMware Resources page tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** VMware API/schema, mapper/model, hook and direct imports.

**Estimated scope:** Medium

### Task 3: Move VMware tags and VM storage discovery into Resources

**Description:** Move `/tags` and `/vdisks_by_vm` implementations, their
schemas, models, mappers and hooks into `resources`.

**Acceptance criteria:**
- [ ] Tags are owned by `resources/api/vmwareTagsApi.ts`.
- [ ] VM-related storage discovery is owned by
  `resources/api/vmStorageVolumesApi.ts`.
- [ ] Opening a VM detail remains the trigger for `/vdisks_by_vm`; no eager
  request is introduced.

**Verification:**
- [ ] Tags API/hook tests pass.
- [ ] VM storage API/hook tests pass.
- [ ] `VirtualMachineDetailPanel` tests pass.

**Dependencies:** Task 2

**Files likely touched:** Tags and VM-storage API/schema/model/mapper/hook files.

**Estimated scope:** Medium

### Checkpoint 1: VMware Resources

- [ ] VMware Resources page loads and filters exactly as before.
- [ ] VM detail issues `/vdisks_by_vm` only after selecting a VM and resolving
  both providers.
- [ ] Focused tests, lint and typecheck pass.

### Task 4: Move FlashSystem volume inventory into Resources

**Description:** Move `/get_volumes`, its schema, normalized models, mapper and
query hook into the `resources` feature. FlashSystem topology is intentionally
excluded from this task.

**Acceptance criteria:**
- [ ] `/get_volumes` is implemented only in
  `resources/api/flashSystemInventoryApi.ts`.
- [ ] Volume, pool, host and resolved mapping types live in `resources/model`.
- [ ] FlashSystem table, filters, details and metrics preserve existing behavior.

**Verification:**
- [ ] FlashSystem inventory API/schema/mapper tests pass.
- [ ] FlashSystem Resources component and page tests pass.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** FlashSystem resource API/schema/model/mapper/hook imports.

**Estimated scope:** Medium

### Task 5: Move IBM Power inventory into Resources

**Description:** Move `/get_power_vm`, its schema, normalized models, mapper and
query hook into the `resources` feature.

**Acceptance criteria:**
- [ ] `/get_power_vm` is implemented only in
  `resources/api/powerInventoryApi.ts`.
- [ ] IBM Power inventory and partition types live in `resources/model`.
- [ ] The existing VIOS exclusion remains unchanged and protected by its mapper
  regression test.

**Verification:**
- [ ] IBM Power API/schema/mapper tests pass.
- [ ] IBM Power Resources component and page tests pass.
- [ ] VIOS exclusion test passes.

**Dependencies:** Task 1

**Files likely touched:** Power API/schema/model/mapper/hook imports.

**Estimated scope:** Medium

### Checkpoint 2: Resources feature complete

- [ ] All resource inventory endpoint implementations live under `resources`.
- [ ] `resources` contains its own `api`, `components`, `helpers`, `hooks`,
  `model` and `pages` layers like the other project features.
- [ ] No Resources implementation imports from Infrastructure.
- [ ] Focused tests, lint and typecheck pass.

### Task 6: Move FlashSystem topology API into Infrastructure

**Description:** Move `/get_volume_tree`, its schema, topology response types and
query hook into the `infrastructure` feature.

**Acceptance criteria:**
- [ ] `/get_volume_tree` is implemented only in
  `infrastructure/api/flashSystemVolumeTreeApi.ts`.
- [ ] Tree views, nodes and count contracts live in `infrastructure/model`.
- [ ] Topology mapping, layout and UI continue consuming the same normalized
  tree data.

**Verification:**
- [ ] Volume-tree API/schema/hook tests pass.
- [ ] FlashSystem topology mapper tests pass.
- [ ] Infrastructure page tests pass.

**Dependencies:** Task 4

**Files likely touched:** Volume-tree API/schema/model/hook and topology imports.

**Estimated scope:** Medium

### Task 7: Update external inventory consumers

**Description:** Point Infrastructure and Recovery Groups at the public
Resources API/model boundary without importing Resource presentation internals.

**Acceptance criteria:**
- [ ] Infrastructure imports VMware and Power inventories only from
  `resources/api` and `resources/model`.
- [ ] Recovery Groups imports selectable inventory and related VM storage only
  from `resources/api` and `resources/model`.
- [ ] No consumer imports `resources/components`, `resources/pages` or private
  filter state.

**Verification:**
- [ ] Infrastructure inventory hook/page tests pass.
- [ ] Recovery-group resource inventory tests pass.
- [ ] `rg` confirms the allowed dependency paths.

**Dependencies:** Tasks 2–6

**Files likely touched:** Infrastructure inventory hook and recovery-group hooks/tests.

**Estimated scope:** Medium

### Task 8: Remove generic and rejected folder structures

**Description:** After all consumers use their owning feature, delete obsolete
generic top-level files and the rejected `sources` structure. Do not leave
compatibility re-export files without real consumers.

**Acceptance criteria:**
- [ ] Top-level `api`, `helpers`, `hooks`, `model`, `pages` and `sources` are
  absent from `discovery-inventory`.
- [ ] Every moved file has one canonical implementation and one canonical test.
- [ ] No import references an obsolete path.

**Verification:**
- [ ] `rg` finds no obsolete discovery-inventory import paths.
- [ ] `git status` shows moves/deletions only within the approved scope.
- [ ] `npm run lint && npm run typecheck`

**Dependencies:** Task 7

**Files likely touched:** Obsolete root files and remaining imports.

**Estimated scope:** Small

### Task 9: Full regression and architecture verification

**Description:** Verify the complete feature-first migration and confirm that it
changed organization only.

**Acceptance criteria:**
- [ ] All endpoint URLs and query parameters are unchanged.
- [ ] Resources and Infrastructure user flows behave as before.
- [ ] Directory ownership matches the sidebar/navigation structure.
- [ ] No duplicate API implementation, query hook or model remains.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `vite build` or the repository's complete `npm run build`
- [ ] Manual Network-panel check for request timing and duplicate requests.

**Dependencies:** Task 8

**Files likely touched:** Tests only if a missing regression is discovered.

**Estimated scope:** Small

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Import churn accidentally changes behavior | High | Move one endpoint slice at a time and run focused tests after each task. |
| React Query keys change during file moves | High | Preserve key values and test them before and after migration. |
| Infrastructure couples to Resources UI | High | Allow imports only from `resources/api` and `resources/model`. |
| FlashSystem inventory and topology types are mixed | Medium | Split `/get_volumes` contracts into Resources and `/get_volume_tree` contracts into Infrastructure. |
| Duplicate compatibility files survive | Medium | Final `rg` audit requires exactly one implementation per endpoint. |
| Unrelated provider work enters the commit | Medium | Stage only discovery-inventory, its direct recovery-group imports and corrected plan files. |

## Out of Scope

- Implementing `/vms_in_folder`.
- Creating placeholder code for Discovery Jobs.
- Backend endpoint renaming.
- UI, navigation, route, translation, filter or pagination changes.
- Changing when requests run or how failures are displayed.

## Completion Definition

- The folder tree mirrors the Discovery & Inventory navigation.
- Resources and Infrastructure are self-contained features with conventional
  internal layers.
- Shared consumers use explicit public API/model boundaries.
- All tests, lint, typecheck and production build pass.
