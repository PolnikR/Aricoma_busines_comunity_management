# Task Checklist: Smooth Resources Role Route Transition

## Phase 1: Stable route identity

- [x] Add canonical `/discovery-inventory/resources/:role` routing for `source` and `target`.
- [x] Add a route adapter that validates `role` before rendering `ResourceRolePage`.
- [x] Redirect legacy `/discovery-inventory/resources` to `/discovery-inventory/resources/source`.
- [x] Redirect legacy `/discovery-inventory/resources-ise` to `/discovery-inventory/resources/target`.
- [x] Cover canonical roles, redirects, and invalid roles with focused route tests.

## Phase 1 checkpoint

- [x] Both canonical URLs render the correct provider role.
- [x] Old bookmarks remain functional.
- [x] Invalid role values cannot expose the wrong inventory scope.

## Phase 2: Sidebar contract

- [x] Keep `Resources` and `Resources ISE` as separate sidebar entries.
- [x] Link `Resources` to the canonical source URL.
- [x] Link `Resources ISE` to the canonical target URL.
- [x] Verify exact active-link highlighting for both role URLs.

## Phase 3: Mounted page continuity

- [x] Remove `key={effectiveActiveTab.value}` from the resource page dispatch.
- [x] Confirm changing resource type still selects the correct component.
- [x] Close the VMware detail drawer when its selected VM is absent after provider/role change.
- [x] Clear FlashSystem selection when its selected volume is absent after provider/role change.
- [x] Clear IBM Power selection when its selected partition is absent after provider/role change.
- [x] Add focused regression tests for all three selection resets.

## Phase 3 checkpoint

- [x] Same-type role/provider switching preserves the shared component tree.
- [x] No stale detail panel survives a provider or role change.
- [x] Density and other safe display preferences may remain stable.

## Phase 4: Cache and loading behavior

- [x] Assert provider identity remains in VMware, FlashSystem, and IBM Power query keys.
- [x] Assert cached target inventory is reused when returning to Resources ISE.
- [x] Assert source inventory is never displayed as resolved target inventory.
- [x] Keep the inventory page shell mounted while a new provider query is pending.

## Final verification

- [x] Run focused route and sidebar tests.
- [x] Run focused Resources/Resources ISE page and component tests.
- [x] Run focused inventory-hook tests.
- [x] Run focused ESLint for touched files.
- [x] Run `npm run typecheck`.
- [x] Run `git diff --check`.
- [ ] In a real browser, repeatedly switch Resources ↔ Resources ISE at desktop and narrow widths.
- [ ] Confirm no console errors, duplicated requests, stale drawers, or full-shell collapse.
- [x] Commit only files belonging to this transition plan.

> Note: the full `npm test` run did not complete in this environment (it remained silent and was interrupted after more than two minutes); the focused suite passed 66/66 tests. The real-browser check was not available because no Chrome DevTools MCP server is configured.
