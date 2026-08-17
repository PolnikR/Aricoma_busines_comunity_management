# ABCO Frontend Technology Stack

## Document Status

- **Scope:** Current frontend implementation
- **Recorded:** 2026-07-20
- **Source of truth:** Repository configuration and application source
- **Application type:** Client-side single-page application (SPA)

This document records technologies that are currently present in the ABCO frontend repository. Planned backend services, authentication, production infrastructure, and GitLab CI/CD are explicitly separated from the implemented stack.

## Stack Summary

| Area | Technology | Declared version | Purpose |
|---|---|---:|---|
| UI runtime | React | 19.2.7 | Component rendering and UI composition |
| Language | TypeScript | 6.0.2 | Strict static typing for application and tests |
| Build and development | Vite | 8.1.1 | Development server and production bundling |
| Styling | Tailwind CSS | 4.3.2 | Utility-first responsive styling and design tokens |
| Routing | React Router | 7.18.1 | Client-side navigation and nested application routes |
| Server-state management | TanStack React Query | 5.101.2 | API fetching, in-memory caching, retry, and stale-data handling |
| Runtime validation | Zod | 4.4.3 | Validation of data entering the frontend API boundary |
| Topology visualization | React Flow (`@xyflow/react`) | 12.11.2 | Interactive infrastructure topology rendering |
| Graph layout | ELK (`elkjs`) | 0.11.1 | Automatic layered positioning of topology nodes |
| Unit tests | Vitest | 4.1.10 | Unit and component test runner |
| Component tests | Testing Library | 16.3.2 | DOM-oriented React component testing |
| Test DOM | jsdom | 29.1.1 | Browser-like environment for automated tests |
| Static analysis | ESLint | 10.6.0 | Type-aware linting and import validation |
| Container build | Node.js Alpine | 22.23.1 | Reproducible dependency installation and frontend build |
| Container runtime | Nginx Alpine | 1.27.5 | Static file serving, SPA fallback, caching, and health endpoint |
| Container platform | Docker | Dockerfile-based | Local and deployable production image |

Versions above reflect declarations in `package.json` and pinned container versions in `Dockerfile`. JavaScript dependencies use npm lockfile resolution through `npm ci`.

## Frontend Runtime

### React and TypeScript

The application uses React function components and TypeScript with strict compiler checks. Important TypeScript settings include:

- `strict`;
- `noUncheckedIndexedAccess`;
- `exactOptionalPropertyTypes`;
- `noImplicitReturns`;
- `noUncheckedSideEffectImports`;
- `forceConsistentCasingInFileNames`.

Third-party declaration checking is skipped through `skipLibCheck` because React Flow declarations were produced against an earlier TypeScript version. Project source remains strictly checked.

### Vite

Vite provides:

- the local development server;
- React Fast Refresh;
- TypeScript-aware production bundling;
- Tailwind CSS integration;
- lazy-loaded route chunks.

The Infrastructure route is lazy-loaded so React Flow and ELK do not increase the initial Virtual Machines bundle.

### React Router

`BrowserRouter` provides client-side routing. Nginx is configured with an `index.html` fallback so direct navigation or browser refresh on routes such as `/discovery-inventory/infrastructure` does not return HTTP 404.

## Styling and UI

Tailwind CSS 4 is integrated through `@tailwindcss/vite`. The global theme in `src/index.css` defines:

- responsive breakpoints;
- typography scales;
- semantic color palettes;
- error, warning, success, and brand tokens;
- shadows and reusable utility classes;
- reduced-motion behavior.

Reusable UI primitives are located under `src/shared/components`. Feature-specific components remain colocated within their feature. A component moves to `shared` only when it has more than one real consumer.

The current application shell and component styling are based on the locally licensed TailAdmin-derived design foundation, adapted to the ABCO product structure.

## Data and API Layer

### TanStack React Query

React Query manages remote server state in browser memory. Global query defaults are:

```ts
staleTime: 60_000
retry: 1
```

This provides:

- one minute of fresh cached data;
- one automatic retry after a failed request;
- refetch of stale active queries under standard React Query lifecycle events;
- preservation of the previous Virtual Machines page while a new page is loading.

The query cache is not persisted to local storage or IndexedDB. A full browser refresh creates a new in-memory cache.

### Zod Validation Boundary

Discovery data is fetched and validated at the shared Discovery Inventory API boundary. UI components do not directly import the JSON fixture. The current data flow is:

