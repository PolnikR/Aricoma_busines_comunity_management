# Implementation Plan: recovery-plans + infrastructure Review Remediation

## Overview

A five-track review of `src/features/recovery-plans/` and
`src/features/discovery-inventory/infrastructure/` covering helper extraction,
performance, and cross-feature duplication. This plan turns the findings into
ordered, verifiable tasks.

The headline result: the review found **more real bugs than tidiness issues**.
Four user-visible defects and two latent correctness risks were not previously
known. Those come first. The performance work follows, and it is unusually
cheap — the three biggest wins in the topology graph total roughly fifteen
lines.

## How this was produced

Five parallel reviewers, each given the project's CLAUDE.md constraints as a
hard rule ("no abstractions for single-use code", "nothing speculative",
"don't refactor things that aren't broken") and each required to report the
cases it **rejected**. Mechanisms were verified against installed dependency
source (`@xyflow/react` 12.11.2, `@tanstack/query-core` 5.101.4, `elkjs`),
not asserted from memory.

## Architecture Decisions

**AD-1 — Bugs before refactors.** Phases 0-1 change behaviour and nothing
else. Extraction work is deferred to Phase 4 so a bisect over the bug fixes
stays clean.

**AD-2 — Extraction requires a trigger.** Every extraction in Phase 4 cites
one of: (a) logic exists in 2+ places, (b) pure but untestable where it sits,
(c) the file is oversized and the move materially helps. Anything failing all
three was rejected — see "Deliberately Not Doing".

**AD-3 — Prefer deleting a duplicate over building an abstraction.** Most
findings collapse two copies into one existing canonical function. Only three
new modules are created, each replacing more code than it adds.

**AD-4 — Feature logic stays in its feature.** Provider rules go to
`providers-connectors`, inventory dispatch to `discovery-inventory`, VM schema
to `recovery-plans/shared/`. Only `requireOk`, `paginate`, and the `Alert`
adoption touch `src/shared/` — those are genuinely generic.

**AD-5 — Measure before the speculative performance work.** Phase 2 items are
mechanism-verified and quantified. The items the reviewers labelled Speculative
(`onlyRenderVisibleElements`, inline `fitViewOptions`) are explicitly out of
scope until someone profiles.

---

## Severity Summary

| # | Defect | Location | Impact |
|---|---|---|---|
| B1 | Power topology sorts alphabetically, not parent-first | `helpers/mapPowerInventoryToTopology.ts:90-94` | `powerPartition` renders before `powerSystem` |
| B2 | MiniMap has no case for the 4 FlashSystem kinds | `components/InfrastructureTopologyCanvas.tsx:102-111` | All render green; contradicts the Legend |
| B3 | Search drops ancestors on deep chains | `model/filterInfrastructureTopology.ts:178-182` | Matching a target volume loses its pool |
| B4 | Inventory cached under two different keys | `hooks/useResourceInventoryQueries.ts:67` vs `useRecoveryGroupResourceInventory.ts:33` | Same VMware data fetched twice |
| B5 | `cloneTier` never clones `recovery_group.volumes` | `RecoveryAppBuilder.tsx:40-52` + `recoveryApplicationFormMapper.ts:15-25` | Shared reference survives a "deep" clone |
| B6 | Eligible-provider rule written twice, can drift | `AppMetadataForm.tsx:54-57` / `RecoveryAppBuilder.tsx:261-265` | Form offers a platform save rejects |
| B7 | `getProviderLabel` branches on an id as if it were a name | `RecoveryApplicationsTable.tsx:46-50` | Both branches likely dead — needs data check |
| B8 | `DatastoreNode` hardcodes English | `components/nodes/DatastoreNode.tsx:18,20,27` | Untranslated in cs/sk |
| B9 | Six error banners have no dark-mode variant | 6 pages, raw `bg-red-50` | Unreadable in dark theme |
| B10 | Rollback context menu (self-review) | `RecoveryGroupsTable.tsx:181-239` | 7 defects — see Phase 0 |

---

## Phase 0: Fix the rollback context menu

Regression introduced in commits `d57cac3` / `523057d`. Fix before anything
else — it is the newest code and the only item currently shipping broken.

### Task 0.1: Rebuild the menu on the existing portal pattern
**Description:** The menu is `absolute` inside `DataTable.tsx:53`'s
`overflow-x-auto` container, so it is clipped on lower rows; it has no
outside-click or Escape dismissal; and it re-implements a pattern that already
exists. `FlashSystemHostBadge.tsx:103-168` already does portal + `fixed` +
reposition-on-scroll + `pointerdown`-outside + Escape + `aria-label`.

