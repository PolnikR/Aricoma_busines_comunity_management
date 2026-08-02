# React Router 8.3 Migration Notes

## Status

The application has been migrated from `react-router-dom@7.18.2` to a direct,
exact dependency on `react-router@8.3.0`.

The migration resolves the `npm audit` advisory
[GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2).
The affected unstable RSC mode was not used by this application, but upgrading
removes the audit finding and the obsolete v7 compatibility package.

## Package and runtime changes

- Removed `react-router-dom`.
- Added exact dependency `react-router@8.3.0`.
- Added `engines.node: >=22.22.0` to `package.json`.
- Added `.nvmrc` with Node `22.23.1`, matching the Docker build image.
- Regenerated `package-lock.json`.

React Router 8 is ESM-only and requires Node 22.22.0 or newer and React 19.2.7
or newer. The project already uses ESM, React 19.2.7, Vite 8, and Node 22.23.1
in Docker.

## Import migration

The actual current scope was 29 source and test files, not the 17 files in the
original prospective notes.

- `RouterProvider` is imported from `react-router/dom`.
- All other router components and hooks are imported from `react-router`.
- Vitest mocks and dynamic import types now target `react-router`.
- No `react-router-dom` references remain in `src`.

No route definitions, hooks, navigation logic, or application behavior were
intentionally changed.

## Verification results

Verification used Node `22.23.1` and a clean isolated `npm ci` installation:

- ESLint: passed with zero allowed warnings.
- TypeScript project build: passed.
- Vitest: 133 test files passed, 479 tests passed.
- Vite 8.1.5 production build: passed; 570 modules transformed.
- `npm audit`: 0 vulnerabilities.
- Runtime HTTP smoke test: `/` and
  `/recovery-plans/recovery-groups` both returned HTTP 200 and the application
  root element; the Vite server emitted no stderr.

The build retains a pre-existing large-chunk warning for the bundled ELK asset.
It is unrelated to React Router and is outside this migration's scope.

An interactive Chrome DevTools smoke test was not run because the DevTools MCP
connector was unavailable in the session. Automated tests cover router
creation, navigation consumers, search-parameter hooks, and the unsaved-change
guard. A human review may additionally exercise browser back/forward behavior,
active sidebar links, dynamic detail routes, and confirmation when leaving a
dirty form.

## Environment note

The existing working-copy `node_modules` directory was locked by long-running
Windows Node/editor processes, so the initial local `npm ci` could not remove
native modules. Verification was therefore performed in a clean isolated copy
of the same working tree. This does not affect the committed package or
lockfile; opening a fresh terminal/editor session before the next local
`npm ci` should release the stale handles.
