# Implementation Plan: Identity & Access Management (Approach A — Horizontal Tabs)

## Overview

Build the Identity & Access management feature as a single page under platform-administration with horizontal tab navigation (Users | Roles | Permissions | Organizations | Sessions). Implement with mock data and API hooks designed to integrate with Keycloak later without major refactoring. Each tab manages core identity entities: users, roles, permissions, and organizations for multi-tenant admin control, plus sessions for audit/monitoring.

## Architecture Decisions

- **Single Page, Horizontal Tabs** — All sections under `/platform-administration/identity-access` using native `<Tab>` or custom tab component. Clean, no extra pages, minimal URL complexity.
- **Mock First, Keycloak Later** — Build with mock hooks (`useUsers()`, `useRoles()`, etc.) that return `{data, isLoading, error}`. Replace mock implementation with Keycloak API calls later without changing component code.
- **Type Safety for Keycloak Readiness** — Define TypeScript types (`User`, `Role`, `Permission`, `Organization`, `Session`) that align with Keycloak's concept model (realm users, roles, mappers). Makes future Keycloak integration a data model swap, not a refactor.
- **Reuse Existing Components** — Use your `DataTable`, `Button`, `Badge`, `Form`, `Modal` components throughout. Follow established token system and spacing patterns.
- **Multi-Tenant Design** — Users and roles scoped to organization/tenant from the start. Single-organization mode still works (default to one org in mock data).

## Task List

### Phase 1: Foundation & Navigation

#### Task 1: Create Identity & Access feature structure

**Description:** Scaffold the feature directory and create the main page with horizontal tab navigation. Set up routing, page layout, and stub the five tab sections with placeholders.

**Acceptance criteria:**
- [ ] Directory structure created: `src/features/identity-access/` with subdirs for pages, components, hooks, models
- [ ] Page route added to `createAppRouter.ts` at `/platform-administration/identity-access`
- [ ] Five tabs render (Users, Roles, Permissions, Organizations, Sessions) with active state tracking
- [ ] Tab switching works; each tab shows a placeholder
- [ ] Uses `page` component from your shared library for consistent header/layout

**Verification:**
- [ ] `npm run typecheck` — clean
- [ ] App builds without errors
- [ ] Manual check: Navigate to `/platform-administration/identity-access`, tabs render and switch
- [ ] No console errors

**Dependencies:** None

**Files likely touched:**
- `src/features/identity-access/pages/IdentityAccessPage.tsx`
- `src/features/identity-access/pages/IdentityAccessPage.test.tsx`
- `src/app/createAppRouter.ts`
- `src/features/identity-access/components/IdentityAccessTabs.tsx`

**Estimated scope:** Medium (4–5 files)

---

#### Task 2: Define core TypeScript types and mock data

**Description:** Create type definitions for User, Role, Permission, Organization, and Session aligned with Keycloak's model. Build a mock data service that returns realistic test data. Types should be extensible for Keycloak's additional fields later.

**Acceptance criteria:**
- [ ] Type definitions created: `User`, `Role`, `Permission`, `Organization`, `Session` in `models/` directory
- [ ] Types include core fields (id, name, email, status, createdAt, etc.) plus metadata for Keycloak compat
- [ ] Mock data service (`mockIdentityService.ts`) returns 5+ users, 3+ roles, 10+ permissions, 2+ organizations, 5+ sessions
- [ ] Mock data feels realistic (proper dates, valid email formats, sensible role/permission names)
- [ ] No TypeScript errors in types or mock data

