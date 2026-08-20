# Implementation Plan: VMware Provider Default Inventory Filters

Issue: https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/4

## Overview

Use each selected VMware provider's `vmPrefix` and first `vmTags` value as
editable initial filters in Resources and Resources ISE. Keep URL/default state
and remote inventory loading in two deep modules. The URL-filter module applies
provider defaults once and then preserves user changes. The VMware inventory
module hides endpoint selection, debounce, cache identity, response
normalization, and the client-side prefix filter required for tag-plus-name.

## Architecture Decisions

- Keep `useVirtualMachineSearchParams` as the URL-state seam and extend its
  interface with a provider scope plus optional initial search and tag values.
- Add one unified VMware inventory hook instead of branching between query
  hooks in `VmwareResourcesPage`.
- Keep Resources single-tag. Normalize URL state to at most one tag and use
  only trimmed `provider.vmTags?.[0]` as the provider default.
- Treat the VMware search value as a case-sensitive VM-name prefix. It no
  longer performs broad substring matching over hostname, IP, guest OS, host,
  and VM name.
- Select exactly one remote operation from the active filters:
  - no name, no tag -> `/vms`
  - name only -> debounced `/vms_by_name`
  - tag only -> `/vms_by_tag`
  - tag and name -> `/vms_by_tag`, then client-side `name.startsWith(prefix)`
- Reuse the existing API wrappers, generated clients, response schema, mapper,
  and query-key factories. Do not add a transport abstraction or dependency.
- Keep query cache entries keyed only by remote request inputs. In tag mode,
  the client-only name prefix must not alter or overwrite the cached tag data.
- Use the existing VMware cache policy: 15-minute stale time, 60-minute garbage
  collection, one retry, and no window-focus refetch.
- Do not silently fall back to `/vms` after a filtered request fails.

## Dependency Graph

```text
Provider-scoped URL defaults
        |
        +----------------------------+
                                     v
Existing VMware API wrappers --> Unified VMware inventory hook
                                     |
Legacy post-inventory search removal -+
                                     v
                         VmwareResourcesPage integration
                                     |
                                     v
                    Resources + Resources ISE verification
```

## Task 1: Add provider-scoped defaults to the URL-filter module

**Description:** Extend the VMware URL-filter hook so a selected provider can
initialize search and one tag exactly once. Explicit URL filters win, user
clears remain cleared during the current provider activation, and old URLs
containing multiple tags normalize to their first tag.

**Acceptance criteria:**

- [ ] A provider scope can initialize trimmed `vmPrefix` and trimmed
      `vmTags[0]` when the corresponding URL filters are absent.
- [ ] Explicit URL values are preserved, only one active tag is exposed, and
      clearing a default does not cause it to reappear on rerender.
- [ ] Changing provider scope permits the new provider defaults to initialize
      after the existing tab flow clears the previous provider filters.

**Verification:**

- [ ] `C:\Users\polnikr\nodejs\npm.cmd exec vitest run src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`
- [ ] Focused lint for the hook and its test.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`

**Estimated scope:** Small (2 files)

## Task 2: Build the unified VMware inventory module

**Description:** Add one deep query hook that accepts provider ID, current name
prefix, current tag, and enabled state. It selects one endpoint, debounces only
name-only requests, normalizes every response to `DiscoveryInventory`, and
applies the client-only prefix in tag-plus-name mode without polluting cache.

**Acceptance criteria:**

- [ ] The four filter combinations select exactly the operation specified by
      the endpoint matrix and never issue concurrent name and tag requests.
- [ ] Name-only requests wait approximately 300 ms; tag-plus-name search
      changes reuse the same tag request and filter the canonical result.
- [ ] Query keys contain only remote inputs, all modes share the established
      cache policy, disabled/missing-provider states do not fetch, and refetch
      repeats only the current operation.

**Verification:**

- [ ] `C:\Users\polnikr\nodejs\npm.cmd exec vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [ ] Focused lint for the new hook and test.

**Dependencies:** None; uses existing API/query modules

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Estimated scope:** Small (2 files)

## Checkpoint: Deep-module contracts

- [ ] Run Task 1 and Task 2 focused tests together.
- [ ] Confirm tests exercise the public hook interfaces rather than private
      request-plan details.
- [ ] Run focused lint for all Task 1-2 files.
- [ ] Review the two interfaces before integrating the page.

## Task 3: Remove legacy search from post-inventory filtering

**Description:** Remove the old broad search predicate from the post-inventory
filter/pagination helper because name-prefix behavior now belongs behind the
unified inventory seam. Preserve all remaining client filters, pagination
clamping, and the single-tag/untagged behavior.

**Acceptance criteria:**

- [ ] The post-inventory helper no longer performs VM name, hostname, IP,
      guest OS, or host search; remote/client prefix handling occurs only in
      the unified inventory module.
- [ ] Case-sensitive `vm.name.startsWith(prefix)` behavior is covered at the
      inventory hook interface for tag-plus-name mode.
- [ ] Existing power, connection, cluster, tag, untagged, and pagination
      behavior remains unchanged.

**Verification:**

- [ ] `C:\Users\polnikr\nodejs\npm.cmd exec vitest run src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts`
- [ ] Focused lint for the helper and affected tests.

