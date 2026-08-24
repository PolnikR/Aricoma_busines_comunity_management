# Todo: Provider Notification Email and Identity Access RBAC

## Task 1: Refresh the generated API contract

**Description:** Run `npm run api:update`, inspect the semantic OpenAPI diff,
and commit the snapshot plus deterministic Orval output as the foundation for
both feature slices.

**Acceptance criteria:**
- [ ] The snapshot contains `GET /get_roles_permissions` and 42 paths.
- [ ] Generated clients expose `RoleRecord`, `RolesPermissionsResponse`, and
  `notificationEmail` on both provider contracts.
- [ ] The atomic commit contains no hand-edited or unrelated files.

**Verification:**
- [ ] `npm run api:check`
- [ ] `git diff --check`
- [ ] Inspect `git diff --stat` and `git status --short` before commit.

**Dependencies:** None

**Files likely touched:** `openapi/abco-api.json`, `src/generated/api/`

**Estimated scope:** Mechanical generated-file set; documented exception.

## Task 2: Add infrastructure provider email to the data boundary

**Description:** Carry optional `notificationEmail` through domain types, Zod
validation, GET mapping, and the POST payload.

**Acceptance criteria:**
- [ ] GET preserves a valid email or `null`.
- [ ] Submit sends a trimmed email or explicit `null` when cleared.
- [ ] Invalid non-empty input is rejected before a request.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/api/providersApi.test.ts src/features/providers-connectors/providers/model/providerTypes.test.ts`
- [ ] Focused ESLint on the three changed implementation files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/model/providerTypes.test.ts`
- `src/features/providers-connectors/providers/api/schemas/providersSchema.ts`
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Medium (5 files)

## Task 3: Add infrastructure provider email form state

**Description:** Add the input to create/edit form state, initialization,
dirty-state comparison, accessible validation, and update submission.

**Acceptance criteria:**
- [ ] Create and edit forms display and prefill an email input.
- [ ] Clearing submits `null`; invalid input prevents submit with an error.
- [ ] Changing only the email activates unsaved-change protection.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [ ] Focused ESLint on the form and modal files.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`
- `src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 4: Show infrastructure provider email in details

**Description:** Add the field to the provider detail drawer and provide labels
for all supported locales.

**Acceptance criteria:**
- [ ] The drawer displays the email returned by GET.
- [ ] Missing or `null` values render `—`.
- [ ] English, Slovak, and Czech locale files use the same key.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- [ ] Focused ESLint and JSON parsing for all three locale files.

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium (5 files)

## Task 5: Add orchestration provider email to the data boundary

**Description:** Carry optional `notificationEmail` through platform provider
types, validation, GET mapping, and submit payload.

**Acceptance criteria:**
- [ ] GET preserves a valid email or `null`.
- [ ] Submit sends a trimmed email or explicit `null` when cleared.
- [ ] Invalid non-empty input is rejected before a request.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`
- [ ] Focused ESLint on the three changed implementation files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`
- `src/features/platform-administration/platform-providers/api/schemas/platformProvidersSchema.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Estimated scope:** Medium (5 files)

## Task 6: Add orchestration provider email form state

**Description:** Add the input to platform provider create/edit form state,
initialization, dirty-state comparison, validation, and update submission.

**Acceptance criteria:**
- [ ] Create and edit forms display and prefill an email input.
- [ ] Clearing submits `null`; invalid input prevents submit with an error.
- [ ] Changing only the email activates unsaved-change protection.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- [ ] Focused ESLint on the form and modal files.

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 7: Show orchestration provider email in details

**Description:** Add the email to the platform provider detail drawer, reusing
the localized label introduced by Task 4.

**Acceptance criteria:**
- [ ] The drawer displays the backend value.
- [ ] Missing or `null` values render `—`.
- [ ] Existing row, detail, edit, and delete interactions remain unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- [ ] Focused ESLint on the table files.

**Dependencies:** Tasks 4 and 6

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Estimated scope:** Small (2 files)

## Checkpoint: Provider notification email

- [ ] Run Tasks 2–7 focused tests together.
- [ ] Verify create, GET, edit, clear, invalid, and missing-value behavior.
- [ ] Run `npm run typecheck` and focused provider ESLint.
- [ ] Commit infrastructure and orchestration slices separately.

## Task 8: Add the roles and permissions API boundary

**Description:** Call the generated endpoint, validate its response, map exact
backend fields into a narrow read-only model, and normalize request errors.

**Acceptance criteria:**
- [ ] The result exposes global permission strings and role name/permissions.
- [ ] No mock fallback or invented role metadata is added.
- [ ] HTTP and contract failures surface as stable errors.

**Verification:**
- [ ] `npm exec vitest run src/features/identity-access/api/identityAccessApi.test.ts`
- [ ] Focused ESLint on the new API, model, and key files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/identity-access/api/identityAccessApi.ts`
- `src/features/identity-access/api/identityAccessApi.test.ts`
- `src/features/identity-access/model/rolesPermissionsTypes.ts`
- `src/features/identity-access/api/rolesPermissionsQueryKeys.ts`