```text
JSON fixture now / backend API later
  -> HTTP fetch
  -> Zod validation
  -> canonical discovery model
  -> feature-specific mapper or pagination
  -> React Query
  -> UI
```

Replacing the fixture with a real endpoint should remain localized to the shared API implementation and its validation schema.

## Infrastructure Topology

React Flow renders the topology canvas, controls, MiniMap, custom node types, and edges. ELK calculates automatic layered graph positions.

The current topology derives these relationships from discovery data:

- Cluster to Host;
- Host to Virtual Machine;
- Virtual Machine to Datastore.

The topology is read-only. Application dependencies, recovery tiers, execution order, RTO/RPO, and persisted manual positions require authoritative backend contracts and are not inferred by the frontend.

## Source Architecture

The frontend follows a feature-oriented structure:

```text
src/
  app/                         application providers, routes, and module configuration
  layouts/                     reusable application shell
  features/                    domain-oriented feature slices
    discovery-inventory/
      api/                     shared discovery fetch and validation boundary
      model/                   canonical discovery types
      virtual-machines/        paginated VM inventory
      infrastructure/          topology domain, mapping, layout, and UI
    module-placeholder/        routed API-ready module placeholders
  shared/                      reusable components, icons, and utilities
  test/                        shared test setup
  types/                       third-party runtime declarations
```

Data fetching remains in API hooks, domain transformations remain in mappers and models, and UI components focus on presentation and user interaction.

## Testing and Quality Gates

### Automated Tests

Vitest runs in jsdom with Testing Library matchers. The current tests cover:

- discovery API validation and failures;
- server-side-style Virtual Machines pagination and filtering simulation;
- topology mapping;
- topology filtering;
- React Flow view-model creation;
- ELK layout behavior;
- infrastructure API behavior;
- shared fetch error presentation and retry interaction.

### Static Quality

ESLint uses:

- JavaScript recommended rules;
- strict type-aware TypeScript rules;
- stylistic type-aware TypeScript rules;
- React Hooks rules;
- React Refresh rules;
- unresolved import validation through `eslint-plugin-import-x`.

The complete local quality gate is:

```powershell
npm run check
```

It executes linting, tests, TypeScript checking, and the Vite production build.

## Container Runtime

The Docker image uses a multi-stage build:

1. Node.js installs exact lockfile dependencies with `npm ci` and produces `dist`.
2. Nginx serves only the production output.

Nginx provides:

- static file delivery;
- immutable caching for hashed assets;
- no-store behavior for `index.html`;
- React Router fallback;
- `/health` returning HTTP 200 for container monitoring.

The image does not contain the development server or the build-stage `node_modules`.

## Security Posture

Current security-related controls include:

- strict TypeScript and ESLint checks;
- runtime validation of external discovery data with Zod;
- lockfile-based dependency installation;
- isolated multi-stage container build;
- pinned Node.js and Nginx container versions;
- container health check;
- no frontend persistence of API credentials or query cache.

These controls do not replace a security pipeline, authentication, authorization, secure backend validation, vulnerability management, or production monitoring.

## Planned but Not Implemented

### GitLab CI/CD

GitLab is the selected CI/CD platform, but the repository does not currently contain `.gitlab-ci.yml`.

A future GitLab pipeline is expected to run platform-neutral project commands and add:

- deterministic dependency installation;
- lint, tests, TypeScript, and production build;
- dependency vulnerability scanning;
- secret detection;
- static application security testing;
- Docker image build;
- container image and OS package scanning;
- software bill of materials generation;
- controlled publication to the GitLab Container Registry.

The exact implementation depends on whether the target is GitLab.com or a self-managed GitLab instance, available license tier, runner configuration, and registry policy.

### Backend and Identity

The following are not part of the current frontend repository:

- production backend implementation;
- database;
- user authentication;
- authorization and RBAC enforcement;
- secret vault integration;
- production observability and SIEM integration;
- deployment manifests and production hosting topology.

Frontend route visibility must not be treated as authorization. Access control must be enforced by the backend.

## Development Commands

```powershell
npm ci
npm run dev
npm run lint
npm run test
npm run typecheck
npm run build
npm run check
```

Local production container:

```powershell
docker build -t abco-fe:local .
docker run -d --name abco-fe -p 8080:80 abco-fe:local
```

Application URL: `http://localhost:8080`

Health URL: `http://localhost:8080/health`

