# Implementation Plan: Orval API Contract Generation

## Goal

Introduce Orval as the generated HTTP-contract layer for the existing frontend,
using a committed OpenAPI snapshot as the reproducible source. Preserve the
current feature hooks, React Query cache behavior, UI/domain models, mappers and
runtime behavior. The `/credentials/pubkey` operation is explicitly excluded
from generation and remains implemented manually in `credentialsCrypto.ts`.

## Confirmed Decisions

- The backend OpenAPI document is the source of truth for generated request and
  response contracts.
- Generation runs from a committed local snapshot, never directly from the
  live backend during a normal build.
- Generate typed fetch functions and Zod schemas, but retain the existing
  feature-owned React Query hooks and cache invalidation logic.
- Generated files live under `src/generated/api` and are not edited manually.
- The custom Orval fetch mutator delegates transport concerns to the existing
  `apiFetch`, including the locked `X-User` header and `/api` proxy prefix.
- `/credentials/pubkey` is removed only from the code-generation input. The
  original OpenAPI snapshot and the manual WebCrypto flow remain intact.
- Migration is incremental. A manual API implementation is removed only after
  its generated replacement has tests and no remaining references.

## Architecture

```text
openapi/abco-api.json
        |
        | filtered for codegen: omit /credentials/pubkey
        v
orval.config.ts
        |
        +--> src/generated/api/client      typed endpoint functions
        +--> src/generated/api/models      generated TypeScript contracts
        +--> src/generated/api/schemas     generated Zod schemas

feature hooks / cache rules / mappers
        |
        v
generated endpoint functions
        |
        v
shared Orval mutator -> apiFetch -> /api/*

credentialsCrypto.ts -> manual GET /credentials/pubkey -> WebCrypto
```

## Task 1: Establish and validate the OpenAPI snapshot

- Copy the supplied backend OpenAPI document to `openapi/abco-api.json`.
- Add a deterministic preprocessing/transform step that removes exactly
  `/credentials/pubkey` from Orval input without modifying the snapshot.
- Validate that every `$ref` resolves and the important submit/read schemas are
  present before generation.

Acceptance criteria:

- [ ] The snapshot is committed and parseable as OpenAPI 3.1.
- [ ] Only `/credentials/pubkey` is absent from generated operations.
- [ ] The snapshot still documents `/credentials/pubkey` for humans.
- [ ] Missing references fail generation with a clear error.

## Task 2: Add Orval configuration and scripts

- Add a pinned Orval development dependency.
- Add `orval.config.ts` with separate typed fetch-client and Zod outputs.
- Configure deterministic names/paths and Zod v4 generation.
- Add package scripts for generation and drift checking.
- Exclude generated source from ESLint style rules while keeping it in the
  TypeScript build.

Acceptance criteria:

- [ ] `npm run api:generate` succeeds from a clean checkout.
- [ ] A second generation produces no diff.
- [ ] `npm run api:check` fails when generated output is stale.
- [ ] No generated public-key endpoint, model-specific operation or hook exists.

## Task 3: Implement the shared Orval fetch mutator test-first

- Add unit tests for URL prefixing, query preservation, JSON/text/no-content
  responses, request bodies, `X-User` preservation through `apiFetch`, abort
  signals and non-2xx errors.
- Implement the generic mutator expected by generated fetch functions.
- Preserve useful HTTP status/body information in a shared request error.

Acceptance criteria:

- [ ] Generated operations call `/api/<backend-path>` exactly once.
- [ ] Orval cannot override the authenticated `X-User` header.
- [ ] JSON, plain text and 204 responses are handled safely.
- [ ] Non-2xx responses reject with stable diagnostic information.

## Task 4: Generate and validate the contract layer

- Generate clients, models and Zod schemas.
- Add focused contract tests for providers, credentials, Recovery Applications
  and Recovery Groups, including optional orchestrator responses.
- Verify generated files compile under strict TypeScript settings.

Acceptance criteria:

- [ ] Generated request/response types match the supplied OpenAPI definitions.
- [ ] `submit_recovery_dag` includes `provider_id`,
  `push_to_orchestrator` and the request body contract.
- [ ] GET Recovery Applications uses `applications` and preserves
  `policy_set_id`, Airflow fields and nested groups/resources.
- [ ] Public-key encryption remains exclusively manual.

## Task 5: Pilot migration — providers and credentials

- Replace manual provider and credential HTTP implementations with generated
  endpoint functions.
- Retain feature hooks, cache keys, form types, mappers and UI error states.
- Keep `credentialsCrypto.ts` unchanged for public-key retrieval/encryption.
- Update tests to assert generated request paths, query/header/body contracts
  and unchanged user-visible behavior.

Acceptance criteria:

- [ ] Provider list/create/edit/delete behavior and cache updates are unchanged.
- [ ] Credential list/create/edit/delete behavior is unchanged.
- [ ] Credential submit still receives the browser-encrypted password.
- [ ] No call to `/credentials/pubkey` comes from generated code.

## Task 6: Migrate the remaining stable feature APIs incrementally

Migrate in isolated checkpoints:

1. Platform providers.
2. Recovery policies and policy sets.
3. Recovery Groups, including submit/delete/rollback response variants.
4. Recovery Applications, including both orchestrator push modes.
5. Discovery APIs grouped by VMware, IBM Power and FlashSystem.

For each slice:

- add/adjust API contract tests first;
- replace only the transport call;
- preserve feature-owned transformation and cache logic;
- remove obsolete manual schemas/constants only after reference search;
- run focused tests before proceeding.

Acceptance criteria:

- [ ] No feature imports generated contracts directly into UI components.
- [ ] Dynamic vendor payload normalization remains feature-owned where the
  OpenAPI schema is intentionally permissive.
- [ ] Existing retry, loading, error and cache behavior remains unchanged.
- [ ] Manual endpoint definitions are removed only when unused.

## Task 7: Final cleanup and verification

- Search for duplicate request/response types and obsolete endpoint constants.
- Confirm the only manual credential contract is public-key retrieval.
- Run generation drift check and the complete project quality gate.
- Review the final diff for accidental generated or behavioral churn.

Verification:

- [ ] `npm run api:generate`
- [ ] `npm run api:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm exec vite build`
- [ ] `git diff --check`

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| OpenAPI changes create a very large diff | Pin Orval, commit the snapshot, use deterministic output and migrate feature slices independently. |
| Generated hooks break custom cache behavior | Generate fetch functions only; keep existing feature React Query hooks. |
| `/credentials/pubkey` gets generated with an incorrect JSON contract | Remove that exact path in the codegen transform and add a negative generation test/search. |
| Generated endpoint URLs bypass the Vite `/api` proxy | Central mutator prepends `/api` and has URL contract tests. |
| Error handling changes silently | Centralize a typed HTTP error and retain feature-level UI error tests. |
| Runtime response differs from OpenAPI | Use generated Zod at stable boundaries and preserve existing feature mappers for permissive/vendor-specific payloads. |
| Generated code fails lint rules intended for handwritten code | Ignore only `src/generated/**` in lint; keep it included in typecheck and builds. |

## Out of Scope

- Replacing the current React Query hooks with Orval-generated hooks.
- Changing authentication or Keycloak integration.
- Changing the public-key WebCrypto implementation.
- Fetching the live OpenAPI document automatically during normal builds.
- Refactoring UI/domain models merely to mirror backend naming.

## Open Questions

None blocking. The supplied OpenAPI document will be used as the initial local
snapshot, and the public-key operation will remain manual as requested.
