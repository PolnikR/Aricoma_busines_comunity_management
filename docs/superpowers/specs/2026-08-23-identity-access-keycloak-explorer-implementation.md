# Identity & Access Keycloak Explorer — Implemented Specification

## Purpose

Identity & Access was redesigned from a five-tab mock administration page into a Keycloak-style explorer embedded inside the existing ABCO Platform Administration shell.

The implementation is frontend-only. It keeps the existing Identity & Access mock models and data sources and does not introduce Keycloak authentication, Keycloak Admin REST API integration, backend endpoints, OpenAPI contracts, or fabricated Keycloak data.

## Final page structure

The existing ABCO `PageHeader`, application sidebar, header, spacing, theme tokens, and responsive shell remain the visual foundation.

Inside the Identity & Access page, a scoped Keycloak explorer contains:

### Manage

- Organizations
- Clients
- Client scopes
- Realm roles
- Users
- Groups
- Sessions
- Events

### Configure

- Realm settings
- Authentication
- Permissions
- Identity providers
- User federation
- Workflows

The inner explorer is feature-specific and does not replace or duplicate the global ABCO application sidebar.

## Section routing

Section selection is URL-backed through the `section` query parameter.

Example:

```text
/platform-administration/identity-access?section=realm-roles
```

Behavior:

- missing `section` defaults to `users`;
- invalid values default to `users`;
- section IDs are typed stable kebab-case values;
- changing the Identity & Access section preserves unrelated query parameters;
- browser back/forward restores previously selected sections.

Implemented by:

- `src/features/identity-access/models/identityAccessSections.ts`
- `src/features/identity-access/hooks/useIdentityAccessSection.ts`
- `src/features/identity-access/components/IdentityAccessNavigation.tsx`

## Data-backed sections

Five existing mock-backed administration areas remain functional and were migrated to the common ABCO table/detail pattern.

### Users

`UsersSection.tsx` replaces the previous `UsersTab.tsx`.

It preserves:

- user name and email;
- organization lookup;
- role-name lookup;
- active/inactive/locked status;
- last login;
- selected-user details.

The section now uses the shared table/search/pagination/status/detail components. The `Add user` action remains disabled because a real Keycloak create workflow is not implemented.

### Realm roles

`RealmRolesSection.tsx` replaces `RolesTab.tsx`.

It preserves:

- current role name and ID;
- description;
- permission count and names;
- organization ID;
- calculated member count from current users.

No composite-role, client-role, scope, or other unsupported Keycloak metadata was invented.

### Organizations

`OrganizationsSection.tsx` replaces `OrganizationsTab.tsx`.

It preserves:

- organization name and description;
- active/inactive status;
- member count;
- role count;
- member and role names in detail view;
- created timestamp.

The `Add organization` action remains disabled until a real integration exists.

### Sessions

`SessionsSection.tsx` replaces `SessionsTab.tsx`.

It preserves the existing time-range behavior:

- All sessions;
- Last 24 hours;
- Last 7 days.

It also preserves user/organization lookup, login time, last activity, IP address, user agent, expiry, and active/expired/terminated state.

### Permissions

`PermissionsSection.tsx` replaces `PermissionsTab.tsx` and remains explicitly read-only.

It preserves:

- permission ID/name;
- category;
- description;
- number and names of roles using the permission;
- created timestamp.

The existing permission mock model is not treated as a Keycloak Fine-Grained Admin Permissions contract.

## Unsupported Keycloak sections

The following navigation areas have no current mock/API data source:

- Clients
- Client scopes
- Groups
- Events
- Realm settings
- Authentication
- Identity providers
- User federation
- Workflows

They render `KeycloakPlaceholderSection`, which composes the shared `EmptyState` and states that Keycloak integration for the administration area is not connected yet.

The placeholders deliberately contain no fabricated records, counts, health states, or enabled actions.

## Shared ABCO UI primitives

The redesign removes feature-level copies of common UI behavior and composes the existing shared system instead.

The data-backed sections use the applicable combination of:

- `PageHeader`
- `Button`
- `Badge`
- `DataTable`
- `DataTableToolbar`
- `DataTablePagination`
- `DataTableSkeleton`
- `DataTableRequestState`
- `DetailDrawer`
- `DetailRow`
- `EmptyState`
- `useTableState`

Production styling is Tailwind/theme-token based. No Identity & Access production CSS file was added.

## Request-state changes to mock hooks

The existing mock hooks remain the data source, but their return contract was extended with a local `refetch` function so migrated sections can use the shared retryable request-state UI.

