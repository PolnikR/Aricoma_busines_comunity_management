# Implementation Plan: ABCO Keycloak Identity & Access Focused Scope

## Overview

Implement the manager-requested Identity & Access scope around a real Keycloak integration: protect ABCO with a Keycloak login, manage users, assign ABCO application roles, and display what those roles allow inside ABCO.

This plan intentionally narrows the **visible** UI without deleting existing Identity & Access work. Existing sections, tab IDs, components, fields, mocks, and URL parsing remain available in the codebase unless a later requirement explicitly removes them. Non-required areas are hidden from normal navigation so they can be re-enabled later.

The working Keycloak model is:

- Keycloak realm: **ABCO**.
- ABCO browser application: a Keycloak **client** whose client ID is configuration-driven (for example `abco-frontend`; the exact deployed ID is not hardcoded by this plan).
- ABCO application roles such as `Administrator`, `Recovery Manager`, and `Viewer`: **client roles of the ABCO client**, not top-level realm roles.
- “Permissions” in the manager request: the ABCO capabilities granted by those application roles, **not** Keycloak fine-grained administration permissions.
- Browser login: use Keycloak's hosted login flow through the official JavaScript adapter rather than collecting a Keycloak password in the React application.
- Privileged user/role administration: use an ABCO backend/OpenAPI contract. The browser must not contain Keycloak administrator credentials or directly become the trusted administrator of the realm.

Official Keycloak references supporting the design:

- Realm/client/role model and client-role mappings: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak JavaScript adapter and `login-required`: https://www.keycloak.org/securing-apps/javascript-adapter
- Admin REST capabilities for users and client role mappings: https://www.keycloak.org/docs-api/latest/rest-api/index.html

## Current State

- `UserProvider` seeds the application with a hardcoded `admin` identity and `apiFetch` sends that username through `X-User`.
- No Keycloak/OIDC runtime dependency is present in `package.json`.
- Identity & Access users, roles, and sessions are currently served by local mock hooks/services rather than a backend Keycloak administration contract.
- The Identity & Access route registry already contains a broader Keycloak-style information architecture.
- The previous visual-alignment work is committed separately; this plan starts from that committed state.

## Architecture Decisions

### 1. Separate canonical navigation from visible product scope

Keep the existing `identityAccessSectionGroups` and `identityAccessSectionNavigation` as the canonical capability/URL registry. Add a presentation-level visibility definition consumed by navigation components and nested tab components.

This means:

- hidden sections are not deleted;
- hidden tab IDs remain valid internal identifiers;
- existing components remain in the repository;
- a hidden deep link can still be parsed/rendered unless a future authorization rule explicitly blocks it;
- re-enabling a section is a presentation configuration change rather than reconstruction work.

UI visibility is **not authorization**. Backend/API authorization must still reject actions the authenticated user is not allowed to perform.

### 2. Focus the visible Identity & Access navigation

#### Manage — visible now

- **Users** — default section.
- **Clients** — required because ABCO roles live under the ABCO Keycloak client.

#### Manage — hidden, retained

- Organizations
- Client scopes
- Realm roles
- Groups
- Sessions
- Events

`Groups` remains implemented and can be re-enabled when group-based role inheritance becomes an actual requirement. It is not required for the manager's direct user → role assignment flow.

#### Configure — visible now

- **Realm settings**
- **Authentication**

#### Configure — hidden, retained

- Permissions
- Identity providers
- User federation
- Workflows

The hidden top-level `Permissions` area represents Keycloak administration permissions and must not be reused to describe ABCO application capabilities.

### 3. Focus nested tabs without deleting the existing ones

#### Users — visible

- Details
- Credentials
- Role mappings

Hidden, retained: Attributes, Groups, Consents, Sessions, Identity provider links.

#### ABCO client — visible

- Settings
- Roles

Hidden, retained: Keys, Credentials, Client scopes, Authorization, Service accounts roles, Sessions, Permissions.

