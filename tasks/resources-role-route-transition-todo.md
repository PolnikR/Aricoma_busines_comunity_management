# Task Checklist: Smooth Resources Role Route Transition

## Phase 1: Stable route identity

- [ ] Add canonical `/discovery-inventory/resources/:role` routing for `source` and `target`.
- [ ] Add a route adapter that validates `role` before rendering `ResourceRolePage`.
- [ ] Redirect legacy `/discovery-inventory/resources` to `/discovery-inventory/resources/source`.
- [ ] Redirect legacy `/discovery-inventory/resources-ise` to `/discovery-inventory/resources/target`.
- [ ] Cover canonical roles, redirects, and invalid roles with focused route tests.

## Phase 1 checkpoint

- [ ] Both canonical URLs render the correct provider role.
- [ ] Old bookmarks remain functional.
- [ ] Invalid role values cannot expose the wrong inventory scope.

## Phase 2: Sidebar contract

- [ ] Keep `Resources` and `Resources ISE` as separate sidebar entries.
- [ ] Link `Resources` to the canonical source URL.
- [ ] Link `Resources ISE` to the canonical target URL.
- [ ] Verify exact active-link highlighting for both role URLs.

## Phase 3: Mounted page continuity

- [ ] Remove `key={effectiveActiveTab.value}` from the resource page dispatch.
- [ ] Confirm changing resource type still selects the correct component.
- [ ] Close the VMware detail drawer when its selected VM is absent after provider/role change.
- [ ] Clear FlashSystem selection when its selected volume is absent after provider/role change.
- [ ] Clear IBM Power selection when its selected partition is absent after provider/role change.
- [ ] Add focused regression tests for all three selection resets.

## Phase 3 checkpoint

- [ ] Same-type role/provider switching preserves the shared component tree.
- [ ] No stale detail panel survives a provider or role change.
- [ ] Density and other safe display preferences may remain stable.

## Phase 4: Cache and loading behavior

- [ ] Assert provider identity remains in VMware, FlashSystem, and IBM Power query keys.
- [ ] Assert cached target inventory is reused when returning to Resources ISE.
- [ ] Assert source inventory is never displayed as resolved target inventory.
- [ ] Keep the inventory page shell mounted while a new provider query is pending.

## Final verification

- [ ] Run focused route and sidebar tests.
- [ ] Run focused Resources/Resources ISE page and component tests.
- [ ] Run focused inventory-hook tests.
- [ ] Run focused ESLint for touched files.
- [ ] Run `npm run typecheck`.
- [ ] Run `git diff --check`.
- [ ] In a real browser, repeatedly switch Resources ↔ Resources ISE at desktop and narrow widths.
- [ ] Confirm no console errors, duplicated requests, stale drawers, or full-shell collapse.
- [ ] Commit only files belonging to this transition plan.
