# Todo: Identity & Access Application roles (read-only)

Plan: `tasks/identity-application-roles-plan.md`. Base path: `src/features/platform-administration/identity-access/` (`IA/`).
Every task ends with focused verification, `git diff --check` and an atomic commit with explicit paths.
Never stage `package-lock.json`, `IA/components/UsersSection.tsx` or `IA/components/UsersSection.test.tsx`.

## Task 1: Mapper exposes users, userCount, clientId
**Description:** Extend `IdentityRoleRecord` and `mapRolesPermissions` with `users` (default `[]`), `userCount` (default `0`)
and `clientId` (default `null`). Keep synthetic `id = name` and `description ?? ''`.

**Acceptance criteria:**
- [ ] Mapped role = `{ id, name, description, permissions, users, userCount, clientId }`
- [ ] Missing `users`/`userCount`/`clientId` map to `[]` / `0` / `null`; `clientId: null` passes through
- [ ] `PermissionsSection` unchanged and still compiles

**Verification:**
- [ ] `npm exec vitest run IA/model/rolesPermissionsTypes.test.ts IA/model/rolesPermissionsWire.test.tsx IA/components/PermissionsSection.test.tsx`
- [ ] `npm run typecheck`; eslint on changed files

**Dependencies:** None
**Files:** `IA/model/rolesPermissionsTypes.ts`, `IA/model/rolesPermissionsTypes.test.ts` (+ `RealmRolesSection.test.tsx` fixture type, if typecheck requires it)
**Scope:** XS

## Task 2: Rename visible copy to "Application roles"
**Description:** Update `identity.navigation.sections.realm-roles` to EN "Application roles", CS "Aplikační role" and
SK "Aplikačné roly". Update role copy that still says "realm role" in values that stay in use (`identity.roles.rowAriaLabel`
→ "Open application role {{name}}", `identity.roles.empty.description`). Update navigation/localization test
expectations. Keys and ids stay unchanged.

**Acceptance criteria:**
- [ ] No visible "Realm role(s)/roly/role" copy remains for this section in EN/CS/SK
- [ ] Section id `realm-roles` and locale key names unchanged

**Verification:**
- [ ] `npm exec vitest run IA/components/IdentityAccessNavigation.test.tsx IA/components/IdentityAccessLocalization.test.tsx IA/components/RealmRolesSection.test.tsx`
- [ ] JSON parse of the 3 locale files; `git diff --check`

**Dependencies:** None
**Files:** `src/locales/{en,cs,sk}.json`, `IA/components/IdentityAccessNavigation.test.tsx`, `IA/components/IdentityAccessLocalization.test.tsx`, `IA/components/RealmRolesSection.test.tsx` (label strings only)
**Scope:** S

## Checkpoint A
- [ ] Tasks 1–2 green and committed

## Task 3: API-only table and read-only role DetailDrawer
**Description:** Rewrite `RealmRolesSection` on the `UsersSection` pattern. Remove `useUsers`, `User`, `userColumns`, `usersInRole`,
`IdentityResourceDetailPage`/`IdentityResourceHeader`/`IdentitySettingsSection`, `Field`/`Input`, `ROLE_TABS`, the Actions
button and all props. Columns: Role (name + description), Permissions (count), Users (`userCount`, `—` when `clientId == null`).
Search: name, description, permissions, users. Row click sets local `selectedId` and passes it as `selectedRowKey`.
`DetailDrawer` (read-only, no footer): title name, subtitle description, clientId header badge. Rows: Role name, Description (`—`),
Client ID (`—`) and Users count (`—` when clientId null). Then a Permissions badge list (`—` when empty) and a Users-in-role badge list
(`—` when clientId null, localized empty value when known-empty). `IdentityAccessPage` renders `<RealmRolesSection />`.
Add the needed EN/CS/SK keys (drawer eyebrow/ariaLabel/close, fields clientId/userCount/users, users empty value; column header "Role").

**Acceptance criteria:**
- [ ] Table shows only API data; Permissions column is a count; Users column uses `userCount` / `—`; search, density, pagination, loading, error + Retry, empty and filtered-empty all work
- [ ] Row click opens the drawer and highlights the row; drawer shows all 6 fields with the null/empty rules; no buttons other than close
- [ ] No full-page workspace, no role tabs, no Actions button; `useUsers` not imported or called; section takes no props

**Verification:**
- [ ] Rewritten `IA/components/RealmRolesSection.test.tsx` covers: API rows + description; permission count (full list absent); `userCount`; clientId null → `—`; search; loading; error + Retry; empty; drawer open + `aria-selected`/selected row; all drawer fields; permission and user badges; clientId null → `—` (Client ID, count, users); known-empty users value; no Edit/Delete/Actions buttons; no tablist; `useUsers` mock never called
- [ ] `npm exec vitest run IA/components/RealmRolesSection.test.tsx IA/pages/IdentityAccessPage.test.tsx IA/components/IdentityAccessLocalization.test.tsx`
- [ ] `npm run typecheck`; eslint on changed files
- [ ] Manual: if a dev server and a logged-in API are available, open Application roles, click a role and check a 50+ permission list wraps readably

**Dependencies:** Task 1, Task 2
**Files:** `IA/components/RealmRolesSection.tsx`, `IA/components/RealmRolesSection.test.tsx`, `IA/pages/IdentityAccessPage.tsx`, `src/locales/{en,cs,sk}.json`
**Scope:** M (locale edits are mechanical; split not useful because missing keys break tests)

## Checkpoint B
- [ ] Focused tests, typecheck and eslint green; committed; review with human

## Task 4: Remove orphaned role-workspace locale keys
**Description:** Delete `identity.roles.*` keys no longer referenced: `userColumns.*`, `tabs.*`, `notFound.*`, `details.*`, `fields.permissions` if replaced,
`usersInRole.ariaLabel/emptyTitle/emptyDescription` if replaced, `permissions.description`, `integration.description`, `detailDescription`, `actions`.
Do this in EN/CS/SK, after `grep`-confirming each key has no remaining references in `src/`.

**Acceptance criteria:**
- [ ] Each removed key has zero references in `src/`; all three locales have the same `identity.roles.*` key set

**Verification:**
- [ ] `grep -rn` per key; JSON parse; `npm exec vitest run IA/components/RealmRolesSection.test.tsx IA/components/IdentityAccessLocalization.test.tsx`; `git diff --check`

**Dependencies:** Task 3
**Files:** `src/locales/{en,cs,sk}.json`
**Scope:** XS

## Checkpoint C
- [ ] All acceptance criteria met; full suite and production build NOT run (focused scope); limitations recorded here
