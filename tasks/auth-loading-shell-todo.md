# Todo: Pure Full-App Authentication Skeleton

## Task 1: Build the pure shell skeleton

**Description:** Add a self-contained `AppShellSkeleton` that mirrors the
responsive structure of the current application shell while rendering only
decorative placeholder shapes.

**Acceptance criteria:**

- [x] Desktop renders sidebar, header, page heading, toolbar, and table-shaped
      placeholders using existing semantic design tokens.
- [x] Mobile omits the closed sidebar and keeps the header/content full width.
- [x] The outer element is one localized busy status; all visual shapes are
      non-interactive decoration with no visible loading copy.

**Verification:**

- [x] Run `npm exec vitest run src/layouts/app-shell/AppShellSkeleton.test.tsx`.
- [x] Run `npm exec eslint -- src/layouts/app-shell/AppShellSkeleton.tsx src/layouts/app-shell/AppShellSkeleton.test.tsx --max-warnings 0`.
- [ ] Inspect at 320, 768, 1024, and 1440 px in light and dark themes.

**Dependencies:** None.

**Files likely touched:**

- `src/layouts/app-shell/AppShellSkeleton.tsx`
- `src/layouts/app-shell/AppShellSkeleton.test.tsx`

**Estimated scope:** Small (2 files).

## Checkpoint: Presentation contract

- [x] Component test confirms `role="status"`, a localized accessible name,
      and `aria-busy="true"`.
- [x] Component test confirms there are no links, buttons, inputs, or images.
- [ ] Browser inspection confirms the shell follows the live layout without
      horizontal overflow.

## Task 2: Integrate the skeleton into authentication startup

**Description:** Replace only the pending branch in `AuthProvider` with the new
shell skeleton and lock down pending, success, and error transitions in the
existing provider tests.

**Acceptance criteria:**

- [x] An unresolved Keycloak initialization renders `AppShellSkeleton` and not
      application children or visible `Loading` text.
- [x] Successful initialization and profile loading remove the skeleton before
      rendering authenticated children.
- [x] Initialization failure retains the existing login-server error message.

**Verification:**

- [x] Run `npm exec vitest run src/contexts/AuthProvider.test.tsx src/layouts/app-shell/AppShellSkeleton.test.tsx`.
- [x] Run `npm exec eslint -- src/contexts/AuthProvider.tsx src/contexts/AuthProvider.test.tsx src/layouts/app-shell/AppShellSkeleton.tsx src/layouts/app-shell/AppShellSkeleton.test.tsx --max-warnings 0`.
- [ ] Refresh with Keycloak initialization held pending, then release it and
      inspect the transition to the live application shell.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/contexts/AuthProvider.tsx`
- `src/contexts/AuthProvider.test.tsx`

**Estimated scope:** Small (2 files).

## Final Checkpoint

- [x] Run both focused Vitest files together.
- [x] Run focused ESLint for all four affected files.
- [x] Run `npm run typecheck`.
- [ ] Verify light/dark at 320, 768, 1024, and 1440 px.
- [ ] Verify no skeleton element receives keyboard focus.
- [x] Run `git diff --check` and inspect staged files before the atomic commit.
- [x] Do not run the complete test suite or production build unless focused
      verification exposes a cross-cutting failure or the reviewer requests it.
