# Implementation Plan: Identity & Access Users on GET /get_users (read-only)

Tasks tracked in `tasks/identity-users-get-users-todo.md`.

## Overview
Replace the preview-gateway Users section in Platform Administration > Identity & Access with a read-only
table backed by the generated `useGetUsers()` hook. Row click opens a read-only `DetailDrawer` (Platform
Providers pattern) instead of the full-page editable user detail. All user create/edit UI (Add user button,
`AddUserModal`, role/required-action toggles) is removed — user management happens only in Keycloak.

## Current state (inspected)
- `components/UsersSection.tsx` — list via `useIdentityAdminPreview()`; URL `entityId`/`tabId` render a
  full-page editable detail (`UserDetails`, `UserCredentials`, `UserRoleMappings`, `RoleList`,
  `UserSessions`, `LoadingUserDetails`); `AddUserModal` creates users through `gateway.createUser`.
- `pages/IdentityAccessPage.tsx` — owns `isAddUserOpen` state and renders the `Add user` header action.
- `useIdentityAdminPreview` / `mockIdentityAdminGateway` are also used by Authentication, Clients and
  Realm Settings sections → they stay.
- Generated (uncommitted in worktree): `useGetUsers()` in `src/generated/query/identity-access/identity-access.gen.ts`,
  `UsersResponse` / `UserRecord` zod schemas. `UserRecord`:
  `id, user, username: string; email, createdAt, activeSessionStart: string|null|undefined;
  emailVerified: boolean|null|undefined; roles: string[]; status: 'Active'|'Disabled'`.
- `X-User` header is set by `src/shared/api/apiClient.ts`, so the hook needs no request options.
- Pattern references: `PlatformProvidersTable.tsx` (DataTableRequestState + DetailDrawer + DetailRow),
  `RealmRolesSection.tsx` (generated identity hook usage + test mocking style).
- Locales are flat-key JSON: `src/locales/{en,cs,sk}.json`, keys `identity.users.*`.

## Architecture Decisions
- **Drawer selection is local state** (`useState<string | null>`), exactly like `PlatformProvidersTable`.
  `UsersSection` no longer reads URL `entityId`/`tabId`; its props become empty. The `users` entry in
  `identityAccessSections.ts` (entity/tabs metadata) is left untouched to avoid changing shared URL
  handling — a stale `?entity=` simply has no effect on the Users section.
- **Request state via `DataTableRequestState`** (error + retry with `isRetrying = isFetching`), error
  description via `extractBackendErrorDetail`, matching Providers/Realm Roles. Replaces the bespoke
  `EmptyState` error branch.
- **Search fields**: `user`, `username`, `email`, `roles` (`useTableState` already handles array fields,
  as Realm Roles does with `permissions`).
- **Status badge**: `Active` → `success`, `Disabled` → `light`; labels localized
  (`identity.users.status.active` / new `identity.users.status.disabled`).
- **Timestamps**: small local `formatUserTimestamp(value, language)` in the Users feature, locale-aware via
  `Intl.DateTimeFormat`. Locale follows the existing app convention (`RecoveryActionsPageShell`):
  `useTranslation().language` → `sk` ⇒ `sk-SK`, `cs` ⇒ `cs-CZ`, otherwise `en-GB`; options
  `{ dateStyle: 'medium', timeStyle: 'short' }`. **No `timeZone` option** — the browser's timezone is used;
  `Europe/Bratislava` is not hard-coded. null/undefined/invalid → `—`. Applies to `createdAt` and
  `activeSessionStart`. No Last login value is invented or derived. No changes to audit code.
- **Empty-ish values**: one helper `valueOrDash` for null/undefined/empty string → `—`; booleans for
  `emailVerified` rendered as localized Yes/No (`—` when null).
- **Roles**: table cell = comma-joined (`—` when empty); drawer = one small `Badge` per role (clear list).
- **Shared gateway contract is kept (decided)**: `createUser` / `setUserRole` / `setUserRequiredAction` / `users`
  stay in `identityAdminGateway.ts` and `mockIdentityAdminGateway.ts`, and their tests are unchanged, because
  other Identity & Access sections and tests may still use them. Only their **usage from the Users UI** is removed.
  The Users UI becomes strictly read-only: no Add user, no Edit, no Delete, no role mutation, no required-action mutation.
- **Generated files are not edited.** They are committed as-is in Task 0 (prerequisite).

## Task List

### Phase 0: Prerequisite
- [ ] Task 0: Commit the existing generated GET /get_users client (separate commit, no hand edits)

### Phase 1: Remove management UI
- [ ] Task 1: Remove the Add-user flow (header button, page state, `AddUserModal`, create tests)

### Checkpoint A
- [ ] Focused tests green; Users still renders from preview data; no `Add user` anywhere

### Phase 2: Real data
- [ ] Task 2: Users table on `useGetUsers()`, remove full-page editable detail
- [ ] Task 3: Read-only user `DetailDrawer`

### Checkpoint B
- [ ] Focused tests + typecheck green; table + drawer verified manually against API

### Phase 3: Cleanup
- [ ] Task 4: Remove orphaned Users locale keys and preview-specific copy (EN/CS/SK)

### Checkpoint C
- [ ] All acceptance criteria met; lint on changed files clean; ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing `entityId` path breaks bookmarked `?section=users&entity=…` links | Low | Section just shows the table; documented decision |
| `mockUseTranslation` falls back to keys if a new EN key is missing → brittle tests | Med | Add EN/CS/SK keys in the same task that introduces them |
| Orval `select` typing (Input vs Output) for `UsersResponse` | Low | No `select` needed; read `data?.users ?? []` directly |
| Deleting locale keys still referenced elsewhere | Med | `grep` every removed key across `src/` before deleting (Task 4) |
| Uncommitted generated files + unrelated `package-lock.json` change mixed into commits | Med | Stage files explicitly; `package-lock.json` is never staged by this plan |

## Out of scope (noted, not changed)
- `RealmRolesSection` still counts members via mock `useUsers()`.
- `createUser` / `setUserRole` / `setUserRequiredAction` in the shared `IdentityAdminGateway` contract / mock (kept by decision).
- `users` tab metadata in `models/identityAccessSections.ts`.

## Open Questions
None. Resolved: Task 0 proceeds as planned; timestamps are locale-aware with the browser timezone; shared gateway methods are kept.
