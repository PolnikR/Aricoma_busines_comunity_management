# Implementation Plan: Generated Runtime API Contracts

## Goal

Finish the Orval adoption by using generated Zod response schemas as the
runtime source of truth for stable backend endpoints. Remove duplicate
feature-owned response schemas that can drift from OpenAPI, while preserving
feature domain models, mappers, form validation, cache behavior and the manual
`/credentials/pubkey` encryption flow.

## Architecture Decisions

- Stable wire responses are validated exactly once with schemas generated in
  `src/generated/api/zod.gen.ts`.
- Feature API modules remain adapters: generated wire data is mapped to stable
  frontend/domain models instead of leaking generated models into components.
- Form validation and business rules remain feature-owned; they are not API
  response contracts and must not be generated.
- Discovery payload schemas remain feature-owned where OpenAPI intentionally
  exposes dynamic vendor records as `unknown`.
- Contract failures use one shared parser that includes the operation and Zod
  issue path, so the UI does not reduce schema drift to `Unknown error`.
- `/credentials/pubkey` remains manual and excluded from Orval generation.

## Dependency Graph

```text
OpenAPI snapshot
    -> generated Orval Zod schemas
        -> shared response parser/error
            -> feature API adapters
                -> existing hooks and UI/domain models
```

## Task 1: Add the shared generated-response boundary

**Description:** Add a typed parser for generated Zod schemas and a diagnostic
contract error. This creates one response-validation/error pattern for all
stable API modules.

**Acceptance criteria:**

- [ ] Valid payloads are returned with generated Zod defaults applied.
- [ ] Invalid payloads throw an error containing the operation and failing path.
- [ ] HTTP errors continue to use the existing `OrvalApiError` handling.

**Verification:**

- [ ] Focused unit test proves valid and invalid parsing behavior.
- [ ] Shared API tests pass.

**Dependencies:** None.

**Files likely touched:**

- `src/shared/api/generatedResponse.ts`
- `src/shared/api/generatedResponse.test.ts`

**Estimated scope:** Small.

## Task 2: Fix Recovery Applications against the generated contract

**Description:** Reproduce the current backend response (including a nested
recovery group without `description` and an extra top-level `rollback`) and
replace the handwritten list/submit response schemas with generated ones.
Adapt the generated wire model to the existing application domain model without
inventing missing descriptions.

**Acceptance criteria:**

- [ ] The supplied current `get_recovery_apps` response loads successfully.
- [ ] Missing `recovery_group.description` is not treated as a contract error.
- [ ] Invalid generated-contract data reports the exact response path.
- [ ] Submit responses use the generated `applications` envelope and preserve
      current local/orchestrated domain behavior.

**Verification:**

- [ ] Regression test fails before the implementation and passes afterwards.
- [ ] Recovery Applications API, mapper and UI tests pass.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`

**Estimated scope:** Medium.

## Checkpoint: Recovery Applications

- [ ] Focused tests pass.
- [ ] Typecheck passes for the completed slice.
- [ ] The error state exposes contract diagnostics rather than `Unknown error`.

## Task 3: Migrate stable provider and credential responses

**Description:** Replace duplicate response schemas for providers, platform
providers and credentials with generated schemas. Keep submit/form validation
and explicit adapters for nullable backend fields.

**Acceptance criteria:**

- [ ] List/write/delete responses are parsed by generated schemas.
- [ ] Domain models receive deliberate defaults or nullable mappings.
- [ ] Credential public-key retrieval and encryption remain manual.

**Verification:**

- [ ] Provider, platform-provider and credential API tests pass.
- [ ] Typecheck passes after the slice.

**Dependencies:** Task 1.

**Estimated scope:** Medium per feature slice.

## Task 4: Migrate stable Recovery Plans responses

**Description:** Replace duplicate response schemas for Recovery Groups,
Policy Sets, snapshot policies, application-recovery policies and clean-room
policies. Preserve feature input/business schemas and domain mappers.

**Acceptance criteria:**

- [ ] Generated schemas validate all stable read/write responses.
- [ ] Recovery Group rollback details remain available through the feature
      adapter even though the generated report intentionally pins only status.
- [ ] No response schema is duplicated in feature folders.

**Verification:**

- [ ] Focused API tests pass after each feature migration.
- [ ] Typecheck passes after the slice.

**Dependencies:** Task 1.

**Estimated scope:** Medium per feature slice.

## Task 5: Classify discovery schemas and remove only true duplicates

**Description:** Compare discovery response schemas with generated OpenAPI
schemas. Use generated schemas where the contract is exact; retain and document
feature-owned normalization where vendor payloads are intentionally dynamic.

**Acceptance criteria:**

- [ ] Exact VMware/tag responses use generated runtime schemas.
- [ ] Dynamic FlashSystem/Power payload schemas remain local only when the
      generated contract is too permissive to protect the mapper.
- [ ] Every retained local response schema has an explicit reason.

**Verification:**

- [ ] Discovery API and mapper tests pass.
- [ ] Typecheck passes after the slice.

**Dependencies:** Task 1.

**Estimated scope:** Medium.

## Task 6: Cleanup, generation drift and complete verification

**Description:** Remove unused response exports/imports, confirm the manual and
generated boundaries, then run the repository's full quality gate.

**Acceptance criteria:**

- [ ] No stable response schema duplicates generated Orval schemas.
- [ ] Form/business validation schemas remain feature-owned.
- [ ] `/credentials/pubkey` remains manual and unique.
- [ ] Generated output matches the committed OpenAPI snapshot.

**Verification:**

- [ ] `npm run api:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm exec vite build`
- [ ] `git diff --check`

**Dependencies:** Tasks 2-5.

**Estimated scope:** Small.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| OpenAPI omits data the UI previously accepted | High | Do not invent fields; surface contract gap and keep domain fields optional where the backend omits them. |
| Generated nullable fields conflict with strict domain types | Medium | Normalize explicitly in feature adapters and test the chosen defaults. |
| Zod strips undocumented response properties | Medium | Test current backend fixtures; require OpenAPI to declare fields the UI must preserve. |
| Dynamic discovery contracts are over-constrained | Medium | Retain local vendor normalization only where generated schemas use unknown records. |
| Large migration hides regressions | High | Implement and verify one feature slice at a time. |

## Out of Scope

- Replacing feature-owned React Query hooks with generated hooks.
- Changing backend OpenAPI definitions from the frontend repository.
- Generating `/credentials/pubkey` or changing WebCrypto behavior.
- Keeping compatibility with undocumented legacy Recovery Application shapes.

## Open Questions

None blocking. The current committed OpenAPI snapshot is the contract for this
migration; missing response fields must be added by the backend if the UI needs
to preserve them.