**Acceptance criteria:**
- [ ] Menu renders via `createPortal` and is not clipped on the last table row
- [ ] Closes on outside click and on Escape
- [ ] Trigger has an accessible name; menu has `role="menu"` / `menuitem`, `aria-haspopup`, `aria-expanded`

**Verification:** `npm run test` · `npm run build` · manual: open the menu on the bottom row at 1024px width
**Dependencies:** None
**Files:** `RecoveryGroupsTable.tsx`, possibly a new `shared/components/menu/ActionMenu.tsx`
**Scope:** Medium

### Task 0.2: Fix the dead `text-danger` class
**Description:** `RecoveryGroupsTable.tsx:221` is the **only** occurrence of
`text-danger` in the codebase. No such token exists, so the class is a no-op
and "Roll back" is not red. Canonical here is `text-red-600`.

**Acceptance criteria:**
- [ ] Rollback item is visually distinct as destructive, in both themes

**Verification:** manual, light + dark
**Dependencies:** 0.1
**Files:** `RecoveryGroupsTable.tsx`
**Scope:** XS

### Task 0.3: Restore in-flight rollback feedback
**Description:** `isRollingBack` was dropped from the component and the page;
`useRecoveryGroups.ts:63` is now its only reference. Rollback calls Airflow +
IBM with no feedback and no double-submit guard.

**Acceptance criteria:**
- [ ] Menu item shows a pending state while the mutation is in flight
- [ ] A second rollback cannot be started while one is running

**Verification:** `npm run test` · manual with a throttled network
**Dependencies:** 0.1
**Files:** `RecoveryGroupsTable.tsx`, `RecoveryGroupsListPage.tsx`
**Scope:** Small

### Task 0.4: Test the menu
**Description:** Two tests were deleted and not replaced; the menu has zero
coverage.

**Acceptance criteria:**
- [ ] Menu opens; Edit / Delete / Roll back present
- [ ] Roll back disabled when `orchestrationProviderId` is null, enabled when set
- [ ] Roll back absent when `pushToOrchestrator` is false
- [ ] Escape and outside-click close the menu

**Verification:** `npm run test`
**Dependencies:** 0.1-0.3
**Files:** `RecoveryGroupsTable.test.tsx`
**Scope:** Small

### Checkpoint A
- [ ] Build clean, tests pass, menu verified in browser at 1024px in both themes

---

## Phase 1: Correctness bugs

Each task is independent and separately revertable.

### Task 1.1: Power topology node ordering (B1)
**Description:** `mapPowerInventoryToTopology.ts:90-94` sorts with
`first.kind.localeCompare(second.kind)`. The canonical `compareNodes`
(`mapInventoryToTopology.ts:46`) sorts by the deliberate `nodeKindOrder` table.
`mapFlashSystemVolumeTreeToTopology.ts:145` imports it correctly — Power is the
outlier, so partitions currently sort before their systems.

**Acceptance criteria:**
- [ ] Power mapper uses `compareNodes`
- [ ] A test asserts `powerSystem` precedes `powerPartition`

**Verification:** `npm run test` · manual: load a Power provider topology
**Dependencies:** None
**Files:** `mapPowerInventoryToTopology.ts` (+ test)
**Scope:** XS

### Task 1.2: MiniMap colours for FlashSystem kinds (B2)
**Description:** The `nodeColor` chain has no case for `pool`, `volume`,
`fcmap`, `consistencyGroup` — all four fall through to green while the Legend
advertises different colours. The hardcoded hexes are literal design-token
values (`#465fff` = `--color-brand-500`, etc.). Introduce
`model/topologyNodeAppearance.ts` as a `Record<InfrastructureTopologyNodeKind, …>`
so Legend and MiniMap read one source. Also fixes the memo break (Task 2.4) by
letting the callback be hoisted.

**Acceptance criteria:**
- [ ] Every node kind has an explicit colour; no fall-through
- [ ] Legend and MiniMap derive from the same map
- [ ] A test asserts the map is exhaustive over the kind union

**Verification:** `npm run test` · manual: FlashSystem topology minimap
**Dependencies:** None
**Files:** new `model/topologyNodeAppearance.ts`, `InfrastructureTopologyCanvas.tsx`, `InfrastructureTopologyLegend.tsx`
**Scope:** Small

### Task 1.3: Ancestor propagation in topology filter (B3)
**Description:** `filterInfrastructureTopology.ts:178-182` propagates
`contains` edges in a single pass, retaining only one ancestor level. On
pool → volume → fcmap → target-volume, a search matching a target volume drops
its pool.

**Acceptance criteria:**
- [ ] Propagation runs to a fixed point
- [ ] A test covers a 3-level chain and asserts the root is retained

**Verification:** `npm run test` · manual: search a snapshot target volume name
**Dependencies:** None
**Files:** `filterInfrastructureTopology.ts` (+ test)
**Scope:** Small

