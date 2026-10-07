# Implementation Plan: Backing Storage Info on A4 DetailOverview

## Overview
Move the shared `BackingStorageInfo` (VMware VM + IBM Power LPAR) from `DetailFieldGroup` to the
approved A4 `DetailOverview` grid: volume metadata, FlashCopy counts and the loading skeleton.
Pure layout refactor of one shared component; content, field order, API, identity and
FlashCopy logic stay unchanged. Mapping tables stay tables.

## Current state (verified)
- `BackingStorageInfo.tsx` has no uncommitted hunks on `spike/ant-design-shell`.
- `BackingStorageVolume`: `DetailFieldGroup` (provider, identity, capacity, status, pool,
  I/O group, protocol, type) + `DetailFieldGroup title=FlashCopy / Snapshots` (3 counts).
- `BackingStorageSkeleton`: hand-copied old grid (`grid-cols-1`, 2 cols @520, 3 cols @860,
  `gap-x-10 gap-y-5`) with 6 label/value skeleton pairs.
- `DetailOverview` (shared/detail-view) already implements A4: auto-fill tracks, row rules,
  last-row clip, footprint via `getOverviewFootprint` (wide → full; ≤28 normal; 29–64 wide;
  >64 full; nodes/empty normal; mono not weighted).
- Both panel tests already assert `card.querySelectorAll('dl')` length 2 and the dt order of
  `lists[0]` — they stay valid because `DetailOverview` renders a `dl`.

## Architecture Decisions
- **No explicit `wide`** on any field. Footprint comes from the shared helper (e.g. a 32-char
  vdisk UID → wide by length, provider name/ID node → normal).
- **FlashCopy heading kept outside the grid**: a wrapper `<div>` with the same `h4`
  (`text-[13px] font-semibold leading-5 text-text-primary`, `mb-3.5`) the old `GroupHeader`
  rendered, followed by `DetailOverview`. No card, surface, background or vertical rule.
  Text order in the card (`Type … FlashCopy / Snapshots … No FlashCopy mappings`) is preserved.
- **Skeleton = ClientsSection pattern**: header skeletons stay, then
  `DetailOverview` with `DetailField label=<real label> value={<SkeletonBlock className="h-4 w-32" />}`.
  Labels follow the loaded order. The skeleton receives the existing `identity` prop so its
  field list matches the loaded state per platform (internal component only; no public
  prop change). `role="status"`, `aria-busy`, `aria-label` kept. No own A4 CSS.
- `DetailFieldGroup` import removed (orphaned by this change); spacing (`gap-6` section, `-mt-3`
  no-mappings text) left as is unless browser check shows a regression.

## Task List

### Task 1: Volume metadata + FlashCopy counts on DetailOverview (S)
**Acceptance criteria:**
- [ ] Volume metadata renders one `DetailOverview`, same fields/order/labels/values/`mono`/`copyValue`/secondary.
- [ ] FlashCopy heading stays, its 3 counts render in a second `DetailOverview` in the same order.
- [ ] Mapping tables, no-mappings text, identity branches untouched.

**Verification:** existing VMware + IBM Power panel tests pass unchanged.
**Files:** `BackingStorageInfo.tsx`

### Task 2: Skeleton on shared DetailOverview (XS)
**Acceptance criteria:**
- [ ] Hand-written old grid removed; skeleton renders `DetailOverview` + `DetailField` + `SkeletonBlock`.
- [ ] `role="status"` / `aria-busy` / accessible label kept.

**Verification:** loading tests pass. **Files:** `BackingStorageInfo.tsx`

### Task 3: Minimal layout assertions (S)
- VMware + IBM Power: both `dl`s carry the A4 grid class (`grid-cols-[repeat(auto-fill,…)]`),
  FlashCopy `dl` dt order = Snapshot count, Source mappings, Target mappings; copy buttons present.
- Loading (both panels): status has a `dl` with the A4 grid class and no `grid-cols-1` /
  `@min-[520px]/detail-content:grid-cols-2` element.
- Existing identity-leak, order, no-mappings and mapping-table assertions are kept as is.

**Files:** `vmware/VirtualMachineDetailPanel.test.tsx`, `ibm-power/IbmPowerDetailPanel.test.tsx`

### Checkpoint: Verification
- [ ] `npm exec vitest run <both panel tests>`
- [ ] `npx eslint <3 files>`
- [ ] `npm run typecheck`
- [ ] `git diff --check`

### Task 4: Browser verification (CDP, own tab on Edge :9333)
VMware VM and IBM Power LPAR → Backing Storage Info: row rules, no vertical rules, original
order, FlashCopy heading + 3 counts on A4 grid, no-mappings text, mapping table still a table,
no horizontal overflow, last row without rule; IBM Power Volume ID + Volume UID, no vdisk UID.
1440 light, narrow, dark on at least one view.

### Task 5: Commit
Stage only `BackingStorageInfo.tsx`, the 2 test files and these 2 plan files (explicit paths).
`tasks/detail-drawer-master-inventory.json` and the pre-existing openapi/zod changes untouched.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Heading-to-grid spacing differs from old `mb-3.5` + grid | Low | Keep `mb-3.5`; adjust only if browser check shows clash with the first row's `py-2` |
| `-mt-3` no-mappings text sits too close to the clipped last row | Low | Check in browser; leave unless visibly broken |
| Class-based layout assertions are brittle | Low | Assert only the single A4 grid class already pinned by `DetailContent.test.tsx` |

## Open Questions
- Skeleton labels: real labels in loaded order (incl. identity per platform) — recommended — vs.
  a fixed platform-neutral list without identity (no `identity` passed to the skeleton).
