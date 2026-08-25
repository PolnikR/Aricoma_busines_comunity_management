# Implementation Plan: Fixed VMware Provider Filters and Compact Resource Tabs

## Overview

Implement the approved resource inventory design in the production React UI for
both Resources (`source`) and Resources ISE (`target`). A VMware provider with a
configured `vmPrefix` or first non-empty `vmTags` value owns an immutable filter:
the provider configuration controls inventory requests, the search and filter
controls remain visible but read-only, and the inventory header displays the
active prefix/tag combination instead of the normal browse description.

Provider tabs will use short resource-type labels with the programmatic provider
ID in a compact monospace badge. The change is frontend-only; it does not alter
the provider API, inventory endpoints, generated OpenAPI models, FlashSystem or
IBM Power filter semantics, pagination, refresh, density, or detail drawers.

## Task Tracking

Implementation tasks are tracked in GitHub Issues for
`PolnikR/Aricoma_busines_comunity_management`. This file records architecture,
ordering, checkpoints, and risks; issue bodies contain task-level acceptance
criteria, verification commands, dependencies, and expected files.

## Confirmed Behavior

- A trimmed non-empty `vmPrefix` or first trimmed non-empty `vmTags` entry makes
  the VMware provider filter fixed.
- Fixed filter values are the only active search/tag values. Power state,
  connection state, cluster, and untagged remain at their empty defaults.
- Provider configuration wins over URL filters and `sessionStorage` snapshots
  synchronously, before an inventory request can run.
- Search and the Filters button remain visible. The dialog opens, but search,
  every filter field, Clear all, and Apply are disabled. Cancel/close, refresh,
  density, pagination, tabs, and row details remain usable.
- Under `Inventory records`, a fixed provider replaces the browse description
  with `Provider filter:` plus only the available chips:
  `VM name <prefix>.*` and `VM tag <tag>`.
- A provider without either value keeps the localized equivalent of
  `Browse and inspect discovered VMware resources.` and editable filters.
- Resource tabs show a short translated resource label and the provider ID,
  never the provider display name. English labels are `VMware VMs`,
  `Flash Volumes`, and `IBM Power`.

## Architecture Decisions

- Add one pure VMware provider-filter normalizer and reuse its result in the URL
  hook and page. This prevents request behavior, read-only state, and displayed
  chips from disagreeing.
- Keep the fixed-filter authority in `useVirtualMachineSearchParams`; disabling
  controls alone is insufficient because direct URLs and old session snapshots
  could otherwise change requests.
- Clear or canonicalize stale mutable URL/session filter state when fixed mode
  activates, while deriving the first query synchronously from provider data so
  cleanup never causes a transient unfiltered fetch.
- Extend `DataTableToolbar` through optional read-only props whose defaults keep
  every existing caller unchanged. The Filters launcher stays enabled.
- Let `InventoryShell` accept rich description content through `ReactNode`, then
  render a focused `ProviderFilterSummary` from `VmwareResourcesPage`. Other
  inventory pages continue passing strings.
- Preserve `buildResourceTabsByRole` as the source of routing identity and sort
  order, but stop appending `provider.name`. Render the existing `providerId`
  with a resource-specific label component in both role pages.
- Apply compact typography inside the resource tab label rather than changing
  the shared `Tabs` defaults for unrelated screens.

## Dependency Graph

```text
#6 Immutable provider-filter contract
 |\
 | +--> #7 Read-only toolbar controls ----+
 |                                      |
 +----> #8 Provider-filter summary -------+--> #9 Source/target integration

#10 Short tab data and localized copy --> #11 Compact provider-ID tab rendering
```

Issues #7 and #8 may proceed in parallel after #6. Issues #10 and #11 form an
independent branch and may proceed alongside the fixed-filter branch. Issue #9
is the integration gate and starts only after #6, #7, and #8 are complete.

## Task List

### Phase 1: Fixed-filter foundation

1. [#6 — Enforce immutable VMware provider filters](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/6)
2. [#7 — Lock VMware filter controls for fixed providers](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/7)
3. [#8 — Add localized VMware provider-filter summary](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/8)

### Checkpoint: Fixed-filter contract

- [ ] #6 helper and hook tests prove fixed prefix-only, tag-only, combined, URL,
      session, reset, source, target, and pagination behavior.
- [ ] #7 toolbar tests prove the dialog opens but cannot mutate fixed filters.
- [ ] #8 renders only configured chips in EN, SK, and CS and wraps on narrow
      widths.
- [ ] Focused lint and `git diff --check` pass for each atomic task commit.

### Phase 2: Fixed-filter integration

4. [#9 — Integrate fixed-filter state into Resources and Resources ISE](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/9)

### Checkpoint: Resource page behavior

- [ ] Source and target use their selected provider configuration without a
      transient unfiltered request.
- [ ] Fixed providers show the summary and read-only controls.
- [ ] Providers without a filter show the browse description and editable
      controls.
- [ ] Existing loading, background refresh, error, empty, pagination, density,
      and detail-panel behavior remains green in focused tests.

### Phase 3: Compact provider tabs

5. [#10 — Normalize compact resource provider tab labels](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/10)
6. [#11 — Render compact provider ID badges in resource tabs](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/11)

### Final Checkpoint

- [ ] All issue-specific Vitest commands pass together.
- [ ] Changed TypeScript/TSX files pass focused ESLint.
- [ ] Locale JSON files parse successfully.
- [ ] Typecheck passes because the shared `InventoryShell` description contract
      and resource-tab item rendering cross component boundaries.
- [ ] Browser verification covers Resources and Resources ISE at 320, 768,
      1024, and 1440 px, including tab overflow and the fixed-filter modal.
- [ ] Network inspection confirms only canonical provider prefix/tag values are
      sent and no transient unfiltered request occurs.
- [ ] `git diff --check`, staged diff inspection, and task-scoped atomic commits
      preserve unrelated worktree files.
- [ ] The full suite/build is run only if focused verification exposes a
      cross-cutting failure or the reviewer explicitly requests it.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| UI is disabled but URL/session still overrides requests | High | Enforce authority in #6 before rendering read-only state |
| Fixed mode briefly issues an unfiltered request | High | Compute canonical filters synchronously and test the first enabled query |
| Stale snapshot returns if provider configuration later changes | Medium | Remove or canonicalize mutable snapshot state while fixed mode is active |
| Shared toolbar change disables unrelated tables | High | Optional props default to current behavior; retain existing toolbar test |
| Inventory header markup regresses other resource pages | Medium | Accept `ReactNode` compatibly and keep string rendering covered |
| Compact tab styling leaks into global tabs | Medium | Style a resource-owned label component, not shared Tabs defaults |
| Long provider IDs overflow on mobile | Medium | Monospace badge, no wrapping inside a tab, existing horizontal scroll controls |
| Prefix display and request prefix diverge | Medium | Use the same normalized contract; append `.*` only for display |
| Locale copy becomes inconsistent | Low | Update and parse EN, SK, and CS in the same task |

## Out of Scope

- Backend or OpenAPI changes.
- Making fixed filters editable from Resources or Resources ISE.
- Changes to FlashSystem or IBM Power filter behavior.
- Replacing provider IDs with display names in tabs.
- Redesigning shared tabs or inventory layouts outside the resource pages.
- Committing the HTML prototype as production code; it remains a visual
  reference only.

## Open Questions

None. The approved HTML prototype at
`prototypes/resources-fixed-filter/index.html` is the visual reference, and the
six linked issues are ready for implementation in dependency order.
