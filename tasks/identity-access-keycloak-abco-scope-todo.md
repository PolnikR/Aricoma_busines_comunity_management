# Todo: ABCO Keycloak Identity & Access Focused Scope

## Phase 1: Non-destructive product scope

- [ ] Task 1: Add a presentation visibility model while retaining every current canonical section/tab.
- [ ] Task 2: Show only the focused nested tabs and add Realm settings > User profile.

### Checkpoint: Focused UI

- [ ] Manage shows Users + Clients only.
- [ ] Configure shows Realm settings + Authentication only.
- [ ] Users shows Details + Credentials + Role mappings.
- [ ] ABCO Client shows Settings + Roles.
- [ ] Realm settings shows General + Login + User profile + Email + Themes.
- [ ] Authentication opens Required actions as the focused/default visible tab.
- [ ] Hidden sections/tabs still exist and hidden deep links remain parseable.
- [ ] Focused tests + typecheck pass.

## Phase 2: Keycloak login/session

- [ ] Task 3: Add Keycloak JS browser authentication for realm `ABCO` and the configured ABCO client.
- [ ] Task 4: Replace the hardcoded admin runtime identity with the authenticated Keycloak session; wire logout and Bearer API transport.

### Checkpoint: Authentication

- [ ] Signed-out ABCO redirects to Keycloak-hosted login.
- [ ] Successful login returns to ABCO.
- [ ] Header displays authenticated identity/client role information.
- [ ] Logout terminates Keycloak session.
- [ ] No admin secret/password exists in frontend config or bundle.

## Phase 3: Backend administration contract

- [ ] Task 5: Confirm/generate backend OpenAPI operations for users, ABCO client roles, user role mappings, and ABCO role capabilities.
- [ ] `npm run api:check` passes after generated-client update.
- [ ] Browser never calls privileged Keycloak Admin REST with embedded admin credentials.

## Phase 4: Users and ABCO client roles

- [ ] Task 6: Connect Users/Add User to real backend/Keycloak data.
- [ ] Task 7: Implement Clients > ABCO > Roles and User > Role mappings with client roles.
- [ ] Task 8: Show role and effective-user ABCO capabilities from the authoritative authorization mapping.

### Checkpoint: Manager identity flow

- [ ] Add user persists in development Keycloak through the backend.
- [ ] Assign/remove `Administrator`, `Recovery Manager`, `Viewer` (or the deployed role set) as ABCO **client roles**.
- [ ] Role assignment persists after refresh.
- [ ] User/role capability display matches backend authorization data.
- [ ] Top-level Realm roles remains hidden and retained.

## Phase 5: Focused Keycloak configuration

- [ ] Task 9: Connect the approved Realm settings and Authentication > Required actions fields.
- [ ] General uses ABCO realm context.
- [ ] Login exposes only approved login behavior.
- [ ] User profile covers username, email, first name, last name rules.
- [ ] Email supports only backend-safe/masked SMTP configuration/status needed by selected flows.
- [ ] Themes exposes selected Keycloak login theme configuration.
- [ ] Required actions exposes the agreed first-login actions.
- [ ] Keys, Events, Localization, Security defenses, Sessions, Tokens, Flows, Policies remain hidden but retained.

## Final Verification

- [ ] Full manager flow: login → Users → Add user → Role mappings → effective ABCO permissions → logout.
- [ ] Hidden sections/components were not deleted.
- [ ] Focused Identity & Access tests pass.
- [ ] Changed-file ESLint passes with zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm run api:check` passes after backend contract integration.
- [ ] Final `npm run build` passes.
- [ ] Browser verification at desktop and 1024 px passes.
- [ ] `git diff --check` passes and only in-scope files are committed.

## External decisions still required

- [ ] Confirm deployed ABCO Keycloak client ID.
- [ ] Confirm backend Bearer-token/JWT support and temporary `X-User` compatibility needs.
- [ ] Confirm Identity Admin OpenAPI endpoints.
- [ ] Confirm authoritative ABCO role → capability mapping.
- [ ] Confirm first-release Login switches.
- [ ] Decide later whether Groups should be re-enabled for inherited role mappings.