#### Realm settings — visible

- General
- Login
- **User profile** — add this Keycloak-relevant tab to the canonical registry.
- Email
- Themes

Hidden, retained: Keys, Events, Localization, Security defenses, Sessions, Tokens.

#### Authentication — visible

- Required actions

Hidden, retained: Flows, Policies.

When the user enters Authentication through normal navigation, `Required actions` becomes the visible/default destination. The canonical `flows` and `policies` IDs remain retained for future use.

### 4. Use Keycloak-hosted login, not a React password form

Initialize the official Keycloak JavaScript adapter before the React router is initialized and use `login-required` for the protected ABCO application. Unauthenticated users are redirected to the Keycloak login page and return to ABCO after authentication.

The existing `Realm settings > Themes` surface remains the place to expose/configure the selected login theme when the backend administration contract supports it.

### 5. Keep authentication and administration trust boundaries separate

Browser authentication uses the user's OIDC tokens. Administrative operations such as creating a user or changing role mappings require privileged Keycloak Admin API rights and therefore must go through a backend service/API contract.

The frontend may call generated ABCO API endpoints, but it must never store a Keycloak admin password/client secret in browser configuration.

### 6. Treat ABCO role capabilities as application authorization data

A Keycloak client role answers “which ABCO role does this user have?”. The application/back end must remain the source of truth for “what can this role do?”.

The frontend may display a capability catalog such as recovery/admin/audit actions, but it must receive or share that catalog from the application authorization contract. It must not infer Keycloak fine-grained admin `Permissions` as ABCO permissions and must not silently invent role → capability mappings.

## Dependency Graph

```text
Non-destructive visibility model
            │
            └──> Focused visible navigation/tabs

Keycloak deployment/configuration
            │
            └──> Browser OIDC authentication
                        │
                        └──> Authenticated UserContext + Bearer API transport

Backend Identity Admin/OpenAPI contract
            │
            ├──> Users + Add User
            │
            ├──> ABCO client roles
            │       └──> User role assignment
            │
            └──> ABCO role capability catalog
                    └──> Permission/capability visualization

Focused navigation + auth + admin features
            │
            └──> End-to-end verification
```

## Task 1: Add a non-destructive Identity & Access visibility model

**Description:** Introduce presentation metadata/helpers that determine which existing top-level sections are shown in the current product scope without removing them from the canonical section registry or URL parser.

**Acceptance criteria:**
- [ ] Manage navigation shows only `Users` and `Clients`; Configure shows only `Realm settings` and `Authentication`.
- [ ] All currently defined hidden section IDs remain in the canonical registry and remain parseable from existing URLs.
- [ ] Switching Manage/Configure still uses deterministic visible defaults (`Users` and `Realm settings`).

**Verification:**
- [ ] Focused tests: `IdentityAccessNavigation.test.tsx` and `useIdentityAccessSection.test.tsx`.
- [ ] Test at least one hidden-section deep link to prove hidden does not mean deleted.
- [ ] Changed-file ESLint passes with zero warnings.

**Dependencies:** None

**Files likely touched:**
- `src/features/identity-access/models/identityAccessSections.ts`
- `src/features/identity-access/components/IdentityAccessNavigation.tsx`
- `src/features/identity-access/components/IdentityAccessNavigation.test.tsx`
- `src/features/identity-access/hooks/useIdentityAccessSection.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 2: Focus nested tabs and add Realm User Profile

**Description:** Apply the same non-destructive visibility rule inside Users, Clients, Realm settings, and Authentication. Add `user-profile` as a real canonical Realm settings tab because it is directly relevant to Keycloak username/email/name behavior.

**Acceptance criteria:**
- [ ] Users visibly exposes only Details, Credentials, Role mappings; Client detail visibly exposes only Settings and Roles.
- [ ] Realm settings visibly exposes General, Login, User profile, Email, Themes; Authentication visibly exposes Required actions and opens there by default through normal navigation.
- [ ] Every currently existing hidden nested tab remains in code/canonical navigation and can be restored without rebuilding the feature.

**Verification:**
- [ ] Focused component tests verify the visible tab sets and hidden-tab retention/deep-link behavior.
- [ ] `useIdentityAccessSection.test.tsx` verifies `user-profile` and the Authentication visible default.
- [ ] Browser check confirms no empty tab rows or horizontal overflow at 1024 px.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/identity-access/models/identityAccessSections.ts`
- `src/features/identity-access/components/UsersSection.tsx`
- `src/features/identity-access/components/ClientsSection.tsx`
- `src/features/identity-access/components/RealmSettingsSection.tsx`
- focused tests for those components

