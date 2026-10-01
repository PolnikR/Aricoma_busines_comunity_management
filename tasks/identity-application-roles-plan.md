# Implementation Plan: Identity & Access Application roles (read-only, GET /get_roles_permissions)

Tasks tracked in `tasks/identity-application-roles-todo.md`. Branch/worktree: `test`.

## Overview
Redesign Platform Administration > Identity & Access > "Realm roles" to match the new Users section: a compact
table backed only by `useGetRolesPermissions()`, a read-only `DetailDrawer` on row click, no full-page role
workspace/tabs and no mock `useUsers()` dependency. The visible name becomes "Application roles", because the
endpoint returns application RBAC roles synced as Keycloak client roles, not generic realm roles.

## Current state (inspected)
- `components/RealmRolesSection.tsx`: table columns Name (+ id), Permissions (full comma-joined list) and Users
  (counted on the frontend from mock `useUsers()`). The URL `entityId`/`tabId` render `IdentityResourceDetailPage` with 5 tabs
  (Details uses readonly `Field`/`Input`, Users in role uses `userColumns` over mock users) plus a disabled Actions button.
- `model/rolesPermissionsTypes.ts`: `IdentityRoleRecord { id, name, permissions, description? }` and synthetic `id = name`.
  It is shared with `PermissionsSection` (uses only `permissions`).
- Generated `RolesPermissionsResponse` (committed): role has `name`, `permissions`, `description?: string|null`,
  `users: string[]` (default `[]`), `userCount: int` (default `0`), `clientId?: string|null`. Input type marks
  `users`/`userCount` optional, so the mapper must default them.
- `pages/IdentityAccessPage.tsx:74` passes `entityId/tabId/onEntityChange/onTabChange` to `RealmRolesSection`.
  `IdentityAccessPage.test.tsx` mocks the section, so it isn't affected by props.
- `pages/IdentityAccessPage.tsx:35-36` (`getSectionAction`) renders a disabled top-level `Create role` header action
  for `realm-roles`.
- The visible label comes from `identity.navigation.sections.realm-roles` (EN "Realm roles", SK "Realm roly", CS "Realm role").
  It is asserted in `IdentityAccessNavigation.test.tsx` and `IdentityAccessLocalization.test.tsx`.
- Reference pattern: `UsersSection.tsx` (local `selectedId`, `selectedRowKey`, `DetailDrawer` + `DetailRow`, `Badge`
  lists, `DataTableRequestState` with `extractBackendErrorDetail` and `isRetrying: isFetching`).
- The Manage/Configure group switcher removal is committed (`ba4e0f87`) and is the base for this plan.

## Architecture Decisions
- **Strictly read-only (decided)**: the final Application roles UI has no Add/Create/Edit/Delete/Assign/Remove actions.
  The disabled top-level `Create role` header action is removed from `getSectionAction` in `IdentityAccessPage.tsx`,
  matching the Users section, where Add user was removed. Other sections' header actions are unchanged.
- **Internal ids unchanged**: section id `realm-roles`, locale key `identity.navigation.sections.realm-roles`,
  component name `RealmRolesSection`, endpoint and generated types all keep their names. Only the visible copy changes.
  The `identityAccessSections.ts` static label isn't rendered, so it is left unchanged.
- **Selection is local state** (`useState<string | null>` keyed by role id = name), exactly like Users.
  `RealmRolesSection` takes no props. The `realm-roles` entry in `identityAccessSections.ts` (entity/tabs metadata)
  is left as it is, matching the Users decision, so a stale `?entity=` has no effect.
- **"Unknown membership" rule in one place**: `clientId == null` means the Keycloak lookup failed. The Users column, drawer
  Users count and Users-in-role list all show `—` in that case. A small local helper in the section expresses this.
- **Mapper**: `IdentityRoleRecord` gains `users: string[]`, `userCount: number`, `clientId: string | null`.
  `description` stays as it is. Defaults `users ?? []`, `userCount ?? 0`, `clientId ?? null`.
- **Table**: Role (name + description secondary), Permissions (`String(permissions.length)`), Users (right-aligned
  `userCount` or `—`). Search fields: `name`, `description`, `permissions`, `users`. Request state is switched to the
  Users variant (`extractBackendErrorDetail`, `isRetrying: isFetching`).
- **Drawer**: eyebrow "Application role", title `name`, subtitle `description`, `headerExtra` = `clientId` badge when present.
  Body: `DetailRow`s for Role name, Description, Client ID and Users count. Permissions and Users in role are rendered as
  wrapping `Badge` lists. Long lists (e.g. 54 permissions) get a full-width labelled block below the rows rather than
  a right-aligned `DetailRow` cell. Verify the available `DetailDrawer`/`DetailRow` primitives first and use the simplest
  readable option. No footer and no buttons.
- **Generated files are not edited.**

## Staging (required for every task)
- Stage by explicit path. Never `git add .`, `git add -A` or `git commit -a`. Never stage `package-lock.json`.
- Run `git status --short` before each task. Other sessions commit on this branch. If a file the task must edit already
  has uncommitted changes that aren't from this plan, don't revert, overwrite or stage them. Stop and ask before editing that file.
- Before each commit, review `git diff --cached`: it must contain only this task's changes.

## Task List

### Phase 1: Foundation
- [ ] Task 1: Mapper exposes `users`, `userCount`, `clientId`
- [ ] Task 2: Rename visible copy to "Application roles" (EN/CS/SK + navigation tests)

### Checkpoint A
- [ ] Mapper + localization/navigation tests green, typecheck green

### Phase 2: Core
- [ ] Task 3: API-only table and read-only role DetailDrawer replace the full-page workspace; remove top-level `Create role`

### Checkpoint B
- [ ] Focused section/page tests, typecheck and eslint green; review with human

### Phase 3: Cleanup
- [ ] Task 4: Remove orphaned role-workspace locale keys (EN/CS/SK)

### Checkpoint C
- [ ] All acceptance criteria met; `git diff --check` clean; every task committed

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Orval `select` Input typing: `users`/`userCount` optional | Low | Default in mapper; typecheck |
| `mockUseTranslation` falls back to keys if an EN key is missing, which makes tests brittle | Med | Add EN/CS/SK keys in the same task that introduces them |
| 54+ permission badges overflow the drawer | Low | Full-width wrapping block; drawer is `resizable` |
| Removing locale keys still referenced elsewhere | Med | `grep` each key across `src/` before deleting (Task 4) |
| Bookmarked `?section=realm-roles&entity=…` links | Low | Section just shows the table; documented |
| Staging unrelated worktree changes | Med | Explicit-path staging only; never `package-lock.json`; `git status` before each task; stop and ask if a target file holds someone else's uncommitted changes; review `git diff --cached` before each commit |

## Open Questions
- Confirm translations: CS "Aplikační role", SK "Aplikačné roly" (default if unanswered: use these).

## Out of scope
- Other Identity & Access sections and their header actions, `PermissionsSection` UI, `useUsers`/mock gateway, internal ids/routes,
  generated client, backend.
