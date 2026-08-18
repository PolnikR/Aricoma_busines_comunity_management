# Implementation Plan: Hide Empty Resource Tabs in ResourceRolePage

## Overview
`ResourceRolePage` (shared by the Resources page, role="source", and Resources ISE page, role="target") currently always renders a tab for every resource type (VMware, FlashSystem, IBM Power) even when no provider of that type exists for the current role. This produces confusing empty tabs. This fix hides tabs with no matching provider once the provider list has loaded, redirects the active tab to a populated one if the current selection has none, and shows a single page-level empty state if literally no providers exist for the role — all without touching the pure tab-building helper (`buildResourceTabsByRole`) or the per-type sub-pages.

## Architecture Decisions
- Keep `buildResourceTabsByRole` unchanged. It still returns a placeholder `":none"` tab per type — this is still needed while providers are loading (so the currently-selected tab doesn't disappear mid-fetch) and it's already covered by existing tests.
- Do the visibility filtering in `ResourceRolePage` itself, gated on `providersSuccess`:
  - Before success (loading/error): show all tabs as today (unchanged behavior, existing tests already lock this in).
  - After success: only tabs with a real `providerId` are shown (`visibleRoleTabs`).
- If the currently active tab has no provider but another visible tab exists, redirect to the first visible tab (`effectiveActiveTab`) — both the tab strip and the rendered sub-page follow this resolved tab, not the raw URL param, avoiding a one-frame mismatch where a provider ID from one resource type gets passed to a different type's page.
- If `providersSuccess` is true and there are zero visible tabs (no provider at all for this role), render one page-level `EmptyState` (reusing the existing `resources.common.noProviderTitle/Description` copy) instead of falling through to whichever sub-page defaults to the `vmware` tab. No new translation keys needed.

## Task List

### Phase 1: Core Logic
- [ ] Task 1: Update `ResourceRolePage.tsx` — add `visibleRoleTabs`, `effectiveActiveTab`, update the redirect effect, branch the switch on the resolved tab, and add the page-level empty-state early return.

### Checkpoint: Core Logic
- [ ] Component compiles with no type errors
- [ ] Manual trace confirms: loading state still shows all tabs; post-success state hides empty ones; all-empty state shows one unified empty view with no tab strip

### Phase 2: Test Updates
- [ ] Task 2: Update `ResourcesPage.test.tsx` — the "renders metrics, toolbar, and empty inventory state" test must assert FlashSystem/IBM Power tabs are absent (only one provider exists); the "terminal no-provider state" test gets an added assertion that no tablist renders.
- [ ] Task 3: Update `ResourcesIsePage.test.tsx` — same two changes as Task 2, plus rewrite "excludes source-role providers from target tabs" to add a second, genuinely-target-role provider of a different type, so the assertion proves exclusion via tab absence rather than relying on the old placeholder-tab fallback.

### Checkpoint: Complete
- [ ] Focused tests pass: `ResourcesPage.test.tsx`, `ResourcesIsePage.test.tsx`
- [ ] Typecheck passes for changed files
- [ ] All acceptance criteria met

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Redirecting to a different resource type could pass the wrong `providerId` into the wrong sub-page for one render | Medium — data mismatch, wrong inventory query fired | Switch statement branches on `effectiveActiveTab.resourceTab`, not the raw URL param, so the rendered sub-page and its `providerId` always agree |
| Filtering during the loading phase could hide the tab the user is currently on before providers resolve | Medium — flicker / lost selection | Filtering only applies once `providersSuccess` is true; pre-success renders keep today's full tab list |
| Page-level empty state title/description not perfectly generic (reuses the VMware-flavored `pages.virtualMachines.title` for the source role, matching existing per-tab behavior) | Low — cosmetic only | Out of scope for this bug fix; flagged here, not solved now |

## Open Questions
None — scope confirmed with user: tab-visibility bug fix only, no route/folder restructuring.