**Estimated scope:** Medium; split implementation into component-owned substeps if the test updates exceed five files in one agent session.

## Checkpoint: Focused UI scope

- [ ] No pre-existing Identity & Access section/component has been deleted.
- [ ] Normal navigation exposes only the manager-relevant scope.
- [ ] Hidden deep links still resolve correctly.
- [ ] Focused Identity navigation/component tests pass.
- [ ] `npm run typecheck` passes.

## Task 3: Add Keycloak browser authentication foundation

**Description:** Add the official Keycloak JavaScript adapter and configuration for the ABCO realm/client. Initialize authentication before the router so the application uses Keycloak's hosted login page and returns to the protected SPA after successful authentication.

**Acceptance criteria:**
- [ ] Keycloak URL, realm, and client ID come from public runtime/build configuration; realm defaults/documentation identify `ABCO`, while deploy-specific URL/client ID are not hardcoded secrets.
- [ ] Unauthenticated startup uses `login-required` and redirects through the Keycloak-hosted login flow; authenticated startup renders the existing application/router.
- [ ] No Keycloak client secret, administrator credential, or user password is embedded in the frontend bundle.

**Verification:**
- [ ] Unit tests mock the Keycloak adapter for authenticated, unauthenticated/redirect, and initialization-failure paths.
- [ ] Manual local check against a development Keycloak realm confirms login redirect and return URL.
- [ ] Changed-file ESLint and `npm run typecheck` pass.

**Dependencies:** A reachable Keycloak development environment with realm `ABCO` and an OIDC client configured for the ABCO frontend.

**Files likely touched:**
- `package.json`
- `package-lock.json`
- `src/main.tsx`
- new `src/features/auth/keycloak/keycloakClient.ts`
- new `src/features/auth/keycloak/KeycloakAuthProvider.tsx`

**Estimated scope:** Medium (5 files plus focused tests; tests may be handled as a separate agent task)

## Task 4: Replace the hardcoded runtime identity with the Keycloak session

**Description:** Feed the authenticated Keycloak identity into the existing user context/header/API bridge. Preserve the current application-wide consumer contract where practical so unrelated features do not need to understand Keycloak directly.

**Acceptance criteria:**
- [ ] `UserProvider` no longer seeds a production session as hardcoded `admin`; username/display information comes from the authenticated Keycloak session.
- [ ] User menu Logout ends the Keycloak session and user title/role display comes from authenticated ABCO client roles.
- [ ] API transport can attach the authenticated Bearer token; if legacy `X-User` is temporarily required by the backend, it is derived from the authenticated identity and is explicitly treated as compatibility metadata, not authorization.

**Verification:**
- [ ] Focused `UserProvider`, `UserMenu`, and `apiClient` tests pass.
- [ ] Manual login → header identity → logout flow works.
- [ ] No unauthenticated/hardcoded identity is sent on protected API calls.

**Dependencies:** Task 3; backend must document whether Bearer JWT validation is already supported and whether `X-User` must temporarily coexist.

**Files likely touched:**
- `src/contexts/UserContext.ts`
- `src/contexts/UserProvider.tsx`
- `src/shared/api/currentUser.ts`
- `src/shared/api/apiClient.ts`
- `src/app/header/UserMenu.tsx`

