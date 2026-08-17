# Implementation Plan: FlashSystem Host Badges and Tooltip

## Overview

Replace comma-separated host names in the FlashSystem `Mapped hosts` cell with
two compact outline badges and an optional `+N` overflow badge. Each host badge
exposes a localized, accessible tooltip derived entirely from cached inventory
data. No new endpoint, page, panel, dependency, or commit is introduced.

## Architecture decisions

- Aggregate host information with a pure provider-scoped helper before rendering
  table cells.
- Keep the column definition declarative by delegating the host cell to a
  focused component.
- Render tooltips through a portal with viewport-aware fixed positioning so the
  table scroll containers cannot clip them.
- Use semantic buttons styled as informational badges; they are not presented as
  visible action buttons and stop row-click propagation.
- Keep tooltip state local to each host cell and make hover, focus, keyboard, and
  touch behavior equivalent.

## Task 1: Derive provider-scoped host summaries

**Description:** Build a pure helper that groups resolved host mappings across
FlashSystem volume resources.

**Acceptance criteria:**

- Equal host IDs from different providers produce separate summaries.
- Volumes are unique per host and preserve their SCSI/LUN mappings.
- Mapped volume count and recognized capacity totals are correct.

**Verification:**

- Add focused helper tests for provider collisions, duplicate mappings, capacity,
  and missing cluster data.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/helpers/buildFlashSystemHostSummaries.ts`
- `src/features/discovery-inventory/resources/helpers/buildFlashSystemHostSummaries.test.ts`

**Estimated scope:** Small

## Task 2: Implement the accessible host tooltip

**Description:** Create a portal-based tooltip for one host summary with
viewport-aware placement and a five-row scroll threshold.

**Acceptance criteria:**

- Hover, focus, and tap open the tooltip; pointer leave, blur, Escape, and outside
  tap close it.
- Tooltip and badge are connected with accessible attributes.
- Only the mapped-volume list scrolls when it contains more than five rows.

**Verification:**

- Component tests cover keyboard, pointer, touch/click, positioning boundary
  behavior, and scroll class activation.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/FlashSystemHostBadge.tsx`
- `src/features/discovery-inventory/resources/components/FlashSystemHostBadge.test.tsx`

**Estimated scope:** Small

## Task 3: Add the bounded mapped-host cell

**Description:** Render at most two host badges in a single-line cell and add a
localized `+N` badge with a compact remaining-host tooltip.

**Acceptance criteria:**

- Zero hosts still render `-`.
- One or two hosts render one or two outline badges.
- More than two hosts render exactly two host badges and one `+N` badge without
  increasing row height.

**Verification:**

- Component tests cover all three cardinalities and overflow host names.
- Badge interaction does not trigger the parent volume-row selection.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/FlashSystemHostsCell.tsx`
- `src/features/discovery-inventory/resources/components/FlashSystemHostsCell.test.tsx`

**Estimated scope:** Small

## Checkpoint 1

- Run the new host-summary and host-component test files.
- Run TypeScript and focused lint.

## Task 4: Integrate badges into the FlashSystem table

**Description:** Compute host summaries once per inventory view and supply the
mapped-host cell renderer to the existing FlashSystem columns.

**Acceptance criteria:**

- Existing table columns and order remain unchanged.
- Host badge clicks do not open the volume drawer; normal row clicks still do.
- No new resource query or API request occurs.

**Verification:**

- Extend `FlashSystemInventoryView.test.tsx` with badge, tooltip, overflow, and
  row-selection regression assertions.

**Dependencies:** Tasks 1–3

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/FlashSystemInventoryView.tsx`
- `src/features/discovery-inventory/resources/config/flashSystemColumns.tsx`
- `src/features/discovery-inventory/resources/components/FlashSystemInventoryView.test.tsx`

**Estimated scope:** Medium

## Task 5: Localize host information

**Description:** Add host tooltip, unavailable state, cluster, capacity, volume,
LUN, and overflow labels to every supported locale.

**Acceptance criteria:**

- EN, SK, and CS contain identical new keys.
- No tooltip prose or accessible label is hardcoded.
- Host names, volume names, IDs, and LUN values remain unchanged API data.

**Verification:**

- Run locale JSON parsing and language-switching tests.
- Assert translated tooltip labels in component tests.

**Dependencies:** Tasks 2 and 3

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium

## Final checkpoint

- Run all changed and newly added tests with at most two Vitest workers.
- Run `eslint` with zero warnings.
- Run TypeScript project typecheck.
- Run the production Vite build.
- Run `git diff --check`.
- Confirm dependency files, `.claude/`, and Git history are unchanged.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tooltip clipped by table scroll containers | High | Render through a body portal with fixed viewport-aware coordinates |
| Badge interaction opens the volume drawer | High | Stop click and keyboard event propagation and test the complete table flow |
| Hover closes while moving into scrollable tooltip | Medium | Use a short close delay shared by badge and tooltip pointer handlers |
| Host IDs collide across providers | High | Use encoded provider ID and host ID as the aggregation key |
| Unknown capacity units produce misleading totals | Medium | Sum recognized parsed capacities only and show unavailable when none parse |
| Many volumes make the tooltip too tall | Medium | Fix list height to five rows and scroll only the list |

## Open questions

None. The approved specification defines the visual and interaction behavior.
