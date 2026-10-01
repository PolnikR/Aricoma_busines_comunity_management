# Todo: Identity & Access Application roles (read-only)

Plan: `tasks/identity-application-roles-plan.md`. Base path: `src/features/platform-administration/identity-access/` (`IA/`).
Every task ends with focused verification, `git diff --check` and an atomic commit with explicit paths.

**Safety rules for every task** (details: plan, "Worktree safety and staging"):
- Unrelated uncommitted work must be preserved exactly: `package-lock.json` and the Manage/Configure navigation removal in
  `IA/components/IdentityAccessNavigation.tsx`, `IA/pages/IdentityAccessPage.tsx`, `IA/components/IdentityAccessNavigation.test.tsx`,
  `IA/components/IdentityAccessLocalization.test.tsx`, `IA/pages/IdentityAccessPage.test.tsx` and `src/locales/{en,cs,sk}.json`.
- Before editing any of these: re-read the file and save `git diff -- <file>` as a baseline in the scratchpad. Use targeted edits only.
  No whole-file rewrite, no `git checkout`/`restore`/`stash`, and no reintroducing `setGroupId`/`onGroupChange`/the group switcher/`identity.navigation.groups.ariaLabel`.
- Stage by explicit path only. Never `git add .`, `git add -A` or `git commit -a`. Never stage `package-lock.json` or `IdentityAccessNavigation.tsx`.
- In overlapping files that still hold the unrelated change, stage only Application roles hunks (patch + `git apply --cached`).
- Before commit: `git diff --cached` must contain only Application roles hunks, and the unrelated `git diff` hunks must match the baseline.
  If the hunks can't be separated cleanly, stop and report.

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
- [ ] The unrelated navigation hunks in the locales and both navigation tests are unchanged, compared with the baseline, and not staged

**Verification:**
- [ ] `npm exec vitest run IA/components/IdentityAccessNavigation.test.tsx IA/components/IdentityAccessLocalization.test.tsx IA/components/RealmRolesSection.test.tsx`
- [ ] JSON parse of the 3 locale files; `git diff --check`
- [ ] `git diff --cached` reviewed: only Application roles hunks

**Dependencies:** None
**Files:** `src/locales/{en,cs,sk}.json` ⚠ shared, `IA/components/IdentityAccessNavigation.test.tsx` ⚠ shared, `IA/components/IdentityAccessLocalization.test.tsx` ⚠ shared, `IA/components/RealmRolesSection.test.tsx` (label strings only)
**Scope:** S

## Checkpoint A
- [ ] Tasks 1–2 green and committed

## Task 3: API-only table, read-only role DetailDrawer, no Create role
**Description:** Rewrite `RealmRolesSection` on the `UsersSection` pattern. Remove `useUsers`, `User`, `userColumns`, `usersInRole`,
`IdentityResourceDetailPage`/`IdentityResourceHeader`/`IdentitySettingsSection`, `Field`/`Input`, `ROLE_TABS`, the Actions
button and all props. Columns: Role (name + description), Permissions (count), Users (`userCount`, `—` when `clientId == null`).
Search: name, description, permissions, users. Row click sets local `selectedId` and passes it as `selectedRowKey`.
`DetailDrawer` (read-only, no footer): title name, subtitle description, clientId header badge. Rows: Role name, Description (`—`),
Client ID (`—`) and Users count (`—` when clientId null). Then a Permissions badge list (`—` when empty) and a Users-in-role badge list
(`—` when clientId null, localized empty value when known-empty). In `IdentityAccessPage.tsx`, apply only two minimal
edits on top of the existing uncommitted content: render `<RealmRolesSection />` and remove the `realm-roles` case
(disabled `Create role`) from `getSectionAction`. Keep everything else in that file as is, including the unrelated removal
of `setGroupId`/`onGroupChange`. Add the needed EN/CS/SK keys (drawer eyebrow/ariaLabel/close, fields clientId/userCount/users, users empty value; column header "Role").

**Acceptance criteria:**
- [ ] Table shows only API data; Permissions column is a count; Users column uses `userCount` / `—`; search, density, pagination, loading, error + Retry, empty and filtered-empty all work
- [ ] Row click opens the drawer and highlights the row; drawer shows all 6 fields with the null/empty rules; no buttons other than close
- [ ] No full-page workspace, no role tabs, no Actions button; `useUsers` not imported or called; section takes no props
- [ ] No Add/Create/Edit/Delete/Assign/Remove action anywhere in Application roles, including the page header (`Create role` gone); other sections' header actions unchanged
- [ ] The unrelated hunks in `IdentityAccessPage.tsx`, `IdentityAccessPage.test.tsx` and the locales are unchanged (compared with the baseline) and not staged

**Verification:**
- [ ] Rewritten `IA/components/RealmRolesSection.test.tsx` covers: API rows + description; permission count (full list absent); `userCount`; clientId null → `—`; search; loading; error + Retry; empty; drawer open + `aria-selected`/selected row; all drawer fields; permission and user badges; clientId null → `—` (Client ID, count, users); known-empty users value; no Edit/Delete/Actions buttons; no tablist; `useUsers` mock never called
- [ ] `IA/pages/IdentityAccessPage.test.tsx`: assert no `Create role` button for `?section=realm-roles` (a targeted addition next to the existing `Add user` assertion pattern)
- [ ] `npm exec vitest run IA/components/RealmRolesSection.test.tsx IA/pages/IdentityAccessPage.test.tsx IA/components/IdentityAccessLocalization.test.tsx`
- [ ] `npm run typecheck`; eslint on changed files
- [ ] `git diff --cached` reviewed: only Application roles hunks; `IdentityAccessNavigation.tsx` / `package-lock.json` not staged
- [ ] Manual: if a dev server and a logged-in API are available, open Application roles, click a role and check a 50+ permission list wraps readably

**Dependencies:** Task 1, Task 2
**Files:** `IA/components/RealmRolesSection.tsx`, `IA/components/RealmRolesSection.test.tsx`, `IA/pages/IdentityAccessPage.tsx` ⚠ shared, `IA/pages/IdentityAccessPage.test.tsx` ⚠ shared, `src/locales/{en,cs,sk}.json` ⚠ shared
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
- [ ] `git diff --cached` reviewed: only removed `identity.roles.*` lines; the unrelated `identity.navigation.groups.ariaLabel` removal is unchanged and not staged

**Dependencies:** Task 3
**Files:** `src/locales/{en,cs,sk}.json` ⚠ shared
**Scope:** XS

## Checkpoint C
- [ ] All acceptance criteria met; full suite and production build NOT run (focused scope); limitations recorded here
