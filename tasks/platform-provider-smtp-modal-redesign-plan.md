# Implementation Plan: SMTP Provider Modal Redesign

## Overview

Redesign the existing read-only SMTP platform-provider modal so it visually
follows the established provider connection-test dialog. The SMTP modal will
reuse the shared `ChecklistResultDialog`, render the requested SMTP summary
fields in the dialog's card language, and expose the complete provider object
returned by `GET /get_platform_providers` through the shared collapsible
`ResponseBodyViewer` with Copy support.

The change remains frontend-only and read-only. It will not execute a
connection test, add request state, or display a misleading test-success bar.

## Confirmed Behavior

- Clicking the existing `SMTP` action opens the redesigned modal for the
  currently selected SMTP provider.
- The modal uses the same shared shell as `ProviderConnectionTestDialog`:
  title, provider header, badges, scrollable content, response-body panel, and
  full-width Close action follow the same layout.
- The visible SMTP summary presents `name`, `fromEmail`, `disableSsl`, and
  `disableTls` as four scan-friendly cards.
- Boolean values remain explicit (`true` / `false`); missing optional values
  use the existing `-` placeholder convention.
- The header shows the provider name and ID, an `SMTP` type badge, and a
  Source/Target role badge when `role` is present.
- `Response body` starts expanded and contains the complete original provider
  record from `GET /get_platform_providers`, including nullable fields and any
  schema fields not used by the normalized UI model.
- Copy uses the existing shared JSON viewer behavior and copies the formatted
  full provider JSON.
- No success banner, passed count, check status, retry action, or network call
  is introduced for SMTP details.
- Closing the modal restores the already selected provider drawer, preserving
  the current flow.

## Architecture Decisions

- Keep `ChecklistResultDialog` as the shared modal. It already supports custom
  informational content, optional status/check sections, raw response data,
  and the standard footer, so no speculative shared-component refactor is
  planned.
- Keep `SmtpProviderDetailsDialog` presentational. It maps one
  `PlatformProviderRecord` into header metadata, four summary cards, and
  `toPlatformProviderJson(provider)` for the response body.
- Use `toPlatformProviderJson` rather than `JSON.stringify(provider)` directly.
  Its shared raw-record path preserves the backend record when `rawRecord` is
  available and falls back safely to the normalized record for local fixtures.
- Do not attach test-result semantics to SMTP values. The cards communicate
  field labels and values, not pass/fail state.
- Preserve the existing `PlatformProvidersTable` ownership of selected-provider
  and modal visibility state unless a failing integration test demonstrates a
  required change.

## Dependency Graph

```text
Existing ChecklistResultDialog + ResponseBodyViewer
                         |
                         v
      SMTP presentation contract test (RED)
                         |
                         v
       SmtpProviderDetailsDialog redesign (GREEN)
                         |
                         v
     Focused component + integration verification
```

## Task Tracking

The repository normally tracks implementation tasks in GitHub Issues. This
request authorized a local implementation plan, but external issue publication
was not authorized, so no GitHub issue was created. This document is the task
record until the user explicitly authorizes publication.

## Task List

### Phase 1: SMTP modal vertical slice

1. Redesign the SMTP provider modal using the shared connection-test dialog
   shell.

### Task 1: Redesign the SMTP provider modal

**Description:** Add a failing component test for the agreed SMTP modal
contract, then minimally update `SmtpProviderDetailsDialog` to render the four
SMTP summary cards and the complete provider response using the existing shared
dialog and JSON viewer.

**Acceptance criteria:**

- [ ] Header renders provider name, ID, SMTP badge, and the role badge when the
      API record supplies a role.
- [ ] Four cards render `name`, `fromEmail`, `disableSsl`, and `disableTls`,
      preserving explicit boolean values and missing-value placeholders.
- [ ] Expanded `Response body` contains the complete raw provider object and
      its Copy action writes the same formatted JSON.
- [ ] Modal contains no connection-test success, passed-count, check-status,
      retry, or request behavior.
- [ ] Existing table integration still opens this modal for the selected SMTP
      provider and restores the drawer on Close.

**Verification:**

- [ ] RED: the focused SMTP dialog test fails for the missing cards/full JSON
      before production code changes.
- [ ] GREEN: `npm exec vitest run src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx`
- [ ] Integration: `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- [ ] Shared regression: `npm exec vitest run src/shared/components/modal/ChecklistResultDialog.test.tsx src/shared/components/response-body/ResponseBodyViewer.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx`
- [ ] Focused ESLint passes for changed TypeScript/TSX files with zero warnings.
- [ ] `git diff --check` passes and staged review contains only task files.

**Dependencies:** None; the required shared components already exist.

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx`
- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.tsx`

**Estimated scope:** Small (2 files). The table integration or shared dialog
will be changed only if focused RED tests prove the existing contracts are
insufficient.

## Final Checkpoint

- [ ] All acceptance criteria above are covered by focused automated tests.
- [ ] Existing provider connection-test modal output remains unchanged.
- [ ] The SMTP response viewer renders the raw API record, not a handpicked
      projection.
- [ ] Keyboard-accessible Close, Response body disclosure, and Copy controls
      remain native buttons/disclosure controls from the shared components.
- [ ] At 320, 768, 1024, and 1440 px, content remains readable and scrollable
      without obscuring the footer action.
- [ ] No console error or accessibility warning appears during the focused UI
      flow.
- [ ] Complete suite and production build are not run by default because the
      change has a reliable focused component/integration scope.
- [ ] The implementation is committed atomically without the unrelated
      pre-existing worktree changes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| SMTP details imply that a test passed | Medium | Omit status, counts, check icons, and retry controls; assert their absence |
| Normalization drops nullable/raw API fields | High | Pass `toPlatformProviderJson(provider)` and test a populated `rawRecord` |
| Card styling diverges from the reference dialog | Medium | Reuse its surface/border/spacing tokens inside the existing shared shell |
| Shared dialog regression affects connection tests | Medium | Avoid changing it unless required and run its focused consumer tests |
| Copy silently targets a projected object | Medium | Stub clipboard and assert the complete formatted raw JSON payload |
| Unrelated worktree changes enter the commit | High | Stage explicit task paths and inspect the staged diff before committing |

## Out of Scope

- Adding or calling an SMTP connection-test endpoint.
- Changing `GET /get_platform_providers`, generated API models, or backend data.
- Altering platform-provider table columns, edit/delete behavior, or non-SMTP
  provider details.
- Displaying a fake success state to reproduce connection-test semantics.
- Redesigning the shared modal for unrelated consumers.

## Open Questions

None. The approved requirement and existing shared components define the
implementation contract.
