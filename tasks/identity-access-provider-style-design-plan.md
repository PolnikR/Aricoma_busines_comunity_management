# Implementation Plan: Identity & Access Provider-Style Visual Alignment

## Overview

Align the complete Identity & Access administration surface with the established Providers page visual language while preserving all current Keycloak navigation, URL-backed section/entity/tab behavior, data loading, table behavior, and existing feature gating.

The approved visual reference is `.superpowers/brainstorm/identity-access-provider-style-v1.html`. The target structure is:

1. page header at the top, visually matching the Providers page;
2. section action in the same top-right position as **Add Provider**;
3. no `REALM / ABCO / Keycloak realm administration` context strip;
4. preserve the **Manage / Configure** selector and section tabs;
5. no redundant top-level section title/description band such as **Realm roles / Browse and manage Keycloak realm roles**;
6. content begins directly below the navigation in the same bordered, rounded, shadowed table/panel style used by Providers;
7. entity detail pages keep their resource-specific header, back navigation, nested tabs, and detail actions because those are functional context rather than redundant list-page decoration.

No backend, OpenAPI, data model, query, routing, or Keycloak contract change is in scope.

## Architecture Decisions

- Keep `PageHeader` as the page-level header. `TableToolbar` is not required because it delegates to `PageHeader`; using `PageHeader.actions` gives the same visual alignment without coupling non-table Identity sections to a table-specific component.
- Move only **top-level section actions** into the page header. Entity-detail actions remain inside `IdentityResourceDetailPage`.
- Avoid a global portal/context system. The current only functional top-level create action is **Add user**; lift only the modal-open state needed for that action into `IdentityAccessPage` and keep the modal/form implementation in `UsersSection` as controlled UI. Existing page-owned navigation can directly handle **Event settings**. Other current top-level actions are disabled placeholders and can be rendered from the page according to the active section/tab.
- Remove `IdentityResourceHeader` only from top-level section/list views. Keep it for entity details and not-found states.
- Introduce one small shared content-panel wrapper in `IdentityResourceLayout` for the Providers-style inner surface (`rounded-lg`, border, surface background, shadow, overflow handling). Reuse it across table and non-table top-level sections instead of duplicating layout classes.
- Make the main Identity content area use the same `bg-surface-subtle` + `p-3` treatment as `InventoryShell`, so tables/panels visually sit inside the outer administration card like the Providers catalogue.
- Preserve existing `DataTableToolbar`, density controls, filters, search, pagination, empty/error states, nested tabs, and current row-click navigation.

## Dependency Graph

```text
Page-level action contract + shell cleanup
                 |
                 v
Shared Providers-style content panel
                 |
          +------+------+
          |             |
          v             v
Manage list pages   Configure/top-level pages
          |             |
          +------+------+
                 v
Entity/detail regression checks
                 |
                 v
Responsive browser verification
```

## Task 1: Align the Identity Access page shell and header actions

**Description:** Update `IdentityAccessPage` so its page header owns top-level section actions, remove the realm context strip, and keep the existing Manage/Configure + section navigation as the first element inside the administration card. Make the active section content area use the same subtle background and padding rhythm as the Providers inventory surface.

**Acceptance criteria:**
- [ ] `REALM`, `ABCO`, and `Keycloak realm administration` are no longer rendered in the page shell.
- [ ] The current section action appears in the page header's top-right action area, aligned like **Add Provider**.
- [ ] Manage/Configure and section tabs keep their current URL-backed behavior and remain visually unchanged unless spacing is required for the approved mockup.
- [ ] The active section content receives provider-style inner padding/background without introducing horizontal overflow.

**Implementation notes:**
- Use `PageHeader.actions` rather than replacing `PageHeader` with `TableToolbar`.
- Render a small section-action switch/helper from `sectionId`, `entityId`, and `tabId`.
- Show top-level actions only when the user is not inside an entity detail where the action belongs to that detail page.
- Lift the Add-user modal open state to `IdentityAccessPage`; pass controlled open/close props to `UsersSection`.
- Reuse the existing `setSectionTab('realm-settings', 'events')` callback for the Event settings header action.

**Verification:**
- [ ] Update `IdentityAccessPage.test.tsx`: realm context is absent, navigation remains URL-backed, and page-level action changes with the active section.
- [ ] Update `UsersSection.test.tsx`: controlled Add-user modal still opens/closes and persistence remains gated.
- [ ] Run focused tests for those two files.

**Dependencies:** None

