# Implementation Plan: Stable Provider-Scoped Resource Filters

## Overview

Repair the resource inventory regressions by giving every provider its own
filter state, keeping the active provider state shareable in the URL, and
preserving inactive provider states in `sessionStorage`. VMware search must
remain mounted and focused while its debounced request changes, cached data
must remain visible during refetches, and a configured target tag must not be
silently deleted when the tags endpoint does not currently return it.

The scope covers Resources (`source`) and Resources ISE (`target`) and all
provider tabs. VMware receives the additional default/search/tag behavior;
FlashSystem and IBM Power only gain provider-scoped restoration of their
existing filters. No backend or OpenAPI change is required.

## Confirmed Root Causes

1. `useResourceTabSearchParam` deletes the union of resource filter parameters
   whenever the active provider changes. A single URL state therefore cannot
   restore the previous state of multiple providers.
2. Name-only search creates a new query without data during its 300 ms
   debounce. The page treats that legitimate pending state as an error and
   later replaces the complete inventory panel with a loading skeleton,
   unmounting the focused search input.
3. VMware queries do not retain previous data across remote query-key changes,
   so provider/search transitions visibly discard otherwise usable results.
4. `VmwareResourcesPage` removes a selected tag when `/tags` does not include
   it. This silently changes tag-plus-name mode into name-only mode in
   Resources ISE.

## Architecture Decisions

- Use a versioned session key derived from
  `role:resourceTab:providerId`; source and target providers can never share
  state accidentally.
- Store a discriminated snapshot for each resource type. Empty values are
  valid saved state, so clearing filters never re-applies provider defaults.
- Resolve initial state in this order:
  1. explicit active-provider filters already present in the URL;
  2. saved provider snapshot, including an explicitly empty snapshot;
  3. VMware `vmPrefix` plus only `vmTags[0]`;
  4. the resource type's empty defaults.
- Keep only the active provider's filters in the URL. On provider selection,
  clear the previous provider's URL filter parameters; the newly mounted
  resource hook restores the target snapshot/default while inventory queries
  remain gated by initialization readiness.
- Persist snapshots whenever committed filters change. Page and pagination
  fields are not provider filters; page resets to 1 on provider/filter change.
- Keep VMware's toolbar and prior inventory mounted during debounce/refetch.
  Expose query lifecycle explicitly (`isDebouncing`, initial pending,
  background fetching) and never infer an error from missing data alone.
- Use React Query cache identity only for remote inputs. Returning to a fresh
  cached provider/filter combination must not issue a request.
- Preserve a configured/selected VMware tag even when the tags endpoint omits
  it. Include the selected tag as a fallback dropdown option and let the
  inventory endpoint return an empty result when no VM matches.

## Provider Snapshot Contracts

```ts
type ProviderFilterScope = {
  role: 'source' | 'target'
  resourceTab: 'vmware' | 'flashsystem' | 'ibm-power'
  providerId: string
}

type ProviderFilterSnapshot =
  | { resourceTab: 'vmware'; initialized: true; filters: VirtualMachineFilters }
  | { resourceTab: 'flashsystem'; initialized: true; filters: FlashSystemFilters }
  | { resourceTab: 'ibm-power'; initialized: true; filters: PowerFilters }
```

Storage parsing must reject malformed, mismatched, or unknown-version data and
fall back safely without throwing during SSR/tests or blocked storage access.

## Dependency Graph

```text
Provider filter session store + pure tests
                 |
                 v
Resource-type URL hooks + provider switch cleanup
                 |
                 +-----------------------+
                 |                       |
                 v                       v
Stable VMware query lifecycle       Flash/Power restoration
                 |
                 v
VMware page + toolbar + ISE tag behavior
                 |
                 v
Focused integration/browser verification
```

## Task 1: Add the versioned provider-filter session module

**Description:** Create a small pure module that builds provider-scoped keys,
validates resource-specific snapshots, and safely reads, writes, and clears
snapshots in `sessionStorage`. The module must preserve explicitly empty
filters and isolate source from target.

**Acceptance criteria:**

- [ ] Keys include schema version, role, resource type, and provider ID.
- [ ] Round trips preserve each resource type's filters, including empty
      VMware `search` and `tags` values.
- [ ] Invalid JSON, wrong resource type/version, and unavailable storage return
      no snapshot without throwing.

**Verification:**

- [ ] Focused unit test for key isolation, validation, empty state, and storage
      failures.