Updated hooks:

- `useUsers.ts`
- `useRoles.ts`
- `useOrganizations.ts`
- `useSessions.ts`
- `usePermissions.ts`

`refetch` increments a local request version and re-runs the existing mock loading effect. It does not add remote API behavior.

## Files created

Production/components:

- `src/features/identity-access/components/IdentityAccessNavigation.tsx`
- `src/features/identity-access/components/KeycloakPlaceholderSection.tsx`
- `src/features/identity-access/components/RealmRolesSection.tsx`
- `src/features/identity-access/components/UsersSection.tsx`
- `src/features/identity-access/components/OrganizationsSection.tsx`
- `src/features/identity-access/components/SessionsSection.tsx`
- `src/features/identity-access/components/PermissionsSection.tsx`
- `src/features/identity-access/hooks/useIdentityAccessSection.ts`
- `src/features/identity-access/models/identityAccessSections.ts`

Tests:

- `src/features/identity-access/hooks/useIdentityAccessSection.test.tsx`
- `src/features/identity-access/pages/IdentityAccessPage.test.tsx`
- `src/features/identity-access/components/RealmRolesSection.test.tsx`
- `src/features/identity-access/components/UsersSection.test.tsx`
- `src/features/identity-access/components/OrganizationsSection.test.tsx`
- `src/features/identity-access/components/SessionsSection.test.tsx`
- `src/features/identity-access/components/PermissionsSection.test.tsx`

## Files modified

- `src/features/identity-access/pages/IdentityAccessPage.tsx`
- `src/features/identity-access/hooks/useUsers.ts`
- `src/features/identity-access/hooks/useRoles.ts`
- `src/features/identity-access/hooks/useOrganizations.ts`
- `src/features/identity-access/hooks/useSessions.ts`
- `src/features/identity-access/hooks/usePermissions.ts`

`IdentityAccessPage.tsx` now composes the explorer navigation and the selected section instead of rendering the old horizontal tab registry.

## Files removed

Obsolete tab-era production components:

- `src/features/identity-access/components/UsersTab.tsx`
- `src/features/identity-access/components/RolesTab.tsx`
- `src/features/identity-access/components/OrganizationsTab.tsx`
- `src/features/identity-access/components/SessionsTab.tsx`
- `src/features/identity-access/components/PermissionsTab.tsx`

Temporary visual templates were deleted after implementation and browser verification:

- `prototypes/identity-access/identity-access-keycloak.html`
- `prototypes/identity-access/identity-access-keycloak.css`

Temporary execution documents were also removed after completion:

- `tasks/identity-access-keycloak-redesign-plan.md`
- `tasks/identity-access-keycloak-redesign-todo.md`

## Verification coverage

Focused tests cover:

- exact Manage/Configure section registry;
- default and invalid URL selection;
- preservation of unrelated query parameters;
- browser history section selection;
- explorer navigation and active state;
- every registered data-backed and placeholder section;
- Users search, status, detail, empty, and retryable error states;
- Realm Roles search, detail, empty, and retryable error states;
- Organizations search, calculated member/role details, empty, and retryable error states;
- Sessions 24h/7d/all filtering, status, detail, empty, and retryable error states;
- Permissions search, category, role usage detail, empty, and retryable error states.

Final verification executed successfully:

```text
npm exec vitest run src/features/identity-access
npm exec eslint src/features/identity-access --max-warnings=0
npm run typecheck
git diff --check
npm run test
```

The full `npm run test` suite passed after the focused Identity & Access checks.

Browser verification was also performed in Chromium at:

- 1600 × 950
- 1280 × 850

The explorer remained contained inside the ABCO shell and the browser console contained no application errors.

## Implementation commits

The redesign was implemented as isolated verified tasks:

- `b58e06e` — `feat: add identity access section routing`
- `4e2de90` — `feat: add keycloak explorer identity shell`
- `749ae4e` — `refactor: migrate realm roles to shared table`
- `b2fc7ca` — `refactor: migrate identity users to shared table`
- `9d182a4` — `refactor: migrate identity organizations to shared table`
- `611306b` — `refactor: migrate sessions and permissions`
- `25dbc8a` — `feat: add keycloak section placeholders`

Task 8 was verification/cleanup only and produced no additional tracked production-code diff.

## Current integration boundary

This implementation prepares the frontend information architecture and visual contract for a later Keycloak integration. A future integration task should replace the mock hooks/models with deliberately designed Keycloak/backend contracts while keeping the current section navigation and shared UI composition where appropriate.