**Estimated scope:** Medium (5 files plus focused tests)

## Checkpoint: Authentication

- [ ] ABCO cannot be entered anonymously when `login-required` is enabled.
- [ ] Login is handled by Keycloak, not a React password form.
- [ ] Authenticated user identity is visible in the existing header.
- [ ] Logout terminates the Keycloak session.
- [ ] Protected backend calls carry the agreed authentication token/headers.

## Task 5: Establish the backend/OpenAPI Identity Admin contract

**Description:** Before replacing the current Identity & Access mocks, confirm and expose backend endpoints that safely perform privileged Keycloak administration. This is an external dependency for the frontend implementation, not a reason to call Keycloak Admin REST directly from the browser.

The minimum contract needs to support:

- list/get/create/update ABCO realm users;
- user credential/required-action operations needed by the selected UX;
- identify the configured ABCO Keycloak client;
- list/get ABCO client roles;
- read/add/remove a user's ABCO client-role mappings;
- return the application capability/permission catalog associated with ABCO roles, or provide an equivalent application authorization endpoint.

**Acceptance criteria:**
- [ ] Backend OpenAPI contains the minimum user/client-role/role-mapping operations required by Tasks 6–8.
- [ ] The role-capability source of truth is explicit and does not reuse Keycloak fine-grained admin permissions by accident.
- [ ] Orval generation/checks complete without hand-editing generated API files.

**Verification:**
- [ ] `npm run api:update` (when the backend spec is ready).
- [ ] `npm run api:check` passes.
- [ ] Generated methods/types cover every required frontend operation before mock replacement begins.

**Dependencies:** Backend team / Keycloak administration service.

**Files likely touched:**
- backend OpenAPI source outside this FE repository (external)
- generated files under `src/generated/api/` via Orval only
- thin Identity Access API adapters/hooks added after generation

**Estimated scope:** External dependency + Medium FE integration

## Task 6: Connect Users and Add User to the Keycloak-backed API

**Description:** Replace the active Users flow's mock data with the generated backend identity contract while retaining the mock service file for now. Make Add User functional with only the fields needed for the Keycloak user model and the manager requirement.

**User fields in the focused UI:**

- Username
- Email
- First name
- Last name
- Enabled/status

Password/credential lifecycle stays under Credentials/Required actions rather than putting privileged credential logic into an oversized Add User form.

**Acceptance criteria:**
- [ ] Users list/detail loads real ABCO realm users through the backend contract and Add User persists a new user.
- [ ] Add User validates the focused Keycloak fields and refreshes/inserts the created user without requiring a full-page reload.
- [ ] Existing hidden user fields/tabs and mock files are not deleted; they simply are not part of the active production flow.

**Verification:**
- [ ] Focused user API/hook/component tests cover success, backend validation error, and retry/error state.
- [ ] Manual Add User → user detail flow works against development Keycloak through the backend.
- [ ] Changed-file ESLint and `npm run typecheck` pass.

**Dependencies:** Tasks 4–5

**Files likely touched:**
- `src/features/identity-access/models/identityTypes.ts`
- `src/features/identity-access/hooks/useUsers.ts`
- new/thin Identity user API adapter or mutation hook
- `src/features/identity-access/components/UsersSection.tsx`
- focused tests

**Estimated scope:** Medium; keep API/hook and UI mutation work as separate agent slices if needed.

## Task 7: Implement ABCO client roles and user role assignment

**Description:** Make `Clients > <ABCO client> > Roles` the role-management surface for application roles and make `Users > Role mappings` assign those client roles to users. Keep the top-level Realm roles feature hidden and intact.

**Acceptance criteria:**
- [ ] The configured ABCO client can be resolved and its client roles can be listed/viewed under the visible Roles tab.
- [ ] User Role mappings shows available/assigned ABCO client roles and can add/remove mappings through the backend contract.
- [ ] The UI never presents a realm role as an ABCO application role unless the backend explicitly classifies it that way.