### Task 1.4: Unify inventory query dispatch and fix the key drift (B4)
**Description:** Provider-type → `{ queryKey, queryFn }` is written four times
and the keys disagree: VMware resolves to `discoveryInventoryKeys.inventory(id)`
in one hook and `resourceInventory(type, id)` in another, so the same data is
cached twice. Add `discovery-inventory/api/inventoryQuery.ts` exporting
`getInventoryQuery(providerType, providerId)`, plus
`DISCOVERY_INVENTORY_QUERY_OPTIONS` for the options block repeated verbatim in
five hooks.

**Acceptance criteria:**
- [ ] One dispatch; all four call sites use it
- [ ] VMware resolves to exactly one cache key
- [ ] A test asserts the key per provider type

**Verification:** `npm run test` · manual: load VMware inventory from both entry points, confirm one network request
**Dependencies:** None
**Files:** new `api/inventoryQuery.ts`, `useRecoveryGroupResourceInventory.ts`, `useInfrastructureInventory.ts`, `useResourceInventoryQueries.ts`
**Scope:** Medium

### Task 1.5: `cloneTier` volumes + collapse the duplicate (B5)
**Description:** Two divergent implementations
(`RecoveryAppBuilder.tsx:40-52`, `recoveryApplicationFormMapper.ts:15-25`);
**neither** clones `recovery_group.volumes`, so it stays shared by reference
through a "deep" clone. Collapsing first makes the fix one-place.

**Acceptance criteria:**
- [ ] One exported `cloneTier`; component copy deleted
- [ ] `volumes` is cloned
- [ ] A test asserts mutating a clone's volumes does not affect the original

**Verification:** `npm run test`
**Dependencies:** None
**Files:** `recoveryApplicationFormMapper.ts`, `RecoveryAppBuilder.tsx` (+ test)
**Scope:** Small

### Task 1.6: Single eligible-provider predicate (B6)
**Description:** `(type === 'VMWARE' || type === 'IBM_POWER') && credentialStatus === 'ok'`
appears as a `.filter` that renders options and a `.some` that validates the
save. If they drift the form offers a platform the save path rejects. Note:
`recoveryGroupsApi.ts:32` deliberately omits `credentialStatus` (it resolves
historical records) and must **not** be folded in.

**Acceptance criteria:**
- [ ] One exported predicate used by both sites
- [ ] `recoveryGroupsApi.ts:32` left unchanged
- [ ] A test covers the `credentialStatus !== 'ok'` case

**Verification:** `npm run test` · manual: a provider with missing credentials never appears and cannot be saved
**Dependencies:** None
**Files:** new `utils/recoveryApplicationValidation.ts`, `AppMetadataForm.tsx`, `RecoveryAppBuilder.tsx`
**Scope:** Small

### Task 1.7: Platform column renders a raw provider id (B7) — CONFIRMED
**Description:** `RecoveryApplicationsTable.tsx:46-50` branches on
`platform.startsWith('VMware')` / `'IBM'`. **Investigation complete — both
branches are dead.** `platform` holds a provider **id**
(`AppMetadataForm.tsx:174` sets `value={provider.id}`), and provider ids in this
codebase are lowercase-hyphenated (`vmware-vcenter-01`, `ibm-power-01`,
`vmware-01`, `ibm-flashsystem-01`). The comparisons are case-sensitive, so both
fail and the function falls through to `return platform || '—'`.

Net effect: the user selects "Primary vCenter - VMWARE" in the dropdown
(`AppMetadataForm.tsx:175` renders `{provider.name} - {provider.type}`) and the
table then displays `vmware-vcenter-01`.

Fix: resolve the id against the providers list and render `provider.name`,
matching what the select already shows. Delete `getProviderLabel` — string
prefix matching on an id is the wrong mechanism entirely.

**Acceptance criteria:**
- [ ] Column shows the provider's name, not its id
- [ ] Unknown/stale id falls back to the raw id rather than blank
- [ ] A test covers resolution and the unknown-id fallback

**Verification:** `npm run test` · manual: Platform column matches the name in the edit form's dropdown
**Dependencies:** None
**Files:** `RecoveryApplicationsTable.tsx` (+ test)
**Scope:** Small

### Task 1.8: Localize `DatastoreNode` (B8)
**Description:** The only node component that never imports `useTranslation`.
`"Datastore"`, `` `${count} connected VMs` ``, `` `${gb} GB allocated` `` are
hardcoded. Keys must be added to en/cs/sk with parity maintained.

**Acceptance criteria:**
- [ ] All three strings localized
- [ ] en/cs/sk key counts stay equal

