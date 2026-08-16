# Checklist: Identity & Access Management (Approach A — Horizontal Tabs)

## Phase 1: Foundation & Navigation

- [ ] **Task 1** — Create Identity & Access feature structure
  - [ ] Directory scaffold: `src/features/identity-access/`
  - [ ] Page route added to router
  - [ ] Five tabs render with active state
  - [ ] Tab switching works
  - [ ] Uses `page` component

- [ ] **Task 2** — Define core TypeScript types and mock data
  - [ ] Type definitions: User, Role, Permission, Organization, Session
  - [ ] Mock data service returns realistic test data
  - [ ] Types extensible for Keycloak fields
  - [ ] No TypeScript errors

## Checkpoint: Foundation

- [ ] App builds, page renders, tabs navigate
- [ ] Types defined, mock data ready
- [ ] Ready for data layer

## Phase 2: Data Layer & Hooks

- [ ] **Task 3** — Create mock API hooks
  - [ ] useUsers(), useRoles(), usePermissions(), useOrganizations(), useSessions()
  - [ ] All return {data, isLoading, error}
  - [ ] Support optional filters
  - [ ] Simulate async delay
  - [ ] Error handling stub in place
  - [ ] Unit tests passing

## Phase 3: Users Tab

- [ ] **Task 4** — Build Users list and detail components
  - [ ] UsersTab renders user list via DataTable
  - [ ] Columns: Name, Email, Organization, Roles, Status, Last Login
  - [ ] Click row opens user detail modal
  - [ ] Detail shows all user fields and history
  - [ ] Loading/error states display
  - [ ] Empty state when no users
  - [ ] Responsive design

- [ ] **Task 5** — Add User management actions (Add, Edit, Delete — mock)
  - [ ] "Add User" button opens form
  - [ ] "Edit" button pre-fills form
  - [ ] "Delete" shows confirmation
  - [ ] Form validation works (email, required fields)
  - [ ] Success/error notifications appear
  - [ ] Mock mutations update state
  - [ ] Data persists during session

## Checkpoint: Users Tab

- [ ] Users list displays with all columns
- [ ] Detail modal opens and shows info
- [ ] Add/Edit/Delete forms work
- [ ] Validation and error handling in place
- [ ] No console errors; tests pass

## Phase 4: Roles, Permissions, Organizations

- [ ] **Task 6** — Build Roles tab (list, detail, CRUD)
  - [ ] RolesTab renders role list
  - [ ] Columns: Name, Description, Member Count, Permission Count
  - [ ] Detail shows members and permissions
  - [ ] "Add Role" form with permission checkboxes
  - [ ] "Edit Role" updates permissions
  - [ ] "Delete Role" with confirmation
  - [ ] Permission assignment works

- [ ] **Task 7** — Build Permissions tab (read-only)
  - [ ] Permissions list shows all permissions
  - [ ] Columns: ID, Category, Description
  - [ ] Search/filter by ID or description
  - [ ] Detail shows which roles have permission
  - [ ] Read-only (no mutations)

- [ ] **Task 8** — Build Organizations tab (list, detail, CRUD)
  - [ ] Organizations list with Name, Member Count, Role Count, Status
  - [ ] Detail shows org members and roles
  - [ ] "Add Organization" form
  - [ ] "Edit Organization" updates info
  - [ ] "Delete Organization" with confirmation
  - [ ] User/role reassignment to different org works

## Checkpoint: Core Tabs

- [ ] All five tabs implemented
- [ ] CRUD operations work for Users, Roles, Organizations
- [ ] All tests passing
- [ ] Data updates consistently across tabs
- [ ] Ready for Sessions tab

## Phase 5: Sessions Tab & Polish

- [ ] **Task 9** — Build Sessions tab (audit/monitoring)
  - [ ] Sessions list shows active + historical sessions
  - [ ] Columns: User, Organization, Login Time, Last Activity, IP, Status
  - [ ] Filter by date range (24h, 7d, custom)
  - [ ] Filter by user (dropdown)
  - [ ] "Logout User" button works (mocked)
  - [ ] Read-only audit view

- [ ] **Task 10** — Polish, accessibility, and final QA
  - [ ] All forms have proper labels and ARIA attributes
  - [ ] Keyboard navigation works (Tab, Enter, Escape)
  - [ ] Dark mode CSS verified
  - [ ] Responsive on mobile (tables scroll, modals fit)
  - [ ] Error states tested
  - [ ] No accessibility warnings
  - [ ] Test coverage >80%
  - [ ] Lint/typecheck clean

## Checkpoint: Feature Complete

- [ ] All five tabs fully functional
- [ ] CRUD operations working
- [ ] All tests passing (>80% coverage)
- [ ] Accessibility and responsive design verified
- [ ] Dark mode and styling consistent
- [ ] Ready for Keycloak integration planning

---

## Future: Keycloak Integration (separate phase)

- [ ] Replace mock hooks with Keycloak API client calls
- [ ] Map types to Keycloak REST API responses
- [ ] Wire login/logout to Keycloak OAuth flow
- [ ] Add permission guards based on Keycloak token claims
