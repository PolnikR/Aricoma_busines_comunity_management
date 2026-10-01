# Todo: Identity & Access Users on GET /get_users (read-only)

Plan: `tasks/identity-users-get-users-plan.md`. Base path below: `src/features/platform-administration/identity-access/` (`IA/`).

## Task 0: Commit generated GET /get_users client
**Description:** Commit the already-generated, unmodified client so feature commits stay atomic. No hand edits.

**Acceptance criteria:**
- [ ] Commit contains only `openapi/abco-api.json`, `src/generated/query/**` changes and the 3 new zod files
- [ ] `package-lock.json` is NOT staged

**Verification:**
- [ ] `git show --stat HEAD` lists only the files above
- [ ] `npx tsc --noEmit -p .` (or project typecheck script) passes

**Dependencies:** None (needs user approval — Open Question 1)
**Files:** `openapi/abco-api.json`, `src/generated/query/**`
**Scope:** XS

## Task 1: Remove the Add-user flow
**Description:** Delete the Users `Add user` header action, the page's `isAddUserOpen` state/props, `AddUserModal`
and its create-error effect/alert wiring in `UsersSection`. Users list still uses preview data at this point.

**Acceptance criteria:**
- [ ] No `Add user` button in the Identity & Access header for the Users section; other section actions unchanged
- [ ] `AddUserModal`, `EMPTY_USER_INPUT`, `isAddUserOpen`/`onSetAddUserOpen` removed from `UsersSection` and `IdentityAccessPage`
- [ ] Tests assert the `Add user` button is absent

**Verification:**
- [ ] `npm exec vitest run IA/components/UsersSection.test.tsx IA/pages/IdentityAccessPage.test.tsx`
- [ ] `npx eslint` on the changed files

**Dependencies:** None
**Files:** `IA/components/UsersSection.tsx`, `IA/components/UsersSection.test.tsx`, `IA/pages/IdentityAccessPage.tsx`, `IA/pages/IdentityAccessPage.test.tsx`
**Scope:** S

## Checkpoint A
- [ ] Focused tests green, committed

## Task 2: Users table on `useGetUsers()`; remove editable full-page detail
**Description:** Switch `UsersSection` to `useGetUsers()`. Columns: User (`user` + `email` secondary), Username,
Roles (joined / `—`), Status (Badge), Active session start (formatted / `—`). Use `DataTableRequestState` for
error+retry, keep skeleton loading, empty/no-match states, search, density, pagination. Remove the
`entityId`/`tabId` detail path (`UserDetails`, `UserCredentials`, `UserRoleMappings`, `RoleList`,
`UserSessions`, `LoadingUserDetails`) and the `useIdentityAdminPreview`/`useSessions` imports; `UsersSection`
takes no props. Add EN/CS/SK keys: `identity.users.columns.activeSessionStart`, `identity.users.status.disabled`.

**Acceptance criteria:**
- [ ] Rows come from `useGetUsers()`; no `useIdentityAdminPreview` import in `UsersSection`
- [ ] Roles/status/`activeSessionStart` (value and `null` → `—`) render as specified; no `Last login` column
- [ ] Loading skeleton, error + Retry (calls `refetch`), empty and search-no-match states work

**Verification:**
- [ ] Rewritten `UsersSection.test.tsx` (mock `@/generated/query/identity-access/identity-access.gen` like `RealmRolesSection.test.tsx`): renders API users, search filters, roles render, session start renders, null → `—`, loading/error/retry/empty
- [ ] `npm exec vitest run IA/components/UsersSection.test.tsx IA/pages/IdentityAccessPage.test.tsx`
- [ ] Typecheck passes; `npx eslint` on changed files
- [ ] Manual: Users tab against running API shows real users

**Dependencies:** Task 0, Task 1
**Files:** `IA/components/UsersSection.tsx`, `IA/components/UsersSection.test.tsx`, `IA/pages/IdentityAccessPage.tsx`, `src/locales/{en,cs,sk}.json`
**Scope:** M

## Task 3: Read-only user DetailDrawer
**Description:** Row click sets local `selectedId` and opens `DetailDrawer` (resizable, eyebrow, title = `user`,
subtitle = `username`, status Badge in `headerExtra`, `selectedRowKey` highlight). Body `<dl>` of `DetailRow`s:
ID, User, Username, Email, Email verified, Created at, Roles (badges), Status (Badge), Active session start.
No footer. Add EN/CS/SK keys for eyebrow/aria/close labels and field labels (`identity.users.drawer.*`,
`identity.users.fields.*`, Yes/No).

**Acceptance criteria:**
- [ ] Clicking a row opens the drawer with all 9 fields; null/undefined → `—`; dates formatted
- [ ] No navigation (`onEntityChange` gone); no Edit/Delete or any footer buttons; close/Escape work
- [ ] All new labels exist in EN/CS/SK

**Verification:**
- [ ] Tests: row click opens dialog/drawer, all fields present, null fields → `—`, no `Edit`/`Delete` buttons
- [ ] `npm exec vitest run IA/components/UsersSection.test.tsx`
- [ ] Manual: drawer layout matches Platform Providers drawer

**Dependencies:** Task 2
**Files:** `IA/components/UsersSection.tsx`, `IA/components/UsersSection.test.tsx`, `src/locales/{en,cs,sk}.json`
**Scope:** M

## Checkpoint B
- [ ] Focused tests + typecheck green; table + drawer checked manually; committed

## Task 4: Remove orphaned Users locale keys and preview copy
**Description:** Delete keys no longer referenced (`identity.actions.addUser`, `identity.users.add.*`,
`columns.lastLogin`, `tabs.*`, `notFound.*`, `mutationFailed`, `details.*`, `fields.firstName|lastName|enabledStatus`,
`credentials.*`, `roles.*`, `sessions.*`) in EN/CS/SK — each verified unused via grep first. Reword
`identity.users.loading` / `identity.users.empty.description`, which still mention the preview gateway.

**Acceptance criteria:**
- [ ] Every removed key has zero references in `src/`
- [ ] EN/CS/SK contain the same `identity.users.*` key set
- [ ] JSON files parse

**Verification:**
- [ ] `grep` per removed key returns nothing; node script compares key sets across the 3 files
- [ ] `npm exec vitest run IA/components/UsersSection.test.tsx IA/pages/IdentityAccessPage.test.tsx IA/components/IdentityAccessLocalization.test.tsx`

**Dependencies:** Task 3
**Files:** `src/locales/{en,cs,sk}.json`
**Scope:** S

## Checkpoint C
- [ ] All acceptance criteria met; lint on changed files clean; committed; ready for review
