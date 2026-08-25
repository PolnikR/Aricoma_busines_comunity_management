# Implementation Plan: SMTP Platform Provider Dialog

## Overview

Add an `SMTP` action to the detail drawer of platform providers whose type is
`SMTP`. The action opens the same shared dialog shell used by provider
connection-test results, but presents the selected SMTP provider's existing
schema data without making a request or implying that a connection test ran.
The provider URL is rendered as a real external link; for the supplied record,
clicking it opens `http://10.99.99.53:8025/`.

No platform-provider connection-test endpoint exists, so this feature remains
entirely read-only and uses only the already fetched provider record.

## Confirmed Behavior

- The drawer action is labelled `SMTP` and is visible only for a selected
  platform provider with `type === "SMTP"`.
- Clicking the action opens an informational dialog based on
  `ChecklistResultDialog`, the same shared dialog component used by
  `ProviderConnectionTestDialog`.
- The dialog shows `id`, `name`, `description`, `type`, `ipAddress`, `port`,
  `url`, `fromEmail`, `disableSsl`, and `disableTls` from the selected record.
- The dialog does not call an API, show retry controls, or display a
  misleading test/passed status.
- When `url` exists, it is rendered with that exact value as `href` and opens
  in a new browser tab with `noopener noreferrer`. The URL is never hardcoded.
- While the SMTP dialog is open, the detail drawer is not simultaneously open
  as a second modal. Closing the dialog returns to the same selected provider.
- Non-SMTP platform providers keep their current detail behavior and do not
  receive the action.

## Architecture Decisions

- Extend `ChecklistResultDialog` through optional, backward-compatible props:
  an optional information-content slot and an optional status bar. Existing
  connection-test callers retain their current status/check rendering.
- Add a small presentational `SmtpProviderDetailsDialog` in the platform
  provider feature. It receives one `PlatformProviderRecord`, maps the schema
  fields to accessible detail rows, and owns no request state.
- Integrate dialog visibility into `PlatformProvidersTable`; the currently
  selected record remains the single source of truth.
- Use the existing external-link convention (`target="_blank"` plus
  `rel="noopener noreferrer"`) already present in the platform-provider
  drawer.
- Add only user-facing EN/SK/CS strings needed for the SMTP action and dialog.

## Dependency Graph

```text
Information-capable shared ChecklistResultDialog
                        |
                        v
          SmtpProviderDetailsDialog
                        |
                        v
       PlatformProvidersTable integration
                        |
                        v
       Focused tests + locale verification
```

## Task 1: Support informational content in the shared dialog

**Description:** Test-first, make the shared `ChecklistResultDialog` able to
render caller-provided informational content without requiring a status bar.
Keep all existing connection-test behavior and styling unchanged.

**Acceptance criteria:**

- [ ] A caller can render information content in the established dialog shell
      while omitting the test-result status bar.
- [ ] The dialog does not render passed counts, retry controls, or empty status
      sections when those features are not supplied.
- [ ] Existing `ProviderConnectionTestDialog` output and public behavior remain
      unchanged.

**Verification:**

- [ ] RED/GREEN focused test covers information-only rendering and the absence
      of passed/test UI.
