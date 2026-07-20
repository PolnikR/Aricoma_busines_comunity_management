# Implementation Plan: Fetch Error UI and Docker Runtime

## Overview

Implement the approved shared fetch error experience for Virtual Machines and Infrastructure, then package the Vite SPA for local Docker Desktop execution through Nginx.

## Architecture Decisions

- Keep fetch error presentation in one shared component so all data pages use the same accessible Tailwind styling and retry behavior.
- Preserve page-specific messages in page containers while the shared component owns presentation only.
- Serve the production Vite build through Nginx with an SPA route fallback.

## Task List

### Phase 1: Shared UI

#### Task 1: Create and test `FetchErrorAlert`

**Acceptance criteria:**

- Compact and full presentations render with `role="alert"`.
- Retry is keyboard accessible and calls the supplied callback.
- Retry is disabled and visibly reports progress while fetching.

**Verification:**

- Run the focused component test.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/fetch-error-alert/FetchErrorAlert.tsx`
- `src/shared/components/fetch-error-alert/FetchErrorAlert.test.tsx`

**Estimated scope:** Small

#### Task 2: Integrate both data pages

**Acceptance criteria:**

- Initial fetch failures use the full shared alert.
- Failed refreshes retain existing data and use the compact shared alert.
- Existing loading and empty states remain unchanged.

**Verification:**

- Run lint, tests, and TypeScript checks.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage.tsx`
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`

**Estimated scope:** Small

### Checkpoint: Shared UI

- All UI tests pass.
- Both pages compile with no duplicated fetch alert markup.

### Phase 2: Docker Runtime

#### Task 3: Add production container files

**Acceptance criteria:**

- Docker builds the application with `npm ci` and `npm run build`.
- Nginx serves static assets and falls back to `index.html` for nested routes.
- Build context excludes local and generated files.

**Verification:**

- Build the Docker image.
- Start the container and request `/health`, `/`, and `/discovery-inventory/virtual-machines`.

**Dependencies:** Task 2

**Files likely touched:**

- `Dockerfile`
- `docker/nginx.conf`
- `.dockerignore`

**Estimated scope:** Medium

### Checkpoint: Complete

- `npm run check` passes.
- Docker image builds when Docker Desktop is running.
- Health and SPA routes return successful responses.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Docker Desktop daemon is unavailable | Docker runtime cannot be executed locally | Validate Docker files statically and report the exact unavailable check |
| Direct nested routes return 404 | Refreshing a routed page fails | Configure Nginx `try_files` fallback |
| Error messages overflow on mobile | Retry action becomes hard to use | Stack content and action on small screens |

## Open Questions

None. The approved specification resolves the implementation choices.