- [ ] Focused ESLint for the module and its test.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/state/providerFilterSession.ts`
- `src/features/discovery-inventory/resources/state/providerFilterSession.test.ts`

**Estimated scope:** Small (2 files)

## Task 2: Restore and persist VMware state per provider

**Description:** Extend the VMware URL-filter hook with role-aware provider
scope and the session module. Explicit URL values remain authoritative, saved
snapshots restore on return, and provider defaults apply only when neither URL
nor a snapshot exists. Keep initialization readiness so no transient
unfiltered request can run.

**Acceptance criteria:**

- [ ] Provider A custom/empty state survives A -> B -> A switching, while B
      receives B's snapshot or defaults.
- [ ] Source and target providers with the same ID remain isolated.
- [ ] Direct URL filters win over storage; clearing filters saves an empty
      initialized snapshot and does not restore defaults on remount/refresh.

**Verification:**

- [ ] Focused hook tests use real `MemoryRouter` and `sessionStorage` for first
      activation, explicit URL, switch, keyed remount, refresh, and clear.
- [ ] No inventory request is enabled before URL restoration completes.
- [ ] Focused ESLint for changed hook files/tests.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/hooks/vmwareSearchParamKeys.ts`

**Estimated scope:** Medium (3 files)

## Task 3: Make provider switching preserve scoped state

**Description:** Change resource source selection so it removes only the
outgoing provider's active URL filter representation and never destroys its
saved snapshot. Keep provider/resource/page updates atomic and prevent old
type-specific parameters from leaking into the next tab.

**Acceptance criteria:**

- [ ] Switching provider or resource type leaves the outgoing snapshot intact
      and clears its active filter parameters from the URL.
- [ ] The target page initializes from its own snapshot/default before fetch.
- [ ] Re-selecting the already active tab does not clear state or navigate.

**Verification:**

- [ ] Hook tests cover VMware A -> VMware B -> A and VMware -> FlashSystem ->
      VMware transitions with search and type-specific filters.
- [ ] ResourceRolePage test proves source selection is changed once without a
      transient unfiltered query.
- [ ] Focused ESLint for changed files/tests.

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourceRolePage.test.tsx`

**Estimated scope:** Medium (3 files)

## Checkpoint: Provider state contract

- [ ] Tasks 1-3 focused tests pass together.
- [ ] URL, snapshot, defaults, and empty-state precedence is explicit in tests.
- [ ] No test relies on mocked search-param hooks for the switching contract.
- [ ] Typecheck and focused lint pass.

## Task 4: Preserve FlashSystem and IBM Power provider filters

**Description:** Apply the same provider-snapshot contract to the existing
FlashSystem and IBM Power URL hooks. Do not change their filtering or API
semantics; only restore their own state after provider/tab navigation.

**Acceptance criteria:**

- [ ] Each FlashSystem and IBM Power provider restores its own search and
      type-specific filters.
- [ ] Empty/reset state persists and source/target scopes remain isolated.
- [ ] Existing API query behavior and filter semantics are unchanged.

**Verification:**

- [ ] Focused tests for both search-param hooks cover switch-away/return and
      refresh restoration.
- [ ] Existing FlashSystem and IBM Power page tests remain green.
- [ ] Focused ESLint for changed files/tests.

**Dependencies:** Tasks 1 and 3

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 5: Stabilize the VMware name-search query lifecycle

**Description:** Keep the current query/data active during the 300 ms
name-only debounce and while the next remote query fetches. Distinguish
debouncing, initial loading, background fetching, real error, and empty success
so typing never creates a false error state.

**Acceptance criteria:**

- [ ] Typing multiple characters issues no request before 300 ms and exactly
      one `/vms_by_name` request for the settled prefix.
- [ ] Previous data remains available during debounce/refetch; a disabled
      debounce query is never surfaced as an error.
- [ ] Tag+name still reuses one `/vms_by_tag` response and filters by
      case-sensitive `name.startsWith(prefix)` without another request.

**Verification:**

- [ ] Focused hook tests cover debounce replacement, previous data, cache
      return, real HTTP failure, retry, and empty success.
- [ ] Returning to a provider with a fresh matching cache key makes zero new
      network requests.
- [ ] Focused ESLint for the hook and tests.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Estimated scope:** Small (2 files)

## Task 6: Keep the VMware toolbar mounted and focused

**Description:** Render the inventory panel and toolbar continuously after the
provider is initialized. Use the stable query lifecycle for inline initial,
background, error, and empty states instead of replacing the whole panel.
Search remains controlled and updates the URL/snapshot immediately while the
remote request stays debounced.

**Acceptance criteria:**

- [ ] A focused search input remains the same DOM element and retains focus
      while typing, debouncing, fetching, succeeding empty, or failing.
- [ ] A real request error appears only after the request fails; cached/previous
      data remains visible with a non-blocking notice when available.
- [ ] Metrics, filters, pagination, detail panel, retry, refresh, and density
      controls remain functional.

**Verification:**

- [ ] Component test types `sdf` with fake timers and asserts focus after each
      lifecycle transition, one settled request, and no premature error.
- [ ] Component tests cover real failure and empty success as distinct states.
- [ ] Focused ESLint for changed files/tests.

**Dependencies:** Task 5

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Estimated scope:** Medium (3 files)

## Task 7: Preserve missing configured tags in Resources ISE

**Description:** Stop deleting an active tag merely because the provider's
tags endpoint does not return it. Merge the selected tag into dropdown options,
keep `DR-` plus `recovery` visible, and let `/vms_by_tag` produce the real empty
or error result.

**Acceptance criteria:**

- [ ] Target provider defaults `vmPrefix: "DR-"` and `vmTags: ["recovery"]`
      remain visible when `/tags` returns other tags or an empty list.
- [ ] The inventory uses `/vms_by_tag?tag=recovery&provider_id=...`; `DR-` is
      applied client-side to that canonical response.
- [ ] The user may clear/change the tag, after which the normal endpoint matrix
      applies; tags endpoint failures do not clear the active filter.

**Verification:**

- [ ] Resources ISE integration test uses the real VMware search-param and
      inventory seams with a missing `recovery` tag.
- [ ] Toolbar test shows the selected fallback tag option.
- [ ] Source Resources regression test remains green.

**Dependencies:** Tasks 2, 5, and 6

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx`

