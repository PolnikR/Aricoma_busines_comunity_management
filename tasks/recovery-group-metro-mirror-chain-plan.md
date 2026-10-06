# Implementation Plan: Recovery Group Metro Mirror chain (approved D3)

## Overview
Bring the approved D3 prototype (`prototypes/recovery-group-metro-mirror/index.html`, variant D,
commit `069974c9`) to production: Recovery Group → Inventory shows the Metro Mirror consistency-group
status, a replication chain (master → Metro Mirror → auxiliary → FlashCopy → snapshots) built on the
shared `relationship-graph`, and an auxiliary volume inventory whose expanded rows show a FlashCopy
fan-out with a bounded, sticky-headed target list. Recovery Group `DetailView` switches to `size="xl"`.

## Spec (what "done" means)
- Inventory order: quiet summary → Metro Mirror status → Replication chain → Auxiliary volume inventory.
- No KPI cards; summary is `N volumes · N found · N FlashCopy relations` from real data.
- Chain rows use shared `RelationshipNode` / `RelationshipConnector`; no feature-level graph infrastructure.
- Metro Mirror connector: accent, label + value (`72 %` / `In sync` / `Not reported`), progress fill,
  dashed when progress is not reported, reversed when the mapping's primary is the auxiliary volume.
- Row state shown only when it differs from the consistency group (or is unknown); primary only when it
  differs from the group's primary.
- FlashCopy connector: protection (pink) tone; compact `N snapshots` endpoint; `No snapshots` when zero;
  no endpoint when the auxiliary is missing or not found.
- Missing auxiliary: problem node, no action.
- Hover/focus: whole row highlighted, others softened to ~60 %; chain ↔ inventory cross-highlight.
- Auxiliary node / snapshot endpoint click: expand + scroll + focus the inventory row, Inventory stays active.
- Fan-out: source drawn once; only the target list scrolls (max 240 px, overscroll-contain, sticky header).
- ≥ 6 mappings paginate at 5 per page with the shared `Pagination`.
- Error: status block "Status unavailable" + message + provider + mode; inventory still renders.
- `metro_mirror` empty → quiet empty state; `metro_mirror` null/absent → no Metro Mirror UI.
- Compact/narrow: chain and fan-out stack vertically, no horizontal overflow.

## Architecture Decisions
- **All shared extensions are opt-in; defaults keep today's output byte-for-byte**, so Provider, VMware,
  IBM Power and FlashSystem helpers do not change. Their existing tests act as the regression net.
- `RelationshipGraph` gains (all optional):
  - `density: 'default' | 'compact'` (context) → compact nodes, label-above connectors with 3 px lines.
  - `dimming: 'strong' | 'soft'` → soft = 60 % for unrelated nodes/edges, active nodes get an accent
    border and the active chain a quiet surface. Default `strong` keeps 35 % / 12 %.
  - `highlightScope: 'neighbours' | 'component'` → component = connected component (whole row).
  - `activeEntityId` (external, controlled highlight) + `onActiveEntityChange` (reports internal
    hover/focus). Priority: internal hover → external → internal focus.
- `RelationshipConnector` gains `kind: 'replication' | 'protection'`, `value`, `note`, `progress`
  (0–100, fill follows direction), `lineStyle: 'solid' | 'dashed'` (default keeps problem = dashed).
  Label moves above the line only when density is compact or rich content is given.
- `RelationshipNode` gains `onActivate` (+ `activateLabel`) → real `<button>`, and `nameLines: 1 | 2`
  (two-line clamp with break opportunities after `_ - . /`). Passive nodes stay focusable groups.
- `RelationshipChain` gains `layout: 'balanced' | 'leading'`; `leading` widens the first connector and
  sizes the trailing column for a compact endpoint, with a second step at 54rem graph width.
- `RelationshipGroup` gains `header` (ReactNode) that replaces the visible eyebrow (title stays the
  accessible name); `RelationshipLanes` renders lane labels on the chain grid, hidden when stacked.
- Fan-out stays a Recovery Group feature component (no second one-to-many use case exists).
- Metro Mirror state → presentation lives in a feature helper with an explicit table of IBM
  rcrelationship/rcconsistgrp states (the contract gives no enum); unknown states are neutral.
- `RecoveryGroupsTable` uses `size="xl"`; the Inventory section description becomes the quiet summary
  (shares the inventory query cache, no extra request).

## Dependency on uncommitted contract
`metro_mirror` exists only in the uncommitted regeneration of `openapi/abco-api.json` and
`src/generated/query/zod/*` (not part of this task). The zod response validator strips unknown keys,
so production cannot show Metro Mirror until that contract change is committed. See Open Questions.

## Task List
See `tasks/recovery-group-metro-mirror-chain-todo.md`.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared changes alter existing helpers | High | Opt-in props, defaults unchanged; existing tests + browser check of Provider/VMware/IBM Power helpers |
| Feature code compiles only with uncommitted contract | High | User decision before Recovery Group commits |
| Backend for the browser check returns no `metro_mirror` data | Med | Verify real app with CDP-intercepted inventory response fixtures; state it in the report |
| `<details>` + controlled open + scroll/focus timing | Low | Controlled `open` state, reveal in effect after render, focused test |

## Open Questions
- How to handle the uncommitted Metro Mirror contract regeneration (commit as its own `chore(api)`
  commit first, or leave it and commit feature code that depends on it).