**Files likely touched:**
- `src/features/identity-access/pages/IdentityAccessPage.tsx`
- `src/features/identity-access/pages/IdentityAccessPage.test.tsx`
- `src/features/identity-access/components/UsersSection.tsx`
- `src/features/identity-access/components/UsersSection.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 2: Add a shared Providers-style Identity content panel

**Description:** Add a small reusable wrapper for top-level Identity section content and update the detail-page root styling so both list and detail surfaces use the same bordered, rounded, shadowed visual treatment as the Providers catalogue without changing their internal behavior.

**Acceptance criteria:**
- [ ] Top-level Identity section content can be wrapped in one shared panel with `rounded-lg`, border, surface background, shadow, and overflow-safe flex behavior.
- [ ] `IdentityResourceDetailPage` keeps its header, nested tabs, back button, actions, and children, but visually fits the new inner-panel system.
- [ ] The wrapper does not add its own title/description band.

**Verification:**
- [ ] Update `IdentityResourceLayout.test.tsx` to verify detail header/back/tabs/actions still render and the shared panel is used.
- [ ] Focused test passes with no accessibility regression in tablists/back buttons.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/identity-access/components/IdentityResourceLayout.tsx`
- `src/features/identity-access/components/IdentityResourceLayout.test.tsx`

**Estimated scope:** Small (2 files)

## Task 3: Convert Users and Realm roles to the approved list layout

**Description:** Apply the exact approved mockup pattern to the two reference table sections first. Remove the redundant list-level `IdentityResourceHeader`, keep search/density/table/pagination intact, and place those elements inside the new shared inner panel.

**Acceptance criteria:**
- [ ] Users and Realm roles list views no longer render their internal eyebrow/title/description/action band.
- [ ] Their top-level actions are supplied by Task 1's page header.
- [ ] Search, density controls, table rows, empty/error states, scrolling, row selection, and pagination behave exactly as before.
- [ ] User and role entity details still render their resource header/back button/nested tabs/actions.

**Verification:**
- [ ] `UsersSection.test.tsx` still covers search, row navigation, modal, empty/error state, and detail tabs.
- [ ] `RealmRolesSection.test.tsx` still covers search, row navigation, users-in-role, permissions truthfulness, empty/error state, and detail tabs.
- [ ] Add assertions that redundant list headings are absent while detail headings remain present.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/features/identity-access/components/UsersSection.tsx`
- `src/features/identity-access/components/UsersSection.test.tsx`
- `src/features/identity-access/components/RealmRolesSection.tsx`
- `src/features/identity-access/components/RealmRolesSection.test.tsx`

**Estimated scope:** Medium (4 files)

## Checkpoint: Reference layout

- [ ] Identity Access page header and action placement visually match Providers.
- [ ] Realm context strip is gone.
- [ ] Realm roles has no redundant title/description band.
- [ ] Users and Realm roles tables start directly inside the provider-style inner panel.
- [ ] Focused Tasks 1-3 tests pass together.
- [ ] Run `npm run typecheck`.
- [ ] Run ESLint only for changed TypeScript/TSX files with zero warnings.
- [ ] Review at the same desktop viewport used for the approved mockup before propagating the pattern.

## Task 4: Apply the list layout to remaining Manage catalogue sections

**Description:** Propagate the approved list pattern to the remaining Manage sections that currently render a top-level `IdentityResourceHeader`: Clients, Client scopes, Organizations, Groups, and Sessions. Preserve entity details and specialized group/session content.

**Acceptance criteria:**
- [ ] No listed Manage section renders a redundant top-level title/description band.
- [ ] Top-level Create/Sign-out actions appear only in the page header.
- [ ] Client, client-scope, and organization detail headers/back navigation/nested tabs remain unchanged functionally.
- [ ] Groups keeps its hierarchical layout and Sessions keeps its table/request behavior inside the shared provider-style panel.

**Verification:**
- [ ] Run focused tests for Clients, ClientScopes, Organizations, Groups, and Sessions components where present.
- [ ] Add or update only the assertions needed to cover the layout contract; do not rewrite unrelated behavior tests.
- [ ] Focused changed-file ESLint passes.

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `src/features/identity-access/components/ClientsSection.tsx`
- `src/features/identity-access/components/ClientScopesSection.tsx`
- `src/features/identity-access/components/OrganizationsSection.tsx`
- `src/features/identity-access/components/GroupsSection.tsx`
- `src/features/identity-access/components/SessionsSection.tsx`

**Estimated scope:** Medium (5 production files; tests updated only where existing coverage requires it)

## Task 5: Align top-level tabbed Manage/Configure sections without removing useful nested context

**Description:** Remove the redundant top-level resource header from Events, Authentication, and Realm settings while preserving their nested tab navigation. Their section-specific actions move to the page header; nested content remains unchanged.

**Acceptance criteria:**
- [ ] Events, Authentication, and Realm settings do not duplicate the active section name/description below the main navigation.
- [ ] Their nested tablists remain visible and functional at the top of the inner panel.
- [ ] Event settings, Create flow, and Save actions occupy the page header action area with the same enabled/disabled behavior as before.
- [ ] No tab IDs or URL semantics change.

**Verification:**
- [ ] Focused tests cover active nested tabs and action callbacks/disabled states.
- [ ] `IdentityAccessPage.test.tsx` confirms action rendering uses the active section/tab without breaking query parameters.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/features/identity-access/components/EventsSection.tsx`
- `src/features/identity-access/components/AuthenticationSection.tsx`
- `src/features/identity-access/components/RealmSettingsSection.tsx`
- relevant focused tests

