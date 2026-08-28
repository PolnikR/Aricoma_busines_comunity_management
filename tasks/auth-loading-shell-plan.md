# Implementation Plan: Pure Full-App Authentication Skeleton

## Overview

Replace the centered `Loading` text shown during `keycloak.init()` and
`keycloak.loadUserProfile()` with the approved Variant A: an immediate,
route-independent skeleton of the complete application shell. The skeleton
mirrors the responsive sidebar, header, page heading, toolbar, and table-shaped
content area, while every visible item remains a non-interactive placeholder.

The change is limited to the pending authentication state. It does not change
Keycloak initialization, profile loading, token refresh, routing, authorization,
or the existing authentication error message.

## Confirmed Behavior

- The full-app skeleton appears immediately whenever authentication status is
  `pending`; there is no delay or duration threshold.
- Logo, product name, navigation labels, search, avatar, page title, actions,
  and content are all rendered as decorative skeleton shapes.
- The skeleton is shared by every route and never inspects the current URL.
- No visible `Loading` or authentication copy is rendered.
- Assistive technology receives one localized loading status through the
  skeleton container; decorative shapes remain hidden.
- The desktop skeleton mirrors the existing sidebar and rounded content shell.
  Mobile omits the closed sidebar and mirrors the full-width header/content
  layout.
- The current authentication error branch remains unchanged.

## Architecture Decisions

- Add a focused `AppShellSkeleton` presentation component under
  `src/layouts/app-shell/`. It owns only the visual shell and can render before
  router, sidebar, user, and application providers exist.
- Mirror the structural classes and responsive breakpoints from `AppShell`,
  `AppSidebar`, and `AppHeader`; do not render those live components because
  they depend on router, sidebar, user, and authentication state.
- Reuse semantic design tokens such as `bg-page`, `bg-surface`, `bg-surface-muted`,
  `border-border`, and the established `animate-pulse` treatment. Do not add new
  global CSS or arbitrary brand colors.
- Keep the generic content table-shaped, consistent with the existing
  `RouteLoadingSkeleton`, but keep the authentication shell self-contained so
  it does not imply that a specific route has already loaded.
- Render `AppShellSkeleton` only for `status === 'pending'`. Preserve the
  existing error message for `status === 'error'`, and render children only for
  `status === 'authenticated'`.

## Dependency Graph

```text
Task 1: AppShellSkeleton component and contract tests
    |
    +--> Task 2: AuthProvider pending-state integration and transition tests
             |
             +--> Final responsive/browser verification
```

The work is intentionally sequential. Task 2 depends on the component contract
from Task 1, and the final visual check depends on the complete transition.

## Task List

### Phase 1: Skeleton presentation contract

- [x] Task 1: Build and test the pure full-app shell skeleton.

### Checkpoint: Presentation

- [x] The focused component test proves the shell is one accessible busy state.
- [x] No links, buttons, inputs, images, or visible loading copy are rendered.
- [x] Desktop and mobile structures use the existing application breakpoints.

### Phase 2: Authentication integration

- [x] Task 2: Replace the pending authentication text with `AppShellSkeleton`.

### Final Checkpoint

- [x] Pending authentication shows the skeleton and withholds application
      children.
- [x] Successful authentication removes the skeleton and renders children.
- [x] Failed initialization still renders the existing login-server error.
- [ ] Light/dark and mobile/desktop browser checks show no structural overflow
      or interactive controls in the skeleton.
- [x] Focused tests, focused ESLint, typecheck, and `git diff --check` pass.
- [x] The full test suite and production build are not run unless focused
      verification reveals a cross-cutting issue or the reviewer requests them.

## Verification Strategy

### Automated

```powershell
npm exec vitest run src/layouts/app-shell/AppShellSkeleton.test.tsx src/contexts/AuthProvider.test.tsx
npm exec eslint -- src/layouts/app-shell/AppShellSkeleton.tsx src/layouts/app-shell/AppShellSkeleton.test.tsx src/contexts/AuthProvider.tsx src/contexts/AuthProvider.test.tsx --max-warnings 0
npm run typecheck
git diff --check
```

### Browser

- Hold the mocked Keycloak initialization promise pending and refresh the app.
- Check light and dark themes at 320, 768, 1024, and 1440 px.
- Confirm the desktop shell aligns with the live shell dimensions and the
  mobile layout contains no visible sidebar.
- Confirm no placeholder can receive keyboard focus.
- Release the authentication promise and confirm the live shell replaces the
  skeleton without an intermediate text loader.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Skeleton layout drifts from the live app shell | Medium | Copy only the structural layout classes and cover desktop/mobile regions in the component test and browser check |
| Live shell dependencies execute before authentication | High | Keep `AppShellSkeleton` self-contained; never render `AppSidebar`, `AppHeader`, router links, or `UserMenu` |
| Placeholder controls appear interactive | Medium | Use non-interactive `div` elements, hide decoration from assistive technology, and assert absence of interactive roles |
| Loading state becomes inaccessible after removing visible text | High | Give the outer status a localized accessible name and `aria-busy="true"` |
| Error behavior changes accidentally | Medium | Separate pending and error branches explicitly and add an error regression assertion |
| Mobile displays a ghost sidebar or horizontal overflow | Medium | Match the live shell's `lg` boundary and verify 320/768 px widths |

## Out of Scope

- Route-specific loading skeletons.
- Delayed loading indicators or timing heuristics.
- Rendering real navigation labels, logo, search, user data, or controls.
- Changing `login-required`, Keycloak redirects, profile loading, or token
  storage.
- Moving profile loading behind the authenticated render.
- Redesigning the authenticated `AppShell` or `RouteLoadingSkeleton`.
- Committing the `.superpowers/brainstorm` HTML mockups as production assets.

## Open Questions

None. Variant A and the shared, route-independent shell are approved.