**Verification:**
- [ ] `npm run typecheck` — clean
- [ ] Mock data imports without error
- [ ] Manual check: Log mock users/roles/permissions, verify structure matches type definitions

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/identity-access/models/identityTypes.ts`
- `src/features/identity-access/services/mockIdentityService.ts`

**Estimated scope:** Small (2 files)

---

### Checkpoint: Foundation

- [ ] App builds, page renders, tabs navigate
- [ ] Types defined, mock data ready
- [ ] No blockers; ready to build data layer

---

### Phase 2: Data Layer & Hooks

#### Task 3: Create mock API hooks for Users, Roles, Permissions, Organizations, Sessions

**Description:** Implement custom hooks (`useUsers()`, `useRoles()`, `usePermissions()`, `useOrganizations()`, `useSessions()`) that return mock data in a `{data, isLoading, error}` shape. These hooks mirror Keycloak API shape and can be swapped with real API calls later.

**Acceptance criteria:**
- [ ] Five hooks created, each returning `{data: T[], isLoading: boolean, error: Error | null}`
- [ ] Hooks accept optional filters (e.g., `useUsers({organizationId: 'org1'})`)
- [ ] Mock data is returned after a simulated delay (e.g., 200ms) to mimic async API
- [ ] All hooks are testable and pure (no side effects beyond returning data)
- [ ] Error handling stub in place (error state returns mock error for testing)

**Verification:**
- [ ] Unit tests: Each hook returns correct data shape, handles loading/error states
- [ ] `npm run typecheck` — clean
- [ ] Manual check: Use hooks in a test component, verify data + states render correctly

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/identity-access/hooks/useUsers.ts`
- `src/features/identity-access/hooks/useRoles.ts`
- `src/features/identity-access/hooks/usePermissions.ts`
- `src/features/identity-access/hooks/useOrganizations.ts`
- `src/features/identity-access/hooks/useSessions.ts`
- `src/features/identity-access/hooks/*.test.ts` (5 test files)

**Estimated scope:** Medium (10 files: 5 hooks + 5 tests)

---

### Phase 3: Users Tab

#### Task 4: Build Users list and detail components

**Description:** Create a read-only user list using your `DataTable` component, showing columns: Name, Email, Organization, Role(s), Status, Last Login. Add a detail panel or modal to view user profile. No mutations yet; focus on display and filtering.

**Acceptance criteria:**
- [ ] `UsersTab.tsx` component renders list of users via `useUsers()` hook
- [ ] `DataTable` shows: Name, Email, Organization, Roles, Status, Last Login
- [ ] Click row to open user detail in modal or side panel
- [ ] Detail shows: all user fields, assigned roles/permissions, organization, login history
- [ ] Loading and error states display via your existing components
- [ ] Empty state displays when no users exist
- [ ] Responsive; table scrolls on narrow screens

**Verification:**
- [ ] Component tests: Mock hook, render, verify table rows and detail modal
- [ ] `npm run typecheck` — clean
- [ ] Manual check: Navigate to Users tab, see list, click user, detail panel opens

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/identity-access/components/UsersTab.tsx`
- `src/features/identity-access/components/UserDetailModal.tsx`
- `src/features/identity-access/components/UsersTab.test.tsx`

**Estimated scope:** Medium (3 files)

---

#### Task 5: Add User management actions (Add, Edit, Delete — mock only)

**Description:** Add buttons for "Add User", "Edit", "Delete" on the Users tab. Implement modals/forms for adding and editing users (using your `Form` component). Delete shows confirmation. All mutations are mocked (log to console, update mock data in memory).

**Acceptance criteria:**
- [ ] "Add User" button opens form modal with fields: Name, Email, Organization, Roles, Status
- [ ] "Edit" button on each row opens form pre-filled with user data
- [ ] "Delete" button shows confirmation modal before action
- [ ] Form validation: email format, required fields
- [ ] Success/error notifications (badges or alerts) after action
- [ ] Mock mutations update local state; data persists during session
- [ ] No actual API calls (all mocked via useState or context)

**Verification:**
- [ ] Component tests: Mock form inputs, verify data updates
- [ ] Form validation tested (invalid email rejected, required fields enforced)
- [ ] Manual check: Add/edit/delete user, see data update and notification appear

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/identity-access/components/UserFormModal.tsx`
- `src/features/identity-access/components/ConfirmDeleteModal.tsx`
- `src/features/identity-access/components/UsersTab.tsx` (updated)
- Tests for form and confirmation

**Estimated scope:** Medium (4–5 files)