**Verification:**
- [ ] Focused client-role and user-role-mapping tests cover list, assign, remove, and backend error states.
- [ ] Manual flow: create/select user → assign `Viewer`/`Recovery Manager`/`Administrator` → refresh → assignment persists.
- [ ] Keycloak Admin Console confirms the mapping is attached to the ABCO client role namespace.

**Dependencies:** Tasks 5–6

**Files likely touched:**
- `src/features/identity-access/components/ClientsSection.tsx`
- `src/features/identity-access/components/UsersSection.tsx`
- Identity role model/API hook files
- focused tests

**Estimated scope:** Medium (split client-role management and user assignment into separate agent sessions if needed)

## Task 8: Show effective ABCO permissions/capabilities for roles and users

**Description:** Surface the manager-requested “oprávnenia” as application capabilities associated with ABCO client roles. Do not use Keycloak's fine-grained administration Permissions screen for this.

**Acceptance criteria:**
- [ ] ABCO client role detail shows the capabilities granted by that role with stable IDs/labels/descriptions from the application authorization source of truth.
- [ ] User Role mappings shows the user's assigned roles and an effective capability summary; duplicate capabilities inherited from multiple roles are de-duplicated.
- [ ] If the capability contract is unavailable, the UI shows an explicit integration-gated state rather than inventing permissions from role names.

**Verification:**
- [ ] Focused tests cover role capability display, effective union/de-duplication, and missing-contract state.
- [ ] Manual comparison with backend authorization configuration confirms displayed capabilities match enforcement data.
- [ ] No hidden Keycloak admin `Permissions` section is reintroduced into normal navigation.

**Dependencies:** Tasks 5 and 7; product/backend must define the authoritative ABCO role → capability mapping.

**Files likely touched:**
- `src/features/identity-access/models/identityTypes.ts`
- Identity roles/capabilities API hook or mapper
- `src/features/identity-access/components/ClientsSection.tsx`
- `src/features/identity-access/components/UsersSection.tsx`
- focused tests

**Estimated scope:** Medium

## Task 9: Connect the focused Realm settings and Required actions surfaces

**Description:** Keep only the agreed configuration tabs visible and wire their manager-relevant values to the backend Keycloak administration contract as it becomes available. Do not implement every Keycloak setting simply because Keycloak exposes it.

Focused fields/behavior:

- **General:** realm identity/display information needed by ABCO; realm name remains `ABCO` context.
- **Login:** only agreed login behavior such as login with email/email-as-username, forgot password, remember me, and verification/self-registration switches where product requirements explicitly choose them.
- **User profile:** username, email, first name, last name requirements/editability/validation relevant to Add User and login.
- **Email:** SMTP/email-delivery configuration/status required for password reset or email verification; secrets must remain backend-managed/masked.
- **Themes:** selected login theme; actual theme assets/deployment stay in the Keycloak deployment/theme pipeline.
- **Authentication → Required actions:** at minimum expose the enabled/default actions relevant to new users (for example Update Password, Verify Email, Update Profile, Configure OTP) based on the agreed product policy.

**Acceptance criteria:**
- [ ] Only focused configuration is visible; hidden configuration remains retained in code.
- [ ] Sensitive values are never returned to or stored in the browser as clear-text secrets.
- [ ] Login/required-action settings shown in ABCO match the development Keycloak realm after save/refresh.

**Verification:**
- [ ] Focused Realm settings/Authentication tests cover loading, save, validation error, and masked secret behavior where applicable.
- [ ] Manual Keycloak Admin Console comparison confirms persisted values.
- [ ] Changed-file ESLint and `npm run typecheck` pass.

**Dependencies:** Task 5; exact field set must be constrained by the backend contract and product policy.

**Files likely touched:**
- `src/features/identity-access/components/RealmSettingsSection.tsx`
- `src/features/identity-access/components/AuthenticationSection.tsx`
- focused settings API hooks/adapters
- focused tests

