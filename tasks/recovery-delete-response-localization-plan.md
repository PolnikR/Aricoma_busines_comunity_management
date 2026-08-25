# Implementation Plan: Recovery Delete Responses and Rollback Localization

## Overview

Preserve the complete rollback report returned after deleting an orchestrated
Recovery Application, while retaining the generated Orval client and generated
`RecoveryAppsResponse` envelope validation. Then align every rollback-related
UI string used by Recovery Group and Recovery Application result flows across
English, Czech, and Slovak so the UI never falls back to raw translation keys.

The frontend-only change follows the already-working Recovery Group parsing
pattern. It does not manually edit generated Orval files or the downloaded
OpenAPI document.

## Confirmed Current Behavior

- OpenAPI declares `RollbackReport` with required `status` and
  `additionalProperties: true`.
- The generated TypeScript model preserves additional fields through
  `[key: string]: unknown`.
- The generated Orval Zod schema uses `zod.object({ status: ... })` and strips
  additional fields during parsing.
- Recovery Group avoids the data loss by validating its generated response
  envelope, then parsing `payload.rollback` from the original payload with a
  local `z.looseObject` schema.
- Recovery Application currently reparses `parsed.rollback`, after the
  generated schema has already reduced it to `{ status }`.
- The result components request translation keys that are absent from at least
  one locale, including Group `resultTitle`, `resultSubtitle`, and `status`,
  and Application `title` and `subtitle`.
- Existing Recovery Group rollback strings in the Czech and Slovak catalogs
  are substantially still English.

## Architecture Decisions

- Keep the generated Orval request function and generated
  `RecoveryAppsResponse` validation. Only the permissive part of the OpenAPI
  contract is recovered from the original payload after envelope validation.
- Parse original `payload.rollback` with the existing application-owned
  `rollbackReportSchema`. Do not edit `src/generated/**`; regeneration would
  overwrite such edits.
- Do not manually widen `openapi/abco-api.json`. The source contract already
  permits additional rollback properties, and the checked-in document is an
  API pull artifact.
- Mirror the Recovery Group implementation locally instead of introducing a
  shared abstraction for two small call sites.
- Treat English as the source catalog. Czech and Slovak must contain the same
  rollback key sets with natural localized values; product and provider names
  such as Airflow and IBM FlashCopy remain unchanged.
- Preserve backend status values and raw response JSON verbatim. Localization
  applies to UI labels and explanatory copy, not machine response fields.

## Dependency Graph

```text
Task 1: Preserve full Recovery Application rollback payload
    |
    +--> Task 3: Verify complete result modal behavior
    |
Task 2: Align EN/CZ/SK rollback catalogs
    |
    +--> Task 3: Verify complete result modal behavior
```

Tasks 1 and 2 are logically independent but should be implemented
sequentially in the same worktree because both feed Task 3 and each must end in
an atomic commit.

## Task List

### Phase 1: Response contract

- [ ] Task 1: Preserve the complete Recovery Application rollback report.

### Phase 2: Localization contract

- [ ] Task 2: Align every Recovery Group and Recovery Application rollback
      string in EN, CZ, and SK.

### Checkpoint: Data and copy contracts

- [ ] The app API test proves nested and unknown rollback fields survive.
- [ ] Existing Recovery Group delete parsing tests remain green.
- [ ] All three locale JSON files parse and expose identical rollback key sets.
- [ ] Task 1 and Task 2 are committed separately without staging unrelated
      worktree changes.

### Phase 3: Result presentation

- [ ] Task 3: Verify complete localized result modals for both entity types.

### Final Checkpoint

- [ ] Focused API, modal, and table tests pass together.
- [ ] Changed TypeScript/TSX files pass focused ESLint.
- [ ] Typecheck passes if test or production TypeScript files changed.
- [ ] `git diff --check` passes and the staged diff contains only task files.
- [ ] The complete suite and production build are not run unless focused
      verification reveals cross-cutting risk or the user requests them.

## Detailed Tasks

## Task 1: Preserve the complete Recovery Application rollback report

**Description:** Add a regression test that reproduces the truncation with a
realistic orchestrated-delete response, then change
`deleteRecoveryApplication` to validate the generated response envelope while
parsing rollback details from the original payload with the existing permissive
application schema.

**Acceptance criteria:**

- [ ] An orchestrated delete returns the complete rollback object, including
      `airflow`, `ibm`, and unknown future top-level or nested properties.