**Estimated scope:** Medium (4 files)

## Task 9: Cache roles and permissions with TanStack Query

**Description:** Add one shared query hook for Realm roles and Permissions,
using the standard application cache policy.

**Acceptance criteria:**
- [ ] Both consumers use one stable query key and cached response.
- [ ] The hook inherits standard stale, GC, retry, and refetch behavior.
- [ ] Retry succeeds after an endpoint error.

**Verification:**
- [ ] `npm exec vitest run src/features/identity-access/hooks/useRolesPermissions.test.tsx`
- [ ] Focused ESLint on the hook and test.

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/identity-access/hooks/useRolesPermissions.ts`
- `src/features/identity-access/hooks/useRolesPermissions.test.tsx`

**Estimated scope:** Small (2 files)

## Task 10: Render backend roles and role permissions

**Description:** Replace Realm roles mock consumption with the cached backend
response and restrict the view to real contract fields.

**Acceptance criteria:**
- [ ] The list renders searchable backend role names.
- [ ] Role detail renders that role's permissions.
- [ ] Mock users, counts, descriptions, organizations, and dates are absent.

**Verification:**
- [ ] `npm exec vitest run src/features/identity-access/components/RealmRolesSection.test.tsx`
- [ ] Focused ESLint on the component and test.

**Dependencies:** Task 9

**Files likely touched:**
- `src/features/identity-access/components/RealmRolesSection.tsx`
- `src/features/identity-access/components/RealmRolesSection.test.tsx`

**Estimated scope:** Small (2 files)

## Task 11: Render global permissions and expose both sections

**Description:** Replace the Permissions placeholder with backend data and make
Realm roles and Permissions visible in their existing navigation groups.

**Acceptance criteria:**
- [ ] Permissions handles loading, success, empty, error, and retry states.
- [ ] Manage shows Realm roles; Configure shows Permissions.
- [ ] Existing URL parsing selects either section correctly.

**Verification:**
- [ ] `npm exec vitest run src/features/identity-access/components/PermissionsSection.test.tsx src/features/identity-access/components/IdentityAccessNavigation.test.tsx src/features/identity-access/hooks/useIdentityAccessSection.test.tsx`
- [ ] Focused ESLint on the component and navigation model.

**Dependencies:** Task 9

**Files likely touched:**
- `src/features/identity-access/components/PermissionsSection.tsx`
- `src/features/identity-access/components/PermissionsSection.test.tsx`
- `src/features/identity-access/models/identityAccessSections.ts`
- `src/features/identity-access/components/IdentityAccessNavigation.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 12: Relocate Identity Access under Platform Administration

**Description:** Atomically move the complete feature tree beneath Platform
Administration and update app-level imports while preserving the public URL.

**Acceptance criteria:**
- [ ] No source remains under `src/features/identity-access`.
- [ ] `/platform-administration/identity-access` lazy-loads the new path.
- [ ] No stale absolute import references the old feature directory.

**Verification:**
- [ ] Run explicit app route tests and all tests under the relocated feature.
- [ ] Run focused ESLint on `AppRoutes.tsx` and the relocated feature.
- [ ] Use `rg` to prove that no stale old-path source import remains.

**Dependencies:** Tasks 10 and 11

**Files likely touched:** Complete feature rename plus `src/app/AppRoutes.tsx` and
related route tests.

**Estimated scope:** Mechanical large rename; documented atomic exception.

## Checkpoint: Identity Access

- [ ] Run Tasks 8–12 focused tests together from the final paths.
- [ ] Verify both UI sections share one fresh cached request.
- [ ] Verify the unchanged public route and browser navigation.
- [ ] Run `npm run typecheck` and focused Identity ESLint.
- [ ] Commit API/UI functionality before the rename-only commit.

## Task 13: Final focused verification and commit audit

**Description:** Prove both vertical slices together and ensure every task-owned
change is included in a scoped atomic commit.

**Acceptance criteria:**
- [ ] API, provider, Identity, route, type, and lint checks pass.
- [ ] Both provider kinds round-trip email and both Identity sections render.
- [ ] No task-owned changes remain uncommitted or mixed with unrelated files.

**Verification:**
- [ ] `npm run api:check`
- [ ] Run the combined explicit affected-test list, not the complete suite.
- [ ] `npm run typecheck`, changed-file ESLint, and `git diff --check`.

**Dependencies:** Tasks 3, 4, 6, 7, and 12

**Files likely touched:** None; verification and commit hygiene only.

**Estimated scope:** Small

## Final checkpoint

- [ ] Review focused command output and final Git log.
- [ ] Confirm the full suite and production build were not run unless required.
- [ ] Confirm the worktree contains no task-owned changes.
