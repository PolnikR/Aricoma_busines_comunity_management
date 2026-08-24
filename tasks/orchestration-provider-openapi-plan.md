# Implementation Plan: OpenAPI-Aligned Orchestration Providers

## Overview

Align the platform-provider feature with the current generated OpenAPI
`OrchestrationProvider` and `OrchestrationProviderRecord` contracts. The list
must load every platform provider returned by the backend, including SMTP,
without an AIRFLOW-only request filter or an AIRFLOW-only validation guard.
The table, detail drawer, JSON view, form state, and submit path must preserve
the optional SMTP fields introduced by the API.

## Confirmed Root Cause

`GET /get_platform_providers` now defaults to `type=all` and returns both
AIRFLOW and SMTP records. The frontend currently filters the request to
`AIRFLOW`, defines `PLATFORM_PROVIDER_TYPES` as only `AIRFLOW`, and rejects any
mapped record whose type is not `AIRFLOW`. The hand-written schema also omits
`fromEmail`, `disableSsl`, and `disableTls` and keeps fields required that are
optional in OpenAPI.

## Architecture Decisions

- Treat the generated `OrchestrationProvider` and
  `OrchestrationProviderRecord` Zod schemas/types as the contract source of
  truth; do not duplicate provider-type literals in feature code.
- Request the platform-provider collection without a type filter so the
  backend's OpenAPI-defined `all` behavior is used.
- Keep only UI-specific normalization outside the generated schema: optional
  strings become display-safe values where a controlled input requires a
  string, while the validated raw record remains available for JSON output.
- Carry `dagDir`, `fromEmail`, `disableSsl`, and `disableTls` through the model,
  form state, submit payload, table/detail presentation, and tests.
- Use provider options exposed by the generated schema rather than a manually
  maintained AIRFLOW/SMTP array.

## Dependency Graph

```text
Generated OpenAPI orchestration-provider schema
                    |
                    v
Feature model and validation aliases
                    |
                    v
API mapping and submit payload
                    |
                    v
Form state and table/detail display
                    |
                    v
Focused verification
```

## Task 1: Make generated schemas the feature contract

**Description:** Replace the AIRFLOW-only feature type and duplicated Zod
field definitions with types/schemas derived from generated OpenAPI output.
Keep the small credential-status refinement because OpenAPI currently exposes
that value as a nullable string.

**Acceptance criteria:**

- [ ] SMTP records validate without a custom type exception.
- [ ] Optional/null `dagDir`, `credentialId`, and IP fields follow OpenAPI.
- [ ] `fromEmail`, `disableSsl`, and `disableTls` exist in feature record/write
      types and no provider-type literal array is maintained manually.

**Verification:**

- [ ] Focused schema/model tests cover AIRFLOW and the real SMTP response
      shape.
- [ ] The new SMTP test fails before production changes and passes afterward.

**Dependencies:** None

**Files likely touched:**

- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`
- `src/features/platform-administration/platform-providers/api/schemas/platformProvidersSchema.ts`

**Estimated scope:** Medium (3 files)

## Task 2: Load and submit every OpenAPI orchestration provider

**Description:** Remove the hardcoded AIRFLOW request parameter and mapper
guard. Map all generated fields into the feature record and include the same
fields in submit payloads without losing null values.

**Acceptance criteria:**

- [ ] GET uses `/api/get_platform_providers` without `type=AIRFLOW`.
- [ ] A mixed AIRFLOW + SMTP response resolves successfully and returns both
      records.
- [ ] Submit/update preserves SMTP fields and still rejects malformed OpenAPI
      payloads.

**Verification:**

- [ ] Focused API tests cover mixed list response and SMTP submit payload.
- [ ] Direct read-only API check confirms the current mixed backend response
      parses through the same schema.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Estimated scope:** Small (2 files)

## Checkpoint: Contract and data flow

- [ ] Model/schema and API tests pass together.
- [ ] No AIRFLOW-only filter, guard, or manually duplicated platform type list
      remains.
- [ ] Typecheck and focused ESLint pass.

## Task 3: Display and edit the OpenAPI fields without data loss

**Description:** Extend controlled form state and provider presentation with
the optional SMTP fields. Render common columns safely when a provider has no
DAG directory or credential, and show all orchestration-specific values in the
detail drawer/JSON view. Form validation follows generated optionality rather
than AIRFLOW-only requirements.

**Acceptance criteria:**

- [ ] SMTP provider appears in the table and detail drawer without a load
      error; missing DAG/credential values render as `-`.
- [ ] SMTP `fromEmail`, `disableSsl`, and `disableTls` values are visible and
      survive opening and submitting the edit form.
- [ ] Provider type choices come from generated schema metadata, not a local
      literal list.

**Verification:**

- [ ] Focused table test renders the real SMTP response.
- [ ] Focused form/modal tests cover SMTP initialization and submit payload.
- [ ] Existing AIRFLOW form/table tests remain green.

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- locale files only if existing labels cannot be reused

**Estimated scope:** Large; implement as form-state and display substeps

## Task 4: Focused final verification and atomic commit

**Description:** Run the complete platform-provider contract, API, hook, form,
modal, and table test set, then typecheck and lint only changed files. Inspect
the final diff for generated-file edits and unrelated changes before commit.

**Acceptance criteria:**

- [ ] Mixed AIRFLOW + SMTP loading, display, edit, submit, and delete response
      parsing are covered.
- [ ] No generated file is edited manually.
- [ ] Only orchestration-provider files and necessary tests/locales are
      committed.

**Verification:**

- [ ] Run focused Vitest paths for the platform-provider feature.
- [ ] `npm run typecheck`.
- [ ] Changed-file ESLint with zero warnings.
- [ ] `git diff --check` and clean task diff after commit.

**Dependencies:** Tasks 1-3

**Files likely touched:** No new production files beyond focused cleanup

**Estimated scope:** Small (verification)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Generated `ProviderType` also contains infrastructure types | Medium | Derive validation from OpenAPI as requested and keep endpoint ownership in the platform-provider API; cover actual mixed backend payload in tests |
| Optional fields break controlled inputs | Medium | Normalize only at the form boundary and preserve raw nullable values in API records |
| Editing SMTP silently drops new fields | High | Add form-state and submit-payload regression tests before implementation |
| AIRFLOW behavior regresses | Medium | Keep existing AIRFLOW tests in every focused verification run |

## Open Questions

None for the proposed scope: SMTP is included in list, detail, JSON, create,
and edit flows so the existing Edit action cannot silently lose SMTP fields.