- [ ] The generated `RecoveryAppsResponse` contract still rejects an invalid
      applications envelope, and the local rollback schema still requires a
      string `status`.
- [ ] A regular delete still returns `rollback: null`; request parameters and
      application mapping do not change.

**Verification:**

- [ ] Tests pass:
      `npm exec vitest run src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`.
- [ ] Existing comparison test passes:
      `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`.
- [ ] Focused lint passes for the changed API and test files.
- [ ] Commit only Task 1 files with a descriptive atomic commit.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Small — 2 files

## Task 2: Align rollback localization across EN, CZ, and SK

**Description:** Inventory both rollback namespaces, add every missing key used
by the current result dialogs, and replace untranslated Czech and Slovak values
with reviewed localized copy. Add a focused catalog contract test so future
changes cannot leave one locale without a rollback key.

**Acceptance criteria:**

- [ ] `recoveryGroups.rollback.*` has an identical key set in EN, CZ, and SK,
      including `resultTitle`, `resultSubtitle`, and `status`.
- [ ] `recovery.application.rollback.*` has an identical key set in EN, CZ,
      and SK, including `title` and `subtitle`.
- [ ] Czech and Slovak values are localized rather than copied wholesale from
      English; placeholders such as `{groupName}` and `{applicationName}` are
      preserved exactly where used.

**Verification:**

- [ ] The three locale files parse as JSON.
- [ ] Focused catalog test passes:
      `npm exec vitest run src/locales/recoveryRollbackTranslations.test.ts`.
- [ ] `git diff --check` reports no malformed whitespace or encoding damage.
- [ ] Commit only Task 2 files with a descriptive atomic commit.

**Dependencies:** None

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/cs.json`
- `src/locales/sk.json`
- `src/locales/recoveryRollbackTranslations.test.ts` (new)

**Estimated scope:** Medium — 4 files

## Task 3: Verify complete localized result modals

**Description:** Add focused Recovery Application modal coverage and tighten
the existing Recovery Group modal coverage where necessary. Prove that the
known rollback sections and full raw response are visible and that actual
locale providers resolve dialog titles and subtitles instead of displaying
translation keys.

**Acceptance criteria:**

- [ ] The Recovery Application result displays status, Airflow, IBM, and the
      complete raw rollback JSON received from Task 1.
- [ ] Both result dialogs resolve their title, subtitle, section labels, status
      banner, response-body label, and close action without exposing raw i18n
      keys in EN, CZ, or SK.
- [ ] Existing clean/partial status classification and delete-table modal
      opening behavior remain unchanged.

**Verification:**

- [ ] Tests pass:
      `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`.
- [ ] Delete integration tests pass:
      `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`.
- [ ] Focused ESLint and TypeScript typecheck pass.
- [ ] Manually inspect one complete application report and one group report in
      each language when a runnable backend or fixture-driven UI is available.
- [ ] Commit only Task 3 files with a descriptive atomic commit.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx` (new)
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`
- Production modal files only if a failing test identifies a real rendering
  defect beyond the response truncation and missing translations.

**Estimated scope:** Small to Medium — 2 test files, production changes only if
required by a reproduced failure

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A future Orval release changes handling of `additionalProperties` | Low | Keep the local extraction covered by a regression test; remove it only after generated Zod demonstrably preserves the payload |
| The backend returns a new rollback section | Medium | Top-level and nested loose schemas preserve unknown fields in the raw response; known checklist sections remain intentionally limited |
| Locale keys drift again | Medium | Add a focused key-parity test for both rollback namespaces |
| Translation wording changes machine values | High | Localize labels only; never translate the backend response object |
| Unrelated dirty Vitest setup files are accidentally committed | High | Stage explicit task paths and inspect the staged diff before every commit |

## Out of Scope

- Backend/Pydantic schema changes.
- Manual edits to generated Orval files or the downloaded OpenAPI artifact.
- Redesigning the shared `ChecklistResultDialog` or response-body viewer.
- Translating backend status values or modifying rollback operations.
- Adding checklist summaries for unknown future rollback sections; they remain
  visible in the complete raw response.

## Open Questions

None. The approved direction is to preserve Orval transport and envelope
validation, recover fields permitted by `additionalProperties: true` from the
original payload, and fully align both rollback namespaces across EN, CZ, and
SK.