- [ ] Existing shared dialog and provider connection-test component tests pass.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/modal/ChecklistResultDialog.tsx`
- `src/shared/components/modal/ChecklistResultDialog.test.tsx`

**Estimated scope:** Small (2 files)

## Task 2: Add the SMTP provider details dialog

**Description:** Test-first, add a presentational dialog that uses the enhanced
shared dialog and renders the selected SMTP record. Render `url` as an
accessible external anchor whose destination comes directly from the provider
schema value.

**Acceptance criteria:**

- [ ] The dialog displays all ten requested SMTP fields, preserving `false`,
      `true`, zero-like values, and missing optional values accurately.
- [ ] For `url: "http://10.99.99.53:8025/"`, the link has that exact `href`,
      opens in a new tab, and includes `noopener noreferrer`.
- [ ] No fetch, mutation hook, fake progress, success state, or retry control is
      introduced.

**Verification:**

- [ ] RED/GREEN component tests cover all supplied SMTP values and missing URL.
- [ ] The URL test asserts `href`, `target`, and `rel`, not only visible text.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.tsx`
- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx`

**Estimated scope:** Small (2 files)

## Checkpoint: Dialog contract

- [ ] Tasks 1-2 focused tests pass together.
- [ ] The SMTP dialog contains no language suggesting a connection was tested.
- [ ] The URL is dynamic provider data and not a hardcoded environment value.
- [ ] Existing connection-test dialog behavior is unchanged.

## Task 3: Integrate the SMTP action into the platform-provider drawer

**Description:** Add an `SMTP` button beside the type badge for selected SMTP
providers and connect it to the informational dialog. Ensure only one modal
surface is active and restore the selected provider detail on close.

**Acceptance criteria:**

- [ ] The action appears only when the selected platform provider is SMTP.
- [ ] Clicking it opens details for that exact selected provider and performs
      no network request.
- [ ] The drawer is not open concurrently with the dialog; closing the dialog
      returns to the same provider, while Edit/Delete remain unchanged.

**Verification:**

- [ ] RED/GREEN `PlatformProvidersTable` tests cover SMTP visibility, non-SMTP
      absence, selected-record data, opening, closing, and one-dialog behavior.
- [ ] A fetch spy confirms that opening the SMTP dialog makes no request.
- [ ] Existing platform-provider drawer, JSON, Edit, and Delete tests pass.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Estimated scope:** Small (2 files)

## Task 4: Add localized labels and run focused verification

**Description:** Add matching English, Slovak, and Czech labels for the SMTP
button, dialog title, informational section, and field names not already
covered. Then run the smallest verification set proving the complete flow.

**Acceptance criteria:**

- [ ] EN/SK/CS locale files contain the same new key set.
- [ ] No raw user-facing text is embedded in the new components except schema
      values.
- [ ] The final diff contains only the SMTP dialog feature and its tests/docs.

**Verification:**

- [ ] `npm exec vitest run src/shared/components/modal/ChecklistResultDialog.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- [ ] `npm exec eslint src/shared/components/modal/ChecklistResultDialog.tsx src/shared/components/modal/ChecklistResultDialog.test.tsx src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.tsx src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx --max-warnings 0`
- [ ] `npm run typecheck`
- [ ] `git diff --check` and review `git status --short`.

**Dependencies:** Tasks 1-3

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium (3 locale files plus verification)

## Final Checkpoint

- [ ] Only SMTP platform providers expose the `SMTP` drawer action.
- [ ] The dialog reuses the connection-test dialog shell without pretending to
      run a test.
- [ ] Every requested SMTP field is visible for the selected provider.
- [ ] Clicking the schema URL opens its exact destination safely.
- [ ] No connection-test API or request state was added.
- [ ] Focused tests, focused lint, typecheck, and diff checks pass.
- [ ] Implementation changes are committed atomically and do not include
      unrelated worktree changes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| Informational data looks like a passed test | Medium | Make status bar optional and assert the absence of passed/retry text |
| URL becomes environment-specific | Medium | Read `provider.url` directly and test a non-hardcoded fixture contract |
| Drawer and dialog are active together | Medium | Gate drawer `open` with dialog state and test only one active dialog |
| Shared dialog extension regresses Test connection | Medium | Keep props optional/backward-compatible and run its existing consumer test |
| Missing optional SMTP values render incorrectly | Low | Use nullish-aware formatting and component fixtures for missing values |

## Parallelization

The work is small and shares adjacent UI contracts, so sequential execution is
safer: Task 1 enables Task 2, which enables Task 3. Locale work in Task 4 can be
prepared alongside Task 3 only after the final translation keys are fixed.

## Open Questions

None. The plan assumes the existing project convention that external provider
URLs open in a new browser tab rather than replacing the ABCO application tab.

## Tracking Note

The repository designates GitHub Issues as its task tracker. This plan does not
create or modify an external issue because the request authorizes preparation
of a plan, not publication to GitHub. The implementation checklist is kept in
this task-specific document to avoid overwriting the unrelated active
`tasks/plan.md` and `tasks/todo.md` files.
