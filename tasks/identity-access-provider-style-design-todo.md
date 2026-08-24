# Todo: Identity & Access Provider-Style Visual Alignment

## Phase 1: Shared page shell

- [ ] Task 1: Remove the realm context strip and move top-level section actions to the page header.
- [ ] Task 2: Add the shared Providers-style Identity content panel and align detail-page surface styling.

## Phase 2: Reference sections

- [ ] Task 3: Convert Users and Realm roles to the approved list layout.

## Checkpoint: Reference layout

- [ ] Page header/action placement matches Providers.
- [ ] `REALM / ABCO / Keycloak realm administration` is absent.
- [ ] Realm roles has no redundant section title/description band.
- [ ] Users and Realm roles tables start directly inside the inner panel.
- [ ] Focused Tasks 1-3 tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Changed-file ESLint passes with zero warnings.
- [ ] Browser review matches the approved HTML template.

## Phase 3: Manage sections

- [ ] Task 4: Apply the list layout to Clients, Client scopes, Organizations, Groups, and Sessions.
- [ ] Task 5: Align Events, Authentication, and Realm settings while preserving nested tabs.

## Phase 4: Configure sections

- [ ] Task 6: Align Identity providers, User federation, and Permissions.

## Checkpoint: Complete visual propagation

- [ ] Every top-level Identity Access section uses the same shell hierarchy.
- [ ] Top-level actions render only in the page header.
- [ ] Entity/detail headers and back navigation remain intact.
- [ ] Manage/Configure, section tabs, nested tabs, URL parameters, tables, search, density, pagination, and error/empty states still work.
- [ ] `npm run typecheck` passes.
- [ ] Changed-file ESLint passes with zero warnings.

## Phase 5: Final visual verification

- [ ] Task 7: Compare Providers and Identity Access side-by-side in the browser.
- [ ] Verify 1584×772 desktop layout.
- [ ] Verify 1366×768 pagination/table fit.
- [ ] Verify 1024×768 navigation and horizontal overflow behavior.
- [ ] Verify user/role/client detail open/back flows do not cause layout jumps.
- [ ] Verify browser console has no new errors.
- [ ] Run the complete focused Identity Access test set.
- [ ] Run `npm run typecheck`.
- [ ] Run changed-file ESLint with zero warnings.
- [ ] Run `npm run build` once at the final cross-cutting checkpoint.
- [ ] Run `git diff --check` and inspect diff/status.
- [ ] Commit only in-scope files.
