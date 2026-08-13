# Orval integration: implementation phases

## Goal

Use the backend OpenAPI contract to generate the frontend API wire types and Zod schemas. The generated code represents the HTTP contract only. Existing form validation, domain/UI models, mapping functions, `apiFetch`, and React Query cache logic remain under frontend control unless a later phase explicitly replaces them.

The OpenAPI document is provided by the published backend, for example:

```text
http://10.99.99.54:8000/openapi.json
```

Generation happens during development or CI. The production browser application must not download OpenAPI or dynamically construct Zod schemas at runtime.

## Current OpenAPI state

Most POST request schemas already exist:

- `Provider`
- `OrchestrationProvider`
- `Credential`
- `SnapshotPolicy`
- `RecoveryAppPolicy`
- `CleanRoomPolicy`
- `PolicySet`
- `RecoveryGroup`

Before Orval can provide a complete contract, the backend must still add:

1. Explicit response models for successful responses. Current `200` responses contain an empty `"schema": {}`.
2. A concrete request model for `POST /submit_recovery_dag`. It currently accepts an unrestricted object with `additionalProperties: true`.
3. Any VM metadata fields that the backend is expected to preserve in `RecoveryVM`, such as `order`, `hostname`, `ip_address`, `os`, `cpu`, `memory_gb`, and `storage_gb`.

The backend source must define Pydantic response models and assign them through FastAPI `response_model`. The generated `openapi.json` must not be edited manually.

## Phase 1: Generated contracts and Zod validation

### Implement

- Add Orval as a development dependency.
- Store Orval configuration in the frontend repository.
- Pull or otherwise obtain a controlled OpenAPI snapshot from the published backend.
- Generate API request types, response types, query/header parameter types, and Zod schemas.
- Place generated artifacts in a dedicated directory such as `src/generated/api`.
- Mark generated files clearly and never edit them manually.
- Replace handwritten API boundary schemas incrementally with generated schemas.
- Start with a small vertical slice, preferably providers and credentials.

### Keep unchanged

- `apiFetch` and automatic `X-User` injection.
- Existing React Query hooks and query keys.
- Feature-specific error handling.
- Form schemas and form validation.
- Domain/UI models and mapping functions.

### Data flow

```text
Form schema
  -> form data
  -> feature mapper
  -> generated request contract
  -> apiFetch
  -> unknown JSON response
  -> generated response Zod schema
  -> feature mapper
  -> domain/UI model
```

### Complete when

- Providers and credentials use generated request/response contracts at the API boundary.
- Runtime parsing still validates all external JSON as `unknown`.
- Existing feature tests, lint, typecheck, and build pass.
- Generated models are not imported directly into UI components.

## Phase 2: Automated contract checks in CI

### Implement

- Add explicit scripts, for example `api:pull`, `api:generate`, and `api:check`.
- Make generation deterministic by pinning the Orval and Zod target versions.
- Verify in CI that generation produces no uncommitted differences.
- Run typecheck and tests after generation.
- Fail CI when the stored OpenAPI snapshot and generated artifacts are out of sync.

### Recommended stability rule

Production builds should use a committed or otherwise version-pinned OpenAPI snapshot. They should not depend on the current availability or mutable state of the remote backend.

```text
published backend /openapi.json
  -> intentional api:pull
  -> reviewed OpenAPI snapshot
  -> api:generate
  -> generated contracts
  -> api:check in CI
```

### Project commands

```bash
npm run api:pull      # downloads and validates the remote OpenAPI snapshot
npm run api:generate  # generates the client, models and Zod schemas from the snapshot
npm run api:update    # runs api:pull followed by api:generate
npm run api:check     # checks the pull script and generated-file synchronization offline
```

`api:pull` uses `http://10.99.99.54:8000/openapi.json` as the default
development endpoint. Set `ABCO_OPENAPI_URL` to use another endpoint. The
downloaded document is validated before it is written; HTTP, JSON or OpenAPI
validation failures leave the existing `openapi/abco-api.json` unchanged.

`api:check` intentionally never downloads the live contract. CI and production
builds therefore use only the reviewed snapshot committed to Git.

### Complete when

- A backend contract change produces a visible generated diff.
- Breaking changes fail typecheck or contract tests before deployment.
- A production build can complete without contacting the backend OpenAPI endpoint.

## Phase 3: Generated API client

This phase is optional. Start it only after phases 1 and 2 are stable and manual request construction is demonstrably repetitive or error-prone.

### Implement when useful

- Generate typed endpoint functions for paths, methods, request bodies, query parameters, and responses.
- Configure an Orval mutator or adapter that delegates requests to the existing `apiFetch` behavior.
- Preserve `X-User`, default headers, proxy paths, error handling, and runtime response validation.
- Migrate one feature at a time instead of replacing the entire API layer at once.

### Do not proceed when

- The generated client cannot preserve the existing authentication/identity headers.
- Error behavior becomes inconsistent with the current feature API functions.
- The generated abstraction makes domain mapping harder to understand.

### Complete when

- Selected features no longer manually construct URLs and query strings.
- Their request behavior, errors, headers, and tests remain equivalent.
- No UI component depends directly on generated HTTP response objects.

## Phase 4: Generated React Query hooks

This phase is also optional. Implement it only for queries and mutations that are mostly mechanical wrappers around an endpoint.

### Good candidates

- Simple list queries.
- Simple detail queries.
- Mutations whose only follow-up is a predictable query invalidation.

### Keep handwritten

- Hooks with functional cache updates.
- Dependent or conditional queries with domain-specific rules.
- Cross-feature invalidation.
- Optimistic updates with custom rollback behavior.
- Hooks that map API records into domain models.

### Complete when

- Generated hooks reduce repeated code without hiding cache behavior.
- Existing query keys and invalidation semantics remain predictable.
- Tests cover caching, retries, invalidation, and error propagation.

## Phase 5: Generated mocks and test fixtures

Implement this phase when the project needs backend-independent integration tests or an explicitly enabled local mock mode.

### Implement

- Generate contract-aligned mock data or MSW handlers where supported.
- Keep generated mocks out of the production runtime path.
- Extend generated base fixtures with scenario-specific test builders.
- Cover success, validation error, authorization error, empty list, and malformed response scenarios.

### Constraints

- Do not restore implicit application-wide mock interception.
- Do not treat generated random data as a substitute for meaningful feature test cases.
- Mock responses must remain valid against the same generated response schemas used by production API parsing.

### Complete when

- Integration tests can run without the published backend.
- Mock handlers and fixtures follow the current OpenAPI contract.
- Production builds contain no enabled mock server behavior.

## Recommended delivery order

1. Backend completes the missing response models and the `submit_recovery_dag` request model.
2. Implement phase 1 for providers and credentials.
3. Evaluate the generated code and mapping boundaries.
4. Extend phase 1 to policies, policy sets, recovery groups, recovery applications, and inventory.
5. Add phase 2 CI enforcement.
6. Adopt phases 3 to 5 only when their concrete maintenance benefit exceeds the migration cost.

Phases 1 and 2 are the production foundation. Phases 3, 4, and 5 are optional optimizations and should be introduced from measured project needs rather than as prerequisites for Orval adoption.