**Verification:** `npm run test` · manual: switch to cs, show datastores
**Dependencies:** None
**Files:** `DatastoreNode.tsx`, `en.json`, `cs.json`, `sk.json`
**Scope:** Small

### Task 1.9: Error banners → shared `Alert` (B9)
**Description:** Six copies of
`<div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">`.
`shared/components/alert/Alert.tsx` already renders this role and semantic with
`variant="error"` — and unlike the raw `bg-red-50`, it has a dark-mode variant.
This is a latent visual bug, not only duplication.

**Acceptance criteria:**
- [ ] All six use `<Alert variant="error" />`
- [ ] Verified legible in dark mode

**Verification:** `npm run test` · manual: force an error in dark mode
**Dependencies:** None
**Files:** `RecoveryGroupBuilderPage.tsx`, `RecoveryGroupEditorPage.tsx`, `RecoveryGroupsListPage.tsx`, `RecoveryApplicationBuilderPage.tsx`, `RecoveryApplicationEditorPage.tsx`
**Scope:** Small

### Checkpoint B
- [ ] Build clean, full suite green
- [ ] Each bug manually confirmed fixed
- [ ] Reviewed before starting Phase 2

---

## Phase 2: Performance — topology graph

The hot path. Three changes, ~15 lines, addressing one problem from three
angles. Do them together.

### Task 2.1: Stop the double ELK layout per keystroke
**Description:** `InfrastructureTopologyWorkspace.tsx:63-70` — `effectiveFilters`
depends on the whole `filters` object, which the toolbar re-mints per keystroke.
The urgent render therefore recomputes with a semantically identical input and
fires a layout; the deferred render fires another. `layoutRequestId` discards
the result but ELK already ran — `elk.layout()` is not abortable.
`useDeferredValue` is also the wrong tool: it time-slices rendering, and this
cost is a synchronous call inside an effect.

Measured shape: ~135 nodes → 150-350ms blocked per character; ~500 nodes →
1-3s per character. An 8-character search = 16 layouts.

**Acceptance criteria:**
- [ ] Memo deps are primitives, not the `filters` object
- [ ] Search is debounced (250-300ms); a burst of typing yields one layout
- [ ] A test asserts the layout runs once for a multi-character burst

**Verification:** `npm run test` · manual: type an 8-char search on FlashSystem, confirm one layout via a temporary counter
**Dependencies:** None
**Files:** `InfrastructureTopologyWorkspace.tsx`
**Scope:** Small

### Task 2.2: Move ELK off the main thread
**Description:** `vite.config.ts:11` aliases `elk.bundled.js` — the **non-worker**
build. `new ELK()` without `workerUrl` runs the GWT-compiled layout
synchronously inside the returned Promise. The `async`/`await` signature makes
it look non-blocking at every call site, but the UI is frozen throughout — the
`topology.arranging` badge cannot paint during the work it exists to announce.

**Acceptance criteria:**
- [ ] ELK runs in a worker; the arranging indicator animates during layout
- [ ] No call-site changes needed (already awaits a Promise)
- [ ] Production build verified — worker bundling is the risk here

**Verification:** `npm run build` · `npm run test` · manual: confirm the spinner animates and input stays responsive during layout
**Dependencies:** None (independent of 2.1, but 2.1 first reduces how often this matters)
**Files:** `vite.config.ts`, `layout/layoutInfrastructureTopology.ts`
**Scope:** Small — highest technical risk in the plan

### Task 2.3: `data: node` instead of `data: { ...node }`
**Description:** `topologyFlowModel.ts:35` spreads the node into a fresh object,
so xyflow hands every memoized node component a new `data` reference and the
shallow compare fails for **every** node, including byte-identical ones. All 10
node components are correctly `memo`-wrapped; the spread defeats all of them.
The spread is unnecessary — `node` is already reference-stable through both
`filterInfrastructureTopology` and `layoutInfrastructureTopology`.

500 nodes → ~6,000 React elements and 500 effect setups per re-layout, ×2 per
keystroke. With stable `data`, narrowing 500 → 480 re-renders 20 subtrees.

**Acceptance criteria:**
- [ ] `data` holds the node reference
- [ ] Filtering re-renders only changed nodes (verify with Profiler)

**Verification:** `npm run test` · React Profiler before/after on a filter narrowing
**Dependencies:** None
**Files:** `topologyFlowModel.ts`
**Scope:** XS — one line, largest single win

### Task 2.4: Hoist the MiniMap `nodeColor` callback
**Description:** Inline arrow → new identity each render → breaks `MiniMap`'s
memo, `MiniMapNodes`' memo, and each `NodeComponentWrapper`'s memo. The canvas
is not itself memoized, so it re-renders on every workspace render. It closes
over nothing and can be module scope. Folds into Task 1.2's appearance map.

