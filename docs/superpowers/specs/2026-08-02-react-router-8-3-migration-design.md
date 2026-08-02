# React Router 8.3 Migration Design

## Goal

Upgrade the client application from `react-router-dom@7.18.2` to
`react-router@8.3.0`, remove the obsolete `react-router-dom` dependency, and
retain the current client-side routing behavior.

## Constraints

- React Router 8 requires Node 22.22.0 or newer. Developers use Node 22.23.x,
  and the Docker build uses Node 22.23.1.
- The application uses React 19.2.7 and Vite 8, which satisfy the React Router
  8 baseline.
- The migration must not introduce routing, page, or state-management changes.
- Existing unrelated worktree content, including `.claude/`, remains untouched.

## Approach

Use a two-step migration so import errors can be distinguished from React
Router 8 behavior changes.

1. While the project still uses React Router 7, replace every
   `react-router-dom` import and test mock. Import `RouterProvider` from
   `react-router/dom`; import all other APIs from `react-router`. Run the full
   build at this checkpoint.
2. Remove `react-router-dom`, add exactly `react-router@8.3.0`, regenerate the
   lockfile, declare the supported Node version, and run the full verification
   suite again.

The current repository contains 29 source or test files that reference
`react-router-dom`, rather than the 17 files listed in the older migration
notes. All production imports, Vitest mocks, and type-only dynamic imports are
in scope.

## Package and Runtime Changes

- Remove `react-router-dom` from `dependencies`.
- Add `react-router` at version `8.3.0`.
- Add `engines.node` with the constraint `>=22.22.0`.
- Add `.nvmrc` containing `22.23.1` so local development matches Docker.
- Keep the Docker base image at `node:22.23.1-alpine`.

## Runtime Behavior

The application continues to use `createBrowserRouter` and `RouterProvider` as
a client-side data router. No loaders, actions, middleware, RSC mode, or React
Router framework-mode features are introduced.

React Router 8 enables its v8 future behaviors by default. The current app does
not use middleware or the affected data-request APIs, so no data-flow changes
are expected. React Router 8.3 also changes path-parameter encoding for some
RFC 3986 path-segment characters; route tests and the browser smoke test cover
navigation involving dynamic parameters.

## Error Handling and Rollback

Failures after the import-only checkpoint indicate an incorrect import or mock
conversion. Failures appearing only after the package upgrade indicate a React
Router 8 compatibility issue.

The migration remains one focused implementation change. If verification
fails, fix the identified compatibility problem before proceeding; do not mask
failures or downgrade dependencies. The preceding commit remains a clean
rollback point.

## Verification

Before editing, establish a baseline with `npm ci` and `npm run build`. Repeat
`npm run build` after the import-only checkpoint and after installing React
Router 8.3.0. The build runs lint, TypeScript checking, Vitest, and the Vite
production build.

After automated verification, perform a browser smoke test covering:

- application startup and direct loading of a nested route;
- sidebar navigation and active-link styling;
- browser back and forward navigation;
- detail routes with dynamic path parameters;
- filter state stored in query parameters;
- refresh on a nested route; and
- the unsaved-changes blocker when leaving an edited form.

Run `npm audit` after lockfile regeneration and record any remaining findings
without applying forced dependency changes.

## Documentation

Update `docs/react-router-update/migration-notes.md` to reflect the actual file
count, completed migration, Node requirement, verification results, and any
remaining audit findings.

## Success Criteria

- `react-router-dom` is absent from `package.json`, `package-lock.json`, and
  application source.
- `react-router@8.3.0` is installed directly.
- The full build passes on Node 22.23.x.
- The browser smoke-test scenarios preserve existing routing behavior.
- Migration notes describe the completed state accurately.