---

### Checkpoint: Users Tab

- [ ] Users list displays with all columns
- [ ] Detail modal opens and shows full user info
- [ ] Add/Edit/Delete forms work and update data
- [ ] Validation and error handling in place
- [ ] No console errors; all tests pass

---

### Phase 4: Roles, Permissions, Organizations Tabs

#### Task 6: Build Roles tab (list, detail, CRUD)

**Description:** Similar to Users tab, but for Roles. Show role list with Name, Description, # of Members, # of Permissions. Detail shows role members and assigned permissions. Add/Edit/Delete roles with permission assignment UI.

**Acceptance criteria:**
- [ ] `RolesTab.tsx` renders role list via `useRoles()` hook
- [ ] Columns: Role Name, Description, Member Count, Permission Count
- [ ] Detail modal shows members and permissions in that role
- [ ] "Add Role" form with name, description, permission checkboxes
- [ ] "Edit Role" updates permissions and basic info
- [ ] "Delete Role" with confirmation
- [ ] Permission checkboxes work; role can have 0+ permissions

**Verification:**
- [ ] Component and form tests
- [ ] Manual check: Create role, assign permissions, see members update

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/identity-access/components/RolesTab.tsx`
- `src/features/identity-access/components/RoleDetailModal.tsx`
- `src/features/identity-access/components/RoleFormModal.tsx`
- Tests

**Estimated scope:** Medium (4–5 files)

---

#### Task 7: Build Permissions tab (read-only list and detail)

**Description:** Display all permissions as a searchable, read-only list. Show: Permission ID, Description, Category (e.g., "Recovery", "Admin", "Audit"). Detail modal shows which roles have this permission.

**Acceptance criteria:**
- [ ] Permissions list shows all 10+ permissions from mock data
- [ ] Columns: Permission ID, Category, Description
- [ ] Search/filter by ID or description
- [ ] Detail modal shows which roles grant this permission
- [ ] No add/edit/delete (permissions are system-defined; read-only for now)

**Verification:**
- [ ] Component tests; search works
- [ ] Manual check: Search for permission, click to see which roles have it

**Dependencies:** Task 6

**Files likely touched:**
- `src/features/identity-access/components/PermissionsTab.tsx`
- `src/features/identity-access/components/PermissionDetailModal.tsx`

**Estimated scope:** Small (2 files)

---

#### Task 8: Build Organizations tab (list, detail, CRUD)

**Description:** List organizations with Name, # of Users, # of Roles, Status. Detail shows members and roles in that org. Add/Edit/Delete organizations (mock only). Organization is a grouping for multi-tenant support.

**Acceptance criteria:**
- [ ] Organizations list with Name, Member Count, Role Count, Status columns
- [ ] Detail modal shows org members and roles
- [ ] "Add Organization" form with name, description
- [ ] "Edit Organization" updates name/description
- [ ] "Delete Organization" with confirmation (prevents delete if has members)
- [ ] Users/roles can be reassigned to different org via org detail

**Verification:**
- [ ] Component tests
- [ ] Manual check: Create org, assign user/role, see counts update

**Dependencies:** Task 7

**Files likely touched:**
- `src/features/identity-access/components/OrganizationsTab.tsx`
- `src/features/identity-access/components/OrganizationDetailModal.tsx`
- `src/features/identity-access/components/OrganizationFormModal.tsx`

**Estimated scope:** Medium (4–5 files)

---

### Checkpoint: Core Tabs

- [ ] All five tabs implemented (Users, Roles, Permissions, Organizations, Sessions)
- [ ] CRUD operations work for Users, Roles, Organizations
- [ ] All tests passing, no console errors
- [ ] Data updates consistently across tabs (e.g., add user to role, see count update)
- [ ] Ready for Sessions tab

---

### Phase 5: Sessions Tab & Polish

#### Task 9: Build Sessions tab (audit/monitoring view)

**Description:** Read-only list of active and historical login sessions. Show: User, Organization, Login Time, Last Activity, IP Address, Status (Active/Expired). Optional: filter by user or date range.

**Acceptance criteria:**
- [ ] Sessions list shows all active + recent sessions from mock data
- [ ] Columns: User, Organization, Login Time, Last Activity, IP, Status
- [ ] Filter by date range (last 24h, last 7d, custom)
- [ ] Filter by user (dropdown)
- [ ] "Logout User" button terminates session (mocked)
- [ ] No add/edit/delete (read-only audit view)

**Verification:**
- [ ] Component tests; filters work
- [ ] Manual check: Filter sessions by date/user, logout button works

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/identity-access/components/SessionsTab.tsx`

