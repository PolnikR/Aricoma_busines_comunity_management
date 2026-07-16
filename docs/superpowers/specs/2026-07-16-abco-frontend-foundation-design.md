# ABCO frontend foundation design

## Goal

Create a production-oriented React and TypeScript frontend foundation for the first three ABCO areas. The first working vertical slice displays the existing fake VMware inventory response. Containerization follows only after the browser application works and passes all quality checks.

## Scope

The initial application navigation contains:

1. Platform Administration
2. Providers & Connectors
3. Discovery & Inventory
   - Virtual Machines
   - Infrastructure

Platform Administration, Providers & Connectors, and Infrastructure initially use explicit not-yet-implemented states. Virtual Machines is the first functional screen.

Recovery Plans and the other ABCO epics are outside this first implementation slice. The structure must allow them to be added later without reorganizing existing features.

## Technical foundation

- React 19 with TypeScript 6 and Vite 8
- strict TypeScript compiler configuration
- type-aware ESLint with zero tolerated warnings
- React Router for client-side navigation
- Ant Design for the application shell and enterprise UI components
- TanStack Query for server-state loading and caching
- Zod for runtime validation at the API boundary
- Vitest and React Testing Library for automated tests

The frontend is a client-side application. It communicates only with the ABCO backend interface and never directly with Airflow, infrastructure providers, or a database.

## Source organization

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ providers.tsx
│  ├─ router.tsx
│  └─ routes.ts
├─ layouts/
│  └─ AppLayout/
├─ features/
│  ├─ platform-administration/
│  ├─ providers-connectors/
│  └─ discovery-inventory/
│     └─ virtual-machines/
├─ shared/
│  ├─ api/
│  ├─ components/
│  ├─ config/
│  ├─ validation/
│  └─ utils/
└─ main.tsx
```

Feature-specific API functions, models, validation, components, pages, and tests remain inside their feature. Only code with multiple real consumers moves to `shared`.

## Routes

```text
/                                      redirects to /discovery-inventory/virtual-machines
/platform-administration               placeholder
/providers-connectors                  placeholder
/discovery-inventory/virtual-machines  working inventory screen
/discovery-inventory/infrastructure    placeholder
/*                                     not-found screen
```

Route identifiers and navigation definitions have one authoritative source so paths are not repeated throughout components.

## Application shell

The shared shell contains a persistent left navigation, a compact header, breadcrumbs, and the current page content. The first three areas are visible. Discovery & Inventory is expandable and contains Virtual Machines and Infrastructure.

The visual direction is an enterprise operations console: light content surfaces, compact data presentation, restrained status colors, and a dark blue navigation area. The shell must support loading, empty, error, not-found, and not-yet-implemented states consistently.

## Fake API boundary

The existing `apiResponse.json` contains `count` and 151 VM records. It is copied into the project as a development fixture and served over HTTP. React components do not import the JSON directly.

```text
HTTP fixture
  → shared HTTP client
  → VM endpoint function
  → Zod response validation
  → internal VM model
  → TanStack Query hook
  → Virtual Machines page
```

The endpoint location is supplied through configuration. Replacing the fixture with the real ABCO backend must not require changing the table or detail components.

The response exposes VM placement information from which hosts, clusters, datastores, folders, and disks can be derived. It is not treated as a complete infrastructure inventory because it does not contain authoritative standalone infrastructure resources.

## Virtual Machines screen

The first screen provides:

- loading, error, retry, empty, and populated states;
- count of discovered virtual machines;
- search across VM name, hostname, and IP address;
- filters for power state, connection state, host, and cluster;
- a compact table with VM identity, status, operating system, compute, placement, storage summary, and snapshots;
- a row-driven VM detail panel without losing the current list state.

Large nested disk arrays are shown in the detail panel rather than expanded inside table rows.

## Validation and error handling

External JSON is `unknown` until Zod validates it. Invalid top-level data blocks the inventory view and produces a controlled error state. Validation failures must not silently discard records.

The UI does not expose raw stack traces. Developer diagnostics may be written to the console in development, but discovered annotations and infrastructure data are treated as untrusted content and rendered only as text.

## Testing and quality gates

Each completed step must keep these commands passing:

```text
npm run lint
npm run typecheck
npm run build
```

Automated tests cover response validation, API-to-model mapping, loading/error/empty page states, filtering, and selection of a VM detail. Tests do not depend on exact layout pixels.

## Containerization

Docker is introduced only after the frontend slice works locally. A multi-stage build runs dependency installation and the quality/build commands in a Node image. The resulting static `dist` directory is served by an unprivileged web server image with SPA fallback to `index.html`.

No secret is placed in Vite client environment variables or baked into the image. The production API configuration approach must support the target ABCO deployment environment.

## Implementation order

1. Confirm the strict toolchain checkpoint.
2. Create the application folders and minimal route definitions.
3. Add global providers and routing.
4. Add the Ant Design application shell and placeholders.
5. Add the fake HTTP fixture and runtime schema.
6. Implement the VM query and internal model boundary.
7. Implement the VM inventory states, table, filters, and detail.
8. Add automated tests and complete quality checks.
9. Add the production container build and runtime serving configuration.