**Estimated scope:** Medium (4 files)

## Checkpoint: Stable end-to-end VMware flow

- [ ] Focused Tasks 4-7 tests pass together.
- [ ] Source and target use independent provider snapshots.
- [ ] Tab return uses fresh React Query cache without a request.
- [ ] Search focus survives debounce, fetch, error, and empty success.
- [ ] Missing ISE tag stays selected and does not silently change endpoint.
- [ ] Typecheck and changed-file ESLint pass.

## Task 8: Browser/network verification and final cleanup

**Description:** Verify the real interaction and network sequence in a browser,
then run the complete focused contract set. Remove only code made obsolete by
this repair and commit only in-scope files.

**Acceptance criteria:**

- [ ] Manual flow: customize provider A, switch to B, return to A, and observe
      exact state restoration with no fresh request while cache is valid.
- [ ] Manual flow: type `sdf`; focus remains, no premature error appears, and
      network shows one debounced `/vms_by_name` request.
- [ ] Manual Resources ISE flow shows `DR-` and `recovery` even when recovery is
      absent from `/tags`, with the expected `/vms_by_tag` request.

**Verification:**

- [ ] Run all focused state, hook, toolbar, Resources, Resources ISE,
      FlashSystem, IBM Power, and relevant API tests.
- [ ] `node_modules/.bin/tsc.cmd -b`
- [ ] Run ESLint only for changed TypeScript/TSX files with zero warnings.
- [ ] `git diff --check`, `git diff --stat`, and `git status --short`.
- [ ] Record whether full suite/build was run; do not hide environment limits.

**Dependencies:** Tasks 1-7

**Files likely touched:** No new production files beyond focused cleanup

**Estimated scope:** Small (verification)

## Final Checkpoint

- [ ] Every provider has independent source/target filter state.
- [ ] Explicit URL > saved snapshot > provider defaults > empty defaults.
- [ ] Empty user state is preserved and defaults do not reappear.
- [ ] Returning to a fresh cached provider state performs no request.
- [ ] VMware typing performs one debounced request and never loses focus.
- [ ] Pending debounce is not displayed as an error.
- [ ] Missing configured ISE tags remain visible and active.
- [ ] Focused tests, typecheck, focused lint, browser checks, and diff checks pass.
- [ ] Only in-scope changes are committed.

## Parallelization Opportunities

- Task 1 is foundational and sequential.
- After Task 3, Task 4 (Flash/Power) and Task 5 (VMware query lifecycle) may run
  in parallel because their write sets are disjoint.
- Tasks 6 and 7 share VMware page/toolbar files and must be sequential.
- Task 8 is sequential final verification.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| URL/session feedback loop | High | Pure precedence function, initialization readiness, and keyed-remount tests |
| Empty state mistaken for missing state | High | Persist explicit `initialized: true` snapshots and test clear/remount |
| Cross-role/provider contamination | High | Versioned key includes role, resource type, and provider ID |
| Search input remount regression | High | DOM identity/focus tests across debounce and fetch transitions |
| Extra or stale network requests | High | Remote-only query keys, fake-timer request counts, browser network audit |
| Missing tag silently changes operation | High | Never validate active selection by destructive deletion; fallback option test |
| Storage blocked/corrupt | Medium | Safe adapter with validation and no-throw fallback |
| Scope expands into backend work | Low | Keep endpoint matrix unchanged; record backend failures separately |

## Open Questions

None. The approved persistence scope is the current browser session:
`sessionStorage` survives tab switching and refresh, while explicit active URL
filters remain shareable and authoritative.