**Estimated scope:** Small (1–2 files)

---

#### Task 10: Polish, accessibility, and final QA

**Description:** Review all tabs for consistency, accessibility, responsive design. Ensure form labels, error messages, and confirmation dialogs follow your app's patterns. Add any missing tests for edge cases. Verify dark mode support and keyboard navigation.

**Acceptance criteria:**
- [ ] All forms have proper labels and ARIA attributes
- [ ] Confirm dialogs are keyboard-accessible (Tab, Enter, Escape)
- [ ] Dark mode CSS works (test with your existing dark theme)
- [ ] Responsive: tables scroll on mobile, modals fit small screens
- [ ] All error states tested (network error, empty state, validation)
- [ ] No accessibility warnings in audit tools
- [ ] Test coverage >80% for all components

**Verification:**
- [ ] `npm run lint` — clean
- [ ] `npm run typecheck` — clean
- [ ] Test coverage report: >80% coverage
- [ ] Manual check: Keyboard nav through all tabs, dark mode toggle, mobile viewport

**Dependencies:** Task 9

**Files likely touched:**
- All component files updated for accessibility and styling
- New edge-case tests

**Estimated scope:** Medium (5+ files touched)

---

### Checkpoint: Feature Complete

- [ ] All five tabs fully functional
- [ ] CRUD operations working as expected
- [ ] All tests passing (>80% coverage)
- [ ] Accessibility and responsive design verified
- [ ] Dark mode and styling consistent with app
- [ ] Ready for Keycloak integration planning

---

## Keycloak Integration Preparation

### Post-Implementation (Future Phase)

Once this feature is built and tested with mock data, Keycloak integration will:

1. **Replace Mock Hooks** — Swap `useUsers()`, `useRoles()`, etc. with Keycloak API client calls. Component code unchanged.
2. **Map Keycloak Types** — Align `User`, `Role`, `Permission`, `Organization` types with Keycloak's REST API response shapes.
3. **Add Authentication** — Wire login/logout to Keycloak OAuth flow.
4. **Permission Guards** — Enforce Keycloak token claims in component visibility (e.g., hide "Add User" if user lacks `manage:users` permission).

No component refactoring needed if types and hooks are designed well in this phase.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep (want to add auth flow now) | High | Explicitly scoped to management UI only; mock auth. Real Keycloak integration is future phase. |
| Multi-tenant logic adds complexity | Medium | Start with single org in mock data; design types to support multi-tenant but don't over-engineer. Keycloak realms = orgs. |
| Form validation becomes complex | Low | Use form library from your existing codebase (e.g., react-hook-form if already in use). Keep validation rules simple initially. |
| Dark mode/accessibility missed | Low | Include in Task 10; test early and often. Leverage existing design tokens. |

---

## Open Questions

- Should users be able to assign roles to themselves, or only admins? (Assume admin-only for now; adjust in Task 5 if needed.)
- Do you want audit logs for mutations (e.g., "User John added role Admin at 2:30pm")? (Defer to post-MVP if yes.)
- Should Sessions support "logout all" or only individual session termination? (Individual only for now.)

---

## Summary

**10 focused tasks** across 5 phases, building Approach A (Horizontal Tabs) Identity & Access management with mock data and Keycloak-ready hooks. Each task is testable and leaves the system in a working state. By Task 10, you'll have a complete, polished feature ready to drop Keycloak into without major refactoring.