**Dependencies:** Task 2 defines the prefix behavior; must complete before Task 4

**Files likely touched:**

- `src/features/discovery-inventory/resources/helpers/filterVirtualMachines.ts`
- `src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts`
- `src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts`

**Estimated scope:** Medium (3 files)

## Task 4: Integrate both deep modules into VMware Resources

**Description:** Resolve the selected VMware provider record, pass its defaults
to the URL-filter module, and load inventory through the unified hook. Keep
provider-specific tag options, page state correction, metrics, errors, retry,
detail panels, and toolbar behavior intact. Remove the old page-only inventory
hook if the integration makes it orphaned.

**Acceptance criteria:**

- [ ] Resources and Resources ISE initialize `search` and the single tag from
      the selected provider, while explicit URL filters and subsequent user
      changes remain authoritative.
- [ ] The page consumes one normalized inventory result and contains no
      endpoint-selection, debounce, or query-key logic.
- [ ] Existing loading, previous-data notice, empty, error, retry, refresh,
      pagination, table, metrics, and detail-panel behavior remains covered.

**Verification:**

- [ ] `C:\Users\polnikr\nodejs\npm.cmd exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- [ ] Focused lint for the VMware page and affected page/component tests.

**Dependencies:** Tasks 1-3

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx`
- `src/features/discovery-inventory/resources/hooks/useVmwareInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareInventory.test.tsx`

**Estimated scope:** Medium (up to 5 files)

## Checkpoint: Integrated VMware flow

- [ ] Run all Task 1-4 focused tests together.
- [ ] Verify all four endpoint combinations through the unified inventory seam.
- [ ] Verify source and target provider defaults through the shared VMware page.
- [ ] Confirm IBM Power, FlashSystem, provider forms, and recovery-plan
      inventory consumers are unchanged.

## Task 5: Complete focused verification and cleanup

**Description:** Verify the integrated feature at the smallest scope that
proves the changed contracts, remove only newly orphaned code, and record any
manual/browser limitation without running the full suite or production build
by default.

**Acceptance criteria:**

- [ ] Every issue #4 acceptance path is covered by a focused automated test.
- [ ] No duplicate VMware inventory request path remains in the Resources page,
      and no unrelated module is refactored.
- [ ] The worktree contains only issue #4 implementation and test changes.

**Verification:**

- [ ] Run the complete focused Vitest set from Tasks 1-4 plus
      `src/features/discovery-inventory/resources/api/vmsByNameApi.test.ts` and
      `src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`.
- [ ] `C:\Users\polnikr\nodejs\npm.cmd run typecheck`
- [ ] Run ESLint only for changed TypeScript/TSX files.
- [ ] `git diff --check`
- [ ] Review `git diff --stat` and `git status --short` before staging.

**Dependencies:** Tasks 1-4

**Files likely touched:** None beyond focused cleanup caused by Tasks 1-4

**Estimated scope:** Small (verification)

## Final Checkpoint

- [ ] Provider defaults are applied once and remain editable.
- [ ] Resources supports one active tag and uses only `vmTags[0]` as default.
- [ ] Endpoint selection matches the four-row matrix with one remote request.
- [ ] Name-only requests are debounced and tag-plus-name changes reuse cache.
- [ ] VMware search follows case-sensitive VM-name prefix semantics.
- [ ] Focused tests, typecheck, focused lint, and diff checks pass.
- [ ] Full-suite/build and browser-verification status is reported explicitly.
- [ ] Only in-scope files are committed atomically.

## Parallelization Opportunities

- Tasks 1 and 2 touch independent files and may be implemented in parallel.
- Task 3 follows Task 2 because the unified inventory seam must own prefix
  behavior before the downstream broad search is removed.
- Task 4 is sequential because it integrates the outputs of Tasks 1-3 in the
  shared VMware page.
- Task 5 is sequential because it verifies the integrated result and cleanup.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Defaults reappear after a user clears them | High | Track provider-scoped initialization and test clear/rerender behavior. |
| An unfiltered request fires before defaults initialize | High | Expose initialization readiness and keep inventory disabled until ready. |
| Tag-plus-name creates two requests or cache fragmentation | High | Give tag remote priority and exclude client-only name from the tag query key. |
| Debounced name state races with tag changes | High | Test transitions with fake timers and derive one request mode per render. |
| Name response leaks a generated shape | Medium | Normalize all paths to `DiscoveryInventory` inside the unified hook. |
| Search behavior changes unexpectedly | Medium | Lock case-sensitive prefix behavior at the inventory seam and assert that the downstream helper no longer searches other fields. |
| Target/source behavior diverges | Medium | Integrate once in the shared VMware page and test both wrappers. |
| Existing recovery inventory cache changes | Medium | Preserve existing query-key factories and avoid modifying direct recovery consumers. |

## Open Questions

- None. Issue #4 defines the endpoint precedence, single-tag scope, provider
  default behavior, search semantics, cache policy, and out-of-scope work.

## Definition of Done

- [ ] Each task's acceptance criteria and focused verification pass.
- [ ] Tests observe behavior through the two deep-module interfaces.
- [ ] Existing API contracts and provider schemas remain unchanged.
- [ ] No full-suite or build claim is made unless those commands were run.
- [ ] The final atomic commit excludes unrelated worktree changes.
