# Implementation Plan: Provider Notification Email and Identity Access RBAC

## Overview

Implement two API-backed vertical slices on top of the refreshed OpenAPI
contract. Infrastructure and orchestration providers will round-trip an
optional notification email through GET, edit/create form state, update
requests, and detail drawers. Identity Access will move beneath the Platform
Administration feature boundary and will display cached backend roles and
permissions while preserving its existing public URL.

The current working tree does not contain the earlier generated API diff, so
implementation starts by running `npm run api:update` again and committing the
snapshot and deterministic Orval output separately.

## Confirmed Requirements

- Preserve `/platform-administration/identity-access`.
- Move `src/features/identity-access` to
  `src/features/platform-administration/identity-access` atomically.
- Treat `notificationEmail` as optional for both provider kinds.
- Normalize a blank email to `null`; reject invalid non-empty values.
- Show `—` when no notification email is configured.
- Use one cached `GET /get_roles_permissions` query for Realm roles and
  Permissions.
- Show backend role names and each role's permissions in Realm roles.
- Show the endpoint's global permission list in Permissions.
- Do not synthesize backend role metadata or use mock roles as a fallback.

## Architecture Decisions

- Generated API files remain the source contract; feature API modules validate
  and map them into narrow UI-facing models.
- Email normalization happens at the form-to-submit boundary. Feature Zod
  schemas remain the final guard before a request is sent.
- Provider GET mappers preserve `notificationEmail`; POST mappers send either a
  trimmed valid string or explicit `null`, allowing an existing value to be
  cleared.
- Identity Access gets a dedicated API boundary, query-key factory, and
  `useRolesPermissions` hook. It inherits the application's standard 15-minute
  stale time and 60-minute garbage-collection time from the shared QueryClient.
- Realm roles and Permissions consume the same query key, so mounting or
  switching between them does not create duplicate fresh requests.
- The backend role contract contains only `name` and `permissions`. The UI will
  not display mock descriptions, organizations, dates, user counts, or role IDs
  as if they came from the backend. A role name is the stable selection key for
  the current read-only endpoint.
- The feature-directory relocation happens after functional Identity changes,
  as one atomic rename. Splitting the move would leave cross-directory relative
  imports temporarily broken.

## Dependency Graph

```text
OpenAPI pull and Orval generation
├── Infrastructure provider data boundary
│   └── Form state and input
│       └── Detail drawer and translations
├── Orchestration provider data boundary
│   └── Form state and input
│       └── Detail drawer and translations
└── Roles/permissions API boundary
    └── Shared TanStack Query hook
        ├── Realm roles UI
        └── Permissions UI and navigation
            └── Atomic Identity Access relocation

All slices
└── Cross-cutting focused verification and commit audit
```

## Task List

Tasks are detailed in
`tasks/provider-notification-identity-access-todo.md`. The repository normally
uses GitHub Issues as the task-list target. External publication was blocked by
the environment's disclosure guard, so this local checklist is the safe draft
until the user explicitly authorizes publishing it.

### Phase 1: Contract foundation

- [ ] Task 1: Refresh and commit the OpenAPI and Orval contract.

### Checkpoint: Generated contract

- [ ] `npm run api:check` passes.
- [ ] The snapshot contains 42 paths, roles/permissions, and notification email.
- [ ] The atomic commit contains only the snapshot and generated files.

### Phase 2: Provider notification email

- [ ] Task 2: Add notification email to the infrastructure provider boundary.
- [ ] Task 3: Add infrastructure provider email form state and validation.
- [ ] Task 4: Show infrastructure provider email in details.
- [ ] Task 5: Add notification email to the orchestration provider boundary.
- [ ] Task 6: Add orchestration provider email form state and validation.
- [ ] Task 7: Show orchestration provider email in details.

### Checkpoint: Provider round trips

- [ ] GET, create, update, clear, invalid input, and missing-value behavior pass
  focused tests for both provider kinds.
- [ ] Provider API, form, modal, and table tests pass together.
- [ ] TypeScript and changed-file ESLint pass for provider files.

### Phase 3: Backend roles and permissions

- [ ] Task 8: Add the roles/permissions API boundary.
- [ ] Task 9: Add the shared cached roles/permissions hook.
- [ ] Task 10: Render backend roles and per-role permissions.
- [ ] Task 11: Render global permissions and expose both sections.
- [ ] Task 12: Relocate Identity Access under Platform Administration.

### Checkpoint: Identity Access

- [ ] Both sections share one fresh cached request.
- [ ] Loading, success, empty, error, and retry states are tested.
- [ ] The public route is unchanged and no stale source import remains.
- [ ] Focused Identity Access and route tests pass from the new directory.

### Phase 4: Completion

- [ ] Task 13: Run cross-cutting verification and audit atomic commits.

### Checkpoint: Ready for review

- [ ] `npm run api:check` passes.
- [ ] All explicitly affected tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Changed-file ESLint and `git diff --check` pass.
- [ ] The complete test suite and production build are not run unless focused
  verification exposes a cross-cutting failure or the user requests them.
- [ ] No task-owned changes remain uncommitted.

## Planned Atomic Commits

1. `chore(api): refresh roles permissions and notification contracts`
2. `feat(providers): support notification email`
3. `feat(platform-providers): support notification email`
4. `feat(identity-access): load roles and permissions`
5. `refactor(identity-access): move under platform administration`

The exact split may add a focused fixup commit only when a checkpoint exposes a
real defect. Unrelated worktree files must never be staged.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The live OpenAPI contract changes again before implementation | High | Run `api:update` first, inspect the semantic diff, and stop if the approved fields changed. |
| Blank email is omitted instead of clearing a stored value | High | Assert explicit `null` in API and modal tests for both provider kinds. |
| Backend role names are not unique | Medium | Treat names as keys only for the current read-only contract; stop if a pulled contract adds IDs or duplicate names appear in fixtures. |
| Realm roles and Permissions issue duplicate requests | Medium | Use one query-key factory and test both consumers against one QueryClient. |
| Moving about 50 Identity files obscures functional changes | Medium | Complete and verify functional changes first, commit them, then perform a rename-only commit plus the route import. |
| Full Identity suite becomes expensive | Low | Run explicit affected files per task, then the relocated Identity directory once at the relocation checkpoint. |

## Scope Exceptions

- Task 1 touches more than five files because Orval owns one deterministic
  generated set; splitting it would create an inconsistent contract commit.
- Task 12 touches more than five paths because Git must see the complete feature
  as one atomic rename. Its semantic edits are limited to app-level imports and
  route tests.

## Open Questions

None. The user approved Variant 1, the unchanged public URL, both Identity
sections, and optional validated email semantics.