**Acceptance criteria:**
- [ ] Callback at module scope, reading the shared appearance map
- [ ] Optionally `memo` the canvas

**Verification:** React Profiler: minimap nodes stop re-rendering on unrelated state changes
**Dependencies:** 1.2
**Files:** `InfrastructureTopologyCanvas.tsx`
**Scope:** XS

### Checkpoint C
- [ ] Typing in search is responsive at the largest available dataset
- [ ] Profiler confirms node re-render count dropped
- [ ] Production build verified (worker bundling)

---

## Phase 3: Performance — recovery-plans

### Task 3.1: Stop the per-keystroke builder re-render
**Description:** `RecoveryAppBuilder.tsx:329,351` pass
`items={availableGroups.map(g => g.id)}` and
`tiers={Object.fromEntries(formState.tiers)}` — both freshly allocated each
render, defeating `ResourceSidebar`'s and `TierCanvas`'s memos. 150 groups /
5 tiers / 40 VMs → ~350 components reconciled, 2 sorts, ~7 Set builds **per
keystroke**.

Preferred fix removes the cause: `AppMetadataForm` already owns its text state,
so lift on blur rather than per keystroke. Fallback: memoize both props and
`React.memo` the two children. Also fixes TierCanvas's three dead memos for
free.

**Acceptance criteria:**
- [ ] Typing does not re-render the sidebar or tier canvas
- [ ] Dirty tracking still fires

**Verification:** `npm run test` · Profiler while typing
**Dependencies:** None
**Files:** `RecoveryAppBuilder.tsx`, `AppMetadataForm.tsx`
**Scope:** Medium

### Task 3.2: Stabilize the inventory `select`
**Description:** `useRecoveryGroupResourceInventory.ts:120-125` passes an inline
arrow. query-core memoizes `select` only while `options.select === this.#selectFn`
(`queryObserver.js:287`), so it re-runs every render and then `replaceEqualDeep`
deep-compares the output. A 2,000-VM inventory → ~2,000 allocations and ~14,000
comparisons per render, doubled under StrictMode.

**Acceptance criteria:**
- [ ] `select` wrapped in `useCallback([workloadType])`
- [ ] Referential stability of the result preserved

**Verification:** `npm run test` · Profiler on the resources step
**Dependencies:** None
**Files:** `useRecoveryGroupResourceInventory.ts`
**Scope:** XS

### Task 3.3: Don't build N query descriptors off-step
**Description:** `RecoveryGroupBuilder.tsx:126-131` passes `draft.resources`
unconditionally; `enabled` suppresses fetching but not descriptor construction.
`useQueries` calls `getOptimisticResult()` during render, which defaults and
`JSON.stringify`-hashes each entry. A 100-VM group → ~100 key allocations, 100
hashes, 100 observer computations **per render**, including keystrokes on step 1
where the feature isn't reachable.

**Acceptance criteria:**
- [ ] Empty array passed when off-step; hook order unchanged
- [ ] Returning to the step still hits cache

**Verification:** `npm run test` · Profiler on step 1 with a 100-VM group
**Dependencies:** None
**Files:** `RecoveryGroupBuilder.tsx`, `useRecoveryGroupRelatedVolumes.ts`
**Scope:** Small

### Task 3.4: Parallelize providers and recovery groups
**Description:** `useRecoveryGroups.ts:17-27` gates on
`enabled: providerQuery.isSuccess`, serializing two independent requests —
providers are used only for client-side mapping. Costs one round trip
(~150-400ms) on first paint of four pages. Separately, `providerSignature`
(map + sort + join) rebuilds every render of every consumer, and any provider
edit orphans the cached group list.

**Acceptance criteria:**
- [ ] Both requests fire in parallel
- [ ] Provider edits re-map from cache instead of refetching
- [ ] Stable `queryKey`

**Verification:** `npm run test` · DevTools Network: confirm parallel, measure first paint
**Dependencies:** None
**Files:** `useRecoveryGroups.ts`, `recoveryGroupsApi.ts`
**Scope:** Medium

### Task 3.5: Two shared-infrastructure one-liners
**Description:** (a) `ResourceSidebar.tsx:27` — `itemLabels = {}` as a default
parameter allocates fresh every render and is in `filteredItems`' deps, so that
memo never hits; `search.toLowerCase()` also recomputes per item. At 2,000 VMs,
~4,000 string allocations per render for a provably unchanged result.
(b) `useTableState.ts:42` includes `searchFields` in its deps, and all **seven**
call sites pass an inline array literal, so the filter re-runs on interactions
that cannot affect it.

**Acceptance criteria:**
- [ ] Module-scope `EMPTY_LABELS` default; search lowercased once
- [ ] All seven `searchFields` arrays hoisted to module scope
- [ ] No API changes

