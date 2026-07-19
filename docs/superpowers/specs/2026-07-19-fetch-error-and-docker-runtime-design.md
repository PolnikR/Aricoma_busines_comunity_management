# Fetch Error UI and Docker Runtime Design

## Scope

This change standardizes connection and fetch failures on the Virtual Machines and Infrastructure pages and makes the Vite application runnable as a local Docker Desktop container.

ELK topology layout errors remain separate because they are client-side processing failures rather than backend connection failures.

## Shared Fetch Error Component

Create a shared `FetchErrorAlert` component under `src/shared/components/fetch-error-alert/`.

The component accepts:

- a concise title;
- an optional technical description;
- a retry callback;
- retry progress state;
- a presentation mode for either a full initial failure or a compact stale-data warning.

Both modes use the existing Tailwind error tokens, a visible error icon, `role="alert"`, descriptive text, and a keyboard-accessible retry button. The compact mode fits above an existing data card. The initial mode occupies the page content area without pretending that cached data exists.

## Page Integration

Virtual Machines and Infrastructure use the same component in two situations:

1. Initial request failure with no data: show the full mode, the actual normalized error message, and a retry action.
2. Refresh or pagination failure with previous data available: keep the successful data visible and show the compact mode explaining that the displayed data is the latest successful result.

The retry button is disabled and changes its label while React Query is fetching. Existing loading skeletons and empty-result states are unchanged.

## Docker Runtime

Use a multi-stage `Dockerfile`:

1. A pinned Node Alpine stage installs dependencies with `npm ci` and runs the production build.
2. A pinned Nginx Alpine stage serves the generated `dist` directory.

Add an Nginx configuration with:

- `try_files $uri $uri/ /index.html` for React Router routes;
- long-lived immutable caching for hashed assets;
- no-cache headers for `index.html`;
- a lightweight `/health` endpoint for local container checks.

Add `.dockerignore` so local dependencies, build output, Git metadata, editor files, and documentation are not sent to the Docker build context.

The image is intended to run locally with:

```powershell
docker build -t abco-fe .
docker run --rm -p 8080:80 abco-fe
```

The application is then available at `http://localhost:8080`.

## Verification

- Component tests cover the compact mode, initial mode, retry action, and disabled retry state.
- Existing application tests continue to pass.
- ESLint, TypeScript, and the Vite production build pass.
- Docker image builds successfully when Docker Desktop is available.
- Container `/health`, root route, and a nested React Router route return successful responses.