**Estimated scope:** Medium; split Realm settings and Required actions into separate agent slices.

## Final Checkpoint: Manager flow

- [ ] Opening ABCO while signed out redirects to the Keycloak-hosted login page.
- [ ] Successful login returns to ABCO and the header reflects the authenticated user.
- [ ] Identity & Access normal navigation shows only the focused scope; hidden sections/tabs still exist in code.
- [ ] Administrator can add a user through the backend-managed Keycloak flow.
- [ ] Administrator can assign/remove ABCO client roles for that user.
- [ ] UI shows the role's and user's effective ABCO capabilities from the authoritative application authorization mapping.
- [ ] Logout ends the Keycloak session.
- [ ] Focused tests, Identity & Access tests, typecheck, changed-file lint, `api:check`, and production build pass at the final cross-cutting checkpoint.
- [ ] Browser verification covers desktop and 1024 px navigation without hidden-tab overflow regressions.

## Parallelization Opportunities

After Task 1 establishes the visibility contract:

- **Agent A:** Task 2 — visible navigation/nested-tab scope.
- **Agent B:** Task 3 — Keycloak browser auth foundation.
- **Backend/API track:** Task 5 — backend/OpenAPI identity administration contract can proceed in parallel with Tasks 1–4.

After the backend contract lands:

- **Agent C:** Task 6 — Users/Add User API integration.
- **Agent D:** client-role half of Task 7.
- **Agent E:** Task 9 — Realm settings/Required actions, if its backend endpoints are independent.

User role assignment and permission visualization remain sequential after the client-role/user contracts because they share those models.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hidden UI is accidentally deleted | High | Keep canonical registry/components; add separate presentation visibility configuration and regression tests for hidden deep links |
| ABCO roles are modeled as realm roles | High | Resolve/manage roles under the configured ABCO client and test the role namespace |
| Frontend directly calls Keycloak Admin REST with privileged credentials | Critical | Require a backend/OpenAPI administration contract; never bundle admin secrets |
| Login is built as a custom React password form | High | Use official Keycloak JS redirect/hosted login flow; customize login through Keycloak theme |
| Displayed “permissions” drift from actual backend authorization | High | Use an authoritative application capability catalog; do not infer capabilities from role names |
| Existing `X-User` behavior conflicts with JWT auth | High | Define a staged backend transition; Bearer token is authorization, any temporary `X-User` is derived compatibility metadata only |
| Scope expands to all Keycloak Admin Console capabilities | Medium | Keep YAGNI visibility list explicit; re-enable hidden sections only on a concrete requirement |
| Existing mock role `permissionIds` are mistaken for Keycloak admin permissions | Medium | Treat them only as provisional ABCO capability semantics until backend contract confirms the model |

## Open Questions / External Decisions

1. What is the deployed Keycloak client ID for ABCO (`abco-frontend` is only an example)?
2. Does the ABCO backend already validate Keycloak Bearer tokens, or is JWT validation a backend prerequisite?
3. Which backend endpoints/OpenAPI operations will own Keycloak user and client-role administration?
4. What is the authoritative ABCO role → capability mapping? The current mock `permissionIds` can inform the UI model, but must not become production truth without backend/product confirmation.
5. Which Login switches are actually required for the first release: login with email, email as username, forgot password, remember me, verify email, self-registration? Default plan is to expose only values explicitly approved by product/manager.
6. Should Groups be re-enabled later for group-based role inheritance? It remains retained but hidden in the initial manager scope.

## Explicitly Not in the Initial Scope

- Deleting any existing Identity & Access section/tab/component for cleanup.
- Keycloak Organizations, Client scopes, realm-level role management, session administration, event audit, identity brokering, LDAP/user federation, workflows.
- Keycloak fine-grained admin permission management as a substitute for ABCO application permissions.
- Advanced Authentication Flow/Policy editing.
- Keycloak Authorization Services resource/scope/policy editor unless a future requirement explicitly selects that authorization model.
- A custom React username/password login form.