**Verification:** `npm run test` (all seven tables)
**Dependencies:** None
**Files:** `ResourceSidebar.tsx`, `useTableState.ts` call sites (7)
**Scope:** Small

### Task 3.6: Remove the render-phase parent update
**Description:** `RecoveryGroupBuilder.tsx:140-150` calls `updateDraft` in the
render body, which fires `onDirtyChange` → the **parent's** `setIsDirty` during
render. That is the "Cannot update a component while rendering a different
component" warning. It converges, so this is a correctness smell more than a
cost. The sibling block at `:155-157` is legitimate derived state — leave it.

**Acceptance criteria:**
- [ ] No warning in console
- [ ] Discovery still applies on entering the related-storage step

**Verification:** `npm run test` · manual: console clean through the wizard
**Dependencies:** None
**Files:** `RecoveryGroupBuilder.tsx`
**Scope:** Small

### Task 3.7: Delete the no-op memo
**Description:** `PolicySetsTable.tsx:62` — `useMemo(() => policySets, [policySets])`
is an identity function. Pure noise.

**Verification:** `npm run test`
**Dependencies:** None
**Files:** `PolicySetsTable.tsx`
**Scope:** XS

### Checkpoint D
- [ ] Build clean, suite green, no console warnings
- [ ] Network shows parallel provider/group fetches

---

## Phase 4: Extractions that unlock tests

Only extractions with a real trigger. Each moves logic that is currently
unreachable from a test.

### Task 4.1: `useTopologyLayout` hook
**Description:** `InfrastructureTopologyWorkspace.tsx:77-131` — the run-ELK /
stale-request-guard / apply-overrides / map-error sequence exists **twice,
verbatim**, including the `layoutRequestId.current + 1` guard. The test file
mocks the toolbar out entirely, so the second copy is never exercised. A
duplicated concurrency guard is exactly the thing that drifts into a race.
Trigger (a) + (b). Workspace drops 202 → ~150 lines.

**Acceptance criteria:**
- [ ] One implementation behind `useTopologyLayout`
- [ ] Tests cover the stale-request guard directly

**Verification:** `npm run test` · manual: auto-layout and reset still work
**Dependencies:** Phase 2 (same file as 2.1 — sequence to avoid conflicts)
**Files:** new `hooks/useTopologyLayout.ts`, `InfrastructureTopologyWorkspace.tsx` (+ test)
**Scope:** Medium

### Task 4.2: Power mapper — use the canonical primitives
**Description:** `mapPowerInventoryToTopology.ts:11-25` re-implements
`missingTopologyValues`, `isKnownTopologyValue` and hand-builds the
`edge:contains:` id string instead of calling the exported `createTopologyEdgeId`
— while already importing `createTopologyNodeId` from that same module. The id
formats coincide today, so they will drift silently. Trigger (a). Task 1.1
already covers the sort.

**Acceptance criteria:**
- [ ] Local copies deleted; canonical helpers imported
- [ ] Edge ids unchanged (assert in a test)

**Verification:** `npm run test`
**Dependencies:** 1.1
**Files:** `mapPowerInventoryToTopology.ts`, `mapInventoryToTopology.ts`
**Scope:** Small

### Task 4.3: Tier reorder math
**Description:** `TierCanvas.tsx:93-108` — a four-branch index-shift plus
renumbering pass, pure in `(tiers, draggedId, targetId)`. `TierCanvas.test.tsx`
has 8 tests and **none** cover reordering, because the logic is only reachable
through jsdom drag events. Trigger (b).

**Acceptance criteria:**
- [ ] `reorderTiers()` extracted and directly tested (move up, move down, no-op, adjacent)
- [ ] Drag behaviour unchanged

**Verification:** `npm run test` · manual: drag tiers both directions
**Dependencies:** None
**Files:** new `utils/tierOrder.ts`, `TierCanvas.tsx` (+ test)
**Scope:** Small

### Task 4.4: Recovery-application validation chain
**Description:** `RecoveryAppBuilder.tsx:248-282` — five business rules
interleaved with `alert()` calls; the alerts are what make them untestable.
Extract to `getRecoveryApplicationValidationErrorKey(...) => string | null`;
the component keeps `if (key) { alert(t(key)); return }`. Absorbs Task 1.6.
Trigger (b).

**Acceptance criteria:**
- [ ] All five rules covered by direct tests
- [ ] Same messages in the same order

**Verification:** `npm run test` · manual: trigger each validation failure
**Dependencies:** 1.6
**Files:** `utils/recoveryApplicationValidation.ts`, `RecoveryAppBuilder.tsx` (+ test)
**Scope:** Medium