**Estimated scope:** Medium (3 production files + focused tests)

## Task 6: Align remaining Configure catalogue/empty sections

**Description:** Apply the same top-level layout to Identity providers, User federation, and Permissions. Remove the redundant section header while retaining catalogue cards, tables, empty states, and entity detail views.

**Acceptance criteria:**
- [ ] Identity providers, User federation, and Permissions begin directly inside the provider-style inner panel.
- [ ] Add LDAP/Add Kerberos and other top-level actions are shown in the page header only.
- [ ] Identity-provider and user-federation detail pages preserve their internal resource header/back navigation/nested tabs.
- [ ] Existing empty-state copy and feature-gating text remain unchanged.

**Verification:**
- [ ] Focused tests for the three sections pass.
- [ ] Detail navigation remains URL-backed and no top-level duplicate section header is rendered.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/features/identity-access/components/IdentityProvidersSection.tsx`
- `src/features/identity-access/components/UserFederationSection.tsx`
- `src/features/identity-access/components/PermissionsSection.tsx`
- relevant focused tests

**Estimated scope:** Medium (3 production files + focused tests)

## Checkpoint: Complete Identity Access visual propagation

- [ ] Every top-level Identity Access section follows the same page-shell hierarchy.
- [ ] Manage/Configure and section tabs remain stable when switching sections.
- [ ] Only entity/detail screens retain resource-specific headers.
- [ ] All top-level section actions occupy the page-header action position.
- [ ] Existing tables use shared toolbar/density/pagination without regression.
- [ ] `npm run typecheck` passes.
- [ ] Changed-file ESLint passes with zero warnings.

## Task 7: Responsive and browser verification against Providers

**Description:** Perform side-by-side browser verification of Providers and Identity Access, focusing on the exact layout approved in the HTML template, full-height behavior, pagination visibility, and absence of clipped content.

**Acceptance criteria:**
- [ ] At approximately 1584×772, the Identity Access header/action alignment, outer card, inner panel, spacing, border radius, shadows, table toolbar, and pagination visually match the Providers page system.
- [ ] At 1366×768, the table and pagination remain fully visible/scrollable; no footer is clipped below the viewport.
- [ ] At 1024px width, navigation can scroll where needed and no page-level horizontal overflow is introduced.
- [ ] Switching Manage/Configure, switching sections, opening a user/role/client detail, and returning to the list does not produce a layout jump or broken scroll container.

**Verification:**
- [ ] Run the local app and inspect Providers and Identity Access at 1584×772, 1366×768, and 1024×768.
- [ ] Verify browser console has no new errors.
- [ ] Run the complete focused Identity Access test set, not the repository-wide suite.
- [ ] Run `npm run typecheck`.
- [ ] Run changed-file ESLint with zero warnings.
- [ ] Run `git diff --check`, inspect `git diff --stat`, and confirm only in-scope production/tests/docs are staged.
- [ ] Because this is a cross-cutting UI change, run `npm run build` once at the final checkpoint.

**Dependencies:** Tasks 1-6

**Files likely touched:** No new production files beyond focused fixes found during verification

**Estimated scope:** Small (verification/final cleanup)

## Final Checkpoint

- [ ] The implementation matches `.superpowers/brainstorm/identity-access-provider-style-v1.html`.
- [ ] `REALM / ABCO / Keycloak realm administration` is removed.
- [ ] Redundant top-level section title/description bands are removed.
- [ ] Section actions align with Providers page actions.
- [ ] Manage/Configure and section tabs remain unchanged functionally.
- [ ] Entity detail headers/back buttons/nested tabs/actions are preserved.
- [ ] Tables, search, density, pagination, empty/error states, and row navigation remain functional.
- [ ] No horizontal overflow or clipped pagination at target desktop viewports.
- [ ] Focused tests, typecheck, changed-file lint, browser checks, build, and diff checks pass.
- [ ] Only in-scope changes are committed.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Moving actions breaks local modal/callback state | High | Lift only the Add-user open state; reuse existing page navigation callback for Events; keep detail actions local |
| Removing shared header also removes entity context | High | Remove headers only from top-level list/section branches; preserve `IdentityResourceDetailPage` and not-found headers |
| Nested Configure tabs lose hierarchy | Medium | Keep nested `Tabs`; remove only the redundant title/description row around them |
| Flex/overflow changes clip pagination | High | Shared inner panel uses explicit `min-h-0`, flex, and overflow rules; verify 1584/1366/1024 viewports |
| Visual drift from Providers | Medium | Reuse existing PageHeader/DataTable/shared tokens and compare side-by-side in browser |
| Scope expands into Keycloak functionality | Low | Do not change hooks, API calls, schemas, mutations, or disabled integration gates |
| Existing unrelated `tasks/plan.md` work is overwritten | High | Store this plan in dedicated Identity Access plan/todo files instead of replacing existing provider-filter plan |

## Open Questions

None. The approved HTML mockup and the latest request establish the target visual hierarchy. Implementation should remain design/layout-only.
