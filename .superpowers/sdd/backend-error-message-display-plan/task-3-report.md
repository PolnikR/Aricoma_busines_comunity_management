# Task 3 report: Apply the resolver to infrastructure Providers

## Outcome

Infrastructure Provider request errors now use the Task 1 shared resolver at every scoped error surface:

- Create and edit submit failures render the shared `Alert` in the existing modal location. The localized submit title remains the title, and only a supported backend detail is rendered as its optional description.
- The provider table load and provider-detail retry states retain their existing localized titles and Retry controls, and render only an optional `extractBackendErrorDetail()` description.
- Delete failures close the confirmation dialog and display a shared table-context `Alert` with the localized delete title and optional supported backend detail.
- Connection-test transport failures resolve their message for the existing result status bar. HTTP-success results with `ok: false` continue to render their original backend check rows.

Resources, Resources ISE, generated clients, routing, and all success semantics were not modified.

## TDD evidence

### RED

Tests were added before production implementation. The focused Provider suites were run with:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx
```

The initial sandbox invocation could not resolve the configured Node installation (`EPERM: operation not permitted, lstat 'C:\Users\polnikr\nodejs'`), so the identical command was re-run with the required sandbox approval.

The approved RED run failed as expected:

```text
Test Files  4 failed (4)
Tests  7 failed | 40 passed (47)
```

The failures covered the new behaviors: submit `Alert` rendering and suppression of unsupported synthetic details; nested list/detail backend descriptions; a visible delete mutation alert; and resolved connection-test transport detail. The failure output showed the previous raw/synthetic text, including `Submit provider request failed with status 500`, and the previous connection-test title, `Connection test completed`.

### GREEN

After the first minimal integration, the focused run identified one deterministic `ReferenceError`:

```text
ReferenceError: setErrorMessage is not defined
at handleSubmit src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx:176:5
```

Root cause: the submit-error state had been renamed to `submitError`, but the submit-start clear still called the removed `setErrorMessage` setter. The single stale setter call was replaced with `setSubmitError(null)`; existing successful modal-submit tests guarded the correction.

The focused command was rerun successfully:

```text
Test Files  4 passed (4)
Tests  47 passed (47)
```

## Final verification

Focused ESLint command:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec -- eslint src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx --max-warnings 0
```

Output: exit code 0; no diagnostics.

Typecheck command:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' run typecheck
```

Output:

```text
> abcm-fe@0.0.0 typecheck
> tsc -b
```

Exit code: 0.

Whitespace validation command:

```powershell
git diff --check
```

Output: exit code 0; no output.

The complete test suite and production build were not run because this task is limited to the four focused Provider component/page suites; focused verification follows `AGENTS.md`.

## Files changed

- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`
- `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx`
- `.superpowers/sdd/backend-error-message-display-plan/task-3-report.md`

## Self-review

- Confirmed mutation alerts keep the existing localized contextual titles; supported backend detail is description-only and unsupported backend bodies do not add synthetic/status-only detail.
- Confirmed table/detail fetch states keep their existing localized titles and Retry controls, with descriptions omitted when the extractor returns no detail.
- Confirmed delete failure is visible in table context after the confirmation dialog closes.
- Confirmed connection transport errors use the shared resolver, while the pre-existing `ok: false` check-list test remains green.
- Confirmed the diff contains no Resources, Resources ISE, generated-client, routing, or success-path changes.