### Task 4.5: `resolveInfrastructureTopology`
**Description:** `InfrastructurePage.tsx:59-79` — a pure four-outcome mapper
dispatch including the "VMware provider but Power-shaped payload → null"
defence, today reachable only through a full page render behind 110 lines of
query mocking. Triggers (b) + (c) — the page is the feature's largest file at
222 lines. **Note:** the reviewer confirmed this memo is already correct and
does *not* re-run per render; this is a testability change, not a perf one.

**Acceptance criteria:**
- [ ] Extracted and directly tested, including the mismatch guard
- [ ] Page behaviour unchanged

**Verification:** `npm run test` · manual: all three platforms
**Dependencies:** None
**Files:** new `helpers/resolveInfrastructureTopology.ts`, `InfrastructurePage.tsx` (+ test)
**Scope:** Small

### Task 4.6: Wizard step-index math
**Description:** `RecoveryGroupBuilder.tsx:120-125,189-197` — `policySetStepIndex = hasRelatedStorageStep ? 6 : 5`
and friends, plus a four-deep nested ternary, are the only encoding of the
wizard's shape, silently magic-numbered in a 418-line file. Triggers (b) + (c).
Leave the `steps` array (`:159-187`) — it is i18n-coupled and reads fine inline.

**Acceptance criteria:**
- [ ] `getRecoveryGroupStepLayout(resourceType)` + `canContinueFromStep(...)` extracted and tested for both vm and volume paths
- [ ] No magic numbers left in the component

**Verification:** `npm run test` · manual: both wizard paths end to end
**Dependencies:** 3.3, 3.6 (same file)
**Files:** new `utils/recoveryGroupWizardSteps.ts`, `RecoveryGroupBuilder.tsx` (+ test)
**Scope:** Medium

### Task 4.7: `calculateTooltipPosition`
**Description:** `TopologyTooltip.tsx:24-41` — four-branch viewport-collision
math. `TopologyTooltip.test.tsx:7-22` covers only the no-flip case; reaching
the flip and clamp branches needs `window.innerWidth` mutation around a render.
As a module it is four one-line assertions. Trigger (b). Also note
`TOOLTIP_WIDTH = 260` is restated as `min-w-[260px]` on line 71 with nothing
keeping them in sync.

**Acceptance criteria:**
- [ ] Extracted, all four branches tested
- [ ] Width constant single-sourced or the coupling commented

**Verification:** `npm run test` · manual: hover a node at each viewport edge
**Dependencies:** None
**Files:** new `components/nodes/calculateTooltipPosition.ts`, `TopologyTooltip.tsx` (+ test)
**Scope:** Small

### Checkpoint E
- [ ] Build clean, suite green, coverage up on the extracted units

---

## Phase 5: Deduplication

Lower urgency. Each removes a copy without adding an abstraction.

### Task 5.1: `requireOk` in `apiClient`
Four byte-identical guards (`policySetsApi.ts:13`, `snapshotPoliciesApi.ts:16`,
`recoveryGroupsApi.ts:18`, `platformProvidersApi.ts:16`) plus 12+ hand-inlined
copies of the same throw. **Policy note:** `apiClient.ts` currently documents
"callers keep their own `.ok` checks" as deliberate — this reverses that, so it
needs an explicit decision, not a silent refactor. Leave
`recoveryApplicationsApi.ts:17,59` alone: they carry different diagnostic
payloads on purpose. **Scope:** Small.

### Task 5.2: `useRecoveryGroupSubmission`
`RecoveryGroupBuilderPage` and `RecoveryGroupEditorPage` share ~45 byte-identical
lines (`OrchestratorRunInfo`, `navigateToGroups`, `requestBack`,
`handleSuccessModalClose`, the ConfirmDialog and success-modal JSX).
`handleCreate`/`handleUpdate` differ by one token, which becomes the hook's
argument, not a flag. Introduced by the recent orchestrator work — cheapest to
collapse now. **Scope:** Medium.

### Task 5.3: `resolveFlashcopyProvider`
Same predicate in `useRecoveryGroupRelatedVolumes.ts:10` and inline at
`VirtualMachineDetailPanel.tsx:48-55`. Belongs in
`providers-connectors/providers/model/` — `src/shared/` has no provider concept.
Real risk: changing the `credentialStatus === 'ok'` guard in only one place.
**Scope:** Small.

### Task 5.4: Shared recovery-VM schema
`recoveryGroupVmResourceSchema` and `recoveryVmSchema` are the same eight fields
in the same order, differing only in `name` strictness; the hand-written TS
mirrors are duplicated too. Base schema + `.extend()` for the strict caller,
`z.infer` for both types. Goes in `recovery-plans/shared/` — `src/shared/`
should not know what a recovery VM is. **Scope:** Small.

