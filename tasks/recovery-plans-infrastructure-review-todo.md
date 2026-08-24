# TODO: recovery-plans + infrastructure Review Remediation

Plan: `tasks/recovery-plans-infrastructure-review-plan.md`

Legend — **XS** 1 file · **S** 1-2 · **M** 3-5

---

## Phase 0 — Fix the rollback context menu (regression, ships broken)

- [ ] **0.1** Rebuild menu on the existing portal pattern (`FlashSystemHostBadge.tsx:103-168`) — fixes clipping, adds outside-click + Escape + a11y — **M**
- [ ] **0.2** Replace dead `text-danger` (no such token) with `text-red-600` — **XS**
- [ ] **0.3** Restore `isRollingBack`; block double-submit — **S**
- [ ] **0.4** Tests: open, disabled/enabled states, hidden when not orchestrated, Escape/outside-click — **S**

**Checkpoint A** — [ ] build clean · [ ] menu verified at 1024px, both themes

---

## Phase 1 — Correctness bugs (independent; any order)

- [ ] **1.1** Power mapper: use `compareNodes`, not `localeCompare` — child currently sorts before parent — **XS**
- [ ] **1.2** MiniMap: add the 4 missing FlashSystem kinds via a shared appearance map — **S**
- [ ] **1.3** Topology filter: propagate `contains` to a fixed point — search drops ancestors on deep chains — **S**
- [ ] **1.4** One inventory query dispatch; fix the VMware double-cache-key drift — **M**
- [ ] **1.5** Collapse `cloneTier`, and clone `recovery_group.volumes` (neither copy does) — **S**
- [ ] **1.6** One eligible-provider predicate (form vs save can drift) — do **not** fold in `recoveryGroupsApi.ts:32` — **S**
- [ ] **1.7** ⚠ Investigate first: `getProviderLabel` branches on an id as if it were a name — **S**
- [ ] **1.8** Localize `DatastoreNode` (3 hardcoded English strings); keep en/cs/sk parity — **S**
- [ ] **1.9** Six error banners → `<Alert variant="error" />` (raw `bg-red-50` has no dark mode) — **S**

**Checkpoint B** — [ ] suite green · [ ] each bug manually confirmed · [ ] reviewed before Phase 2

---

## Phase 2 — Topology graph performance (~15 lines, do together)

- [ ] **2.1** Primitive memo deps + debounce search — currently **2 full ELK layouts per keystroke** — **S**
- [ ] **2.2** ⚠ ELK → web worker (`vite.config.ts:11` aliases the non-worker build; layout blocks the main thread) — **S, highest risk**
- [ ] **2.3** `data: node` not `data: { ...node }` — one line; unbreaks memo on all 10 node components — **XS**
- [ ] **2.4** Hoist MiniMap `nodeColor` to module scope (after 1.2) — **XS**

**Checkpoint C** — [ ] typing responsive on the largest dataset · [ ] Profiler confirms fewer node renders · [ ] **production build verified**

---

## Phase 3 — recovery-plans performance

- [ ] **3.1** Stop per-keystroke builder re-render (~350 components/keystroke) — **M**
- [ ] **3.2** `useCallback` the inventory `select` (~14k comparisons/render at 2k VMs) — **XS**
- [ ] **3.3** Pass empty array to `useQueries` when off-step — **S**
- [ ] **3.4** Parallelize providers + recovery groups; stabilize the queryKey — **M**
- [ ] **3.5** `EMPTY_LABELS` default + hoist `searchFields` at all 7 call sites — **S**
- [ ] **3.6** Move the render-phase parent `setState` into an effect — **S**
- [ ] **3.7** Delete the no-op memo (`PolicySetsTable.tsx:62`) — **XS**

**Checkpoint D** — [ ] suite green · [ ] no console warnings · [ ] parallel fetches in Network

---

## Phase 4 — Extractions that unlock tests

- [ ] **4.1** `useTopologyLayout` — dedupes a **copy-pasted stale-request guard** that no test exercises (after 2.1) — **M**
- [ ] **4.2** Power mapper: use canonical `isKnownTopologyValue` / `createTopologyEdgeId` (after 1.1) — **S**
- [ ] **4.3** `reorderTiers()` — 8 existing tests, **zero** cover reorder — **S**
- [ ] **4.4** Validation chain out from behind `alert()` (after 1.6) — **M**
- [ ] **4.5** `resolveInfrastructureTopology` — testability only; the memo is already correct — **S**
- [ ] **4.6** Wizard step math — kills the magic numbers (after 3.3, 3.6) — **M**
- [ ] **4.7** `calculateTooltipPosition` — only 1 of 4 branches is tested today — **S**

**Checkpoint E** — [ ] suite green · [ ] coverage up on extracted units

---

## Phase 5 — Deduplication (lower urgency)

- [ ] **5.1** ⚠ `requireOk` in `apiClient` — **reverses a documented policy; confirm first** — **S**
- [ ] **5.2** `useRecoveryGroupSubmission` — ~45 byte-identical lines across the two pages — **M**
- [ ] **5.3** `resolveFlashcopyProvider` → `providers-connectors/providers/model/` — **S**
- [ ] **5.4** Shared recovery-VM schema; derive TS via `z.infer` — **S**
- [ ] **5.5** `paginate()` only — leave the filter state separate — **XS**
- [ ] **5.6** Shared `JsonViewerModal` (defined twice) — **S**
- [ ] **5.7** *(optional)* `isPowerInventory` — 2 impls + 3 open-coded checks — **XS**

**Checkpoint F** — [ ] suite green · [ ] no behaviour change

---

## Blocked / needs an answer

- [ ] **Q1** 5.1 reverses `apiClient.ts`'s documented "callers keep their own `.ok` checks". Approve?
- [ ] **Q2** 1.7 — are provider ids prefixed `VMware…` / `IBM…`? Decides real bug vs no-op.
- [ ] **Q3** 3.1 — lift metadata state on blur (removes cause) or memoize props (treats symptom)?
- [ ] **Q4** N+1: batch `vdisks_by_vms` endpoint feasible? Until then 100 VMs = 100 requests.
- [ ] **Q5** Phase 1 before Phase 2, or is the graph freeze more urgent?

---

## Do NOT do (considered and rejected — see plan for reasoning)

Merge the two portals · generic node component · unify the two resources pages ·
CRUD factory for policy-sets/snapshot-policies · shared `statusColor()` ·
promote `parseCapacity` · extract the ~12 table column helpers · unify the three
filter memos · move `topologyFlowModel.ts` · `onlyRenderVisibleElements` /
inline `fitViewOptions` (speculative — measure first) · one-line label ternaries
