# React Router v8 Migration Notes

## Background

`npm audit` reports a high-severity advisory against `react-router`:

- **Advisory:** [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) — RSC Mode CSRF Bypass Allows Action Execution Before 400 Response
- **Vulnerable range:** `react-router` 7.12.0 - 8.2.x
- **Patched version:** `react-router@8.3.0`
- **Currently installed:** `react-router-dom@7.18.2` (pulls in `react-router@7.18.2`)

### Does this affect us?

No. The advisory only affects apps using react-router's unstable RSC (React Server Components) mode. This app uses plain client-side routing (`createBrowserRouter` + `RouterProvider`), which is not the affected code path. This is a real CVE, but not one this app's usage can trigger.

### Why `npm audit fix --force` isn't the answer

`react-router-dom` has not published a release beyond `7.18.2` — it never picked up the patched `react-router@8.3.0`. Because of that, `npm audit fix --force` can only "fix" the report by downgrading `react-router-dom` to `7.11.0` (below the vulnerable range), which is a real regression (loses 7.12-7.18 changes) for a vulnerability we're not exposed to anyway.

## The actual fix path: drop `react-router-dom`, depend on `react-router` directly

In `react-router@8.0.0`, the `react-router-dom` package was removed entirely. Its DOM-specific exports (`RouterProvider`, `HydratedRouter`) moved to `react-router/dom`; everything else moved into the base `react-router` package. This means the patched `8.3.0` release is only available if we migrate off `react-router-dom` onto `react-router` + `react-router/dom`.

This is a legitimate, low-risk migration — not a hack — but it wasn't necessary given the CVE doesn't apply to us, so it's being tracked here as an optional/future task rather than done immediately.

## Scope of the change

Import-path swap only. No logic, hook usage, or routing behavior changes needed.

**17 files** — swap `'react-router-dom'` → `'react-router'` (same named imports):

| File | Imports |
|---|---|
| `src/__tests__/language-switching.integration.test.tsx` | `BrowserRouter` |
| `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx` | `useNavigate`, `useParams` |
| `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx` | `useNavigate` |
| `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx` | `MemoryRouter` |
| `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx` | `useNavigate`, `useParams` |
| `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx` | `useNavigate` |
| `src/app/createAppRouter.ts` | `createBrowserRouter`, `createRoutesFromElements` |
| `src/app/AppRoutes.tsx` | (route element helpers) |
| `src/shared/hooks/useUnsavedChangesGuard.ts` | `useBlocker` |
| `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx` | `useNavigate` |
| `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx` | `useNavigate`, `useParams` |
| `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx` | `useNavigate` |
| `src/features/discovery-inventory/virtual-machines/hooks/useVirtualMachineSearchParams.ts` | `useSearchParams` |
| `src/layouts/app-shell/AppSidebar.tsx` | `NavLink`, `useLocation` |
| `src/layouts/app-shell/AppSidebar.test.tsx` | `MemoryRouter` |
| `src/layouts/app-shell/AppShell.tsx` | `Outlet` |
| `src/features/discovery-inventory/virtual-machines/hooks/useVirtualMachineSearchParams.test.tsx` | `MemoryRouter` |

**1 file** — swap `'react-router-dom'` → `'react-router/dom'`:

| File | Imports |
|---|---|
| `src/app/router.tsx` | `RouterProvider` |

## Other requirements

- **Package change:** remove `react-router-dom`, add `react-router@^8.3.0` to `package.json` dependencies.
- **Node version:** v8.0.0 raises the minimum to Node ≥22.22.0.
  - Local dev machines: currently on `22.14.0` via nvm — needs updating.
  - Docker build: already uses `node:22.23.1-alpine`, no change needed.
- **Behavioral defaults in v8** (previously opt-in via `future.v8_*` flags, now always on): trailing-slash-aware data requests, pass-through requests, middleware always enabled. This app doesn't currently use middleware or these flags, but worth a full regression pass (`npm run build` — lint, typecheck, tests) after migrating.

## Recommendation

Optional / not urgent. The CVE doesn't affect this app's routing mode, and there's no CI gate currently failing because of it. Revisit this migration when there's a natural reason to touch routing code, or if `react-router-dom` still hasn't caught up after some time and the advisory noise becomes annoying.