### Task 5.5: `paginate` helper
The same three-line slice appears in `FlashSystemInventoryView.tsx:44`,
`PowerInventoryView.tsx:39`, `useTableState.ts:47-50`, and a fourth variant
without the clamp in `filterVirtualMachines.ts:23`. Extract **only** the slice.
Leave the filter state alone — the filter shapes are genuinely different types
and unifying them needs the config object CLAUDE.md warns against.
**Scope:** Tiny.

### Task 5.6: Shared `JsonViewerModal`
Defined twice, near-identically (`RecoveryGroupsTable.tsx:56-76`,
`RecoveryApplicationsTable.tsx:108-136`), differing only in title key and
payload. **Scope:** Small.

### Task 5.7 (optional): `isPowerInventory`
Two implementations plus three open-coded `'partitions' in inventory` checks.
Keep the `unknown`-accepting signature. **Scope:** XS.

### Checkpoint F
- [ ] Build clean, suite green, no behaviour change

---

## Deliberately Not Doing

Recorded so these are not re-proposed. Each was considered and rejected.

| Rejected | Why |
|---|---|
| Merge the two portal/tooltip implementations | Needs 4 flags (placement axis, controlled/uncontrolled, owns-trigger, dismissal) to serve 2 callers |
| Generic "configurable node" component | Shared parts already in `TopologyNodeShell` / `useTooltipHover`; a generic version is strictly worse |
| Unify `FlashSystemResourcesPage` / `IbmPowerResourcesPage` | Needs 2 render slots + type + selector + ~10-key label bag |
| Generic CRUD factory for policy-sets / snapshot-policies | Ten-field config object to save ~60 lines of readable code |
| Shared `statusColor()` | Each site maps a *different vocabulary*; `Badge`'s `color` prop is already the shared abstraction |
| Promote `parseCapacity` to `src/shared/` | Single feature, two call sites, no second implementation. Also: decimal-1000 vs binary-1024 elsewhere measure different things |
| Extract table column/format helpers (~12 sites) | Already module-scope pure functions, single-file, directly importable by a test |
| Unify the three table filter `useMemo` pairs | Different record types, ~8 lines each |
| Move `topologyFlowModel.ts` to `model/` | Pure directory hygiene; churns imports and a test path for zero benefit |
| `onlyRenderVisibleElements`, inline `fitViewOptions` | Reviewer labelled Speculative; ~zero benefit at the default fitted zoom. Measure first |
| One-line label ternaries duplicated in node/tooltip pairs | Passing the computed label down is the surgical fix, not a new module |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| ELK worker (2.2) breaks the production bundle | High | Verify `npm run build` + a preview server, not just dev. Isolate as its own commit for a clean revert |
| Debounce (2.1) makes search feel laggy | Medium | Start at 250ms, tune against the largest dataset |
| `requireOk` (5.1) reverses a documented decision | Medium | Confirm with the user before starting |
| Inventory key unification (1.4) shifts cache behaviour | Medium | Assert keys in tests; verify one network request per provider |
| B7 fix depends on unknown data | Medium | Investigate before writing code; may be a no-op |
| Phase 4 conflicts with Phase 2/3 in shared files | Low | Sequenced: 4.1 after 2.1; 4.6 after 3.3/3.6 |
| Locale parity drift (1.8) | Low | Assert equal key counts across en/cs/sk |

## Decisions Made

1. ✅ **Phase order:** Bugs first (Phase 1), then graph freeze (Phase 2). Correctness before perf.

2. ✅ **Task 5.1 approved.** `apiClient.ts` says *"Returns the raw Response — callers keep
   their own .ok checks"* — that documents what it **doesn't** do. Adding an opt-in
   `requireOk()` helper **next to** it doesn't contradict that; the function still returns
   raw and callers choose. (Note: only one status-branching site in the codebase — `discoveryInventoryApi.ts:37` — and three custom diagnostic payloads left alone.)

3. ✅ **Task 1.7 confirmed a real bug.** Provider ids are lowercase-hyphenated
   (`vmware-vcenter-01`, `ibm-power-01`); the case-sensitive prefix check fails
   silently and the table renders a raw id instead of the provider name.

4. ✅ **Task 3.1 approach:** Lift metadata state on **blur** (removes the cause),
   not memoization (treats the symptom). Keep `onDirtyChange` firing on the first
   local change so the user knows the form has unsaved work. Add memoization
   afterward as an optimization if Profiler shows it matters.

5. ✅ **Task 3.3 / N+1:** Blocked on backend — communicate with a platform
   developer to create a batch `vdisks_by_vms` endpoint. Until then the cost
   is inherent (100 VMs = 100 requests). This is an **out-of-scope follow-up** to
   record as a story, not something to fix in the review.
