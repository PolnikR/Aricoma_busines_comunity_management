# Task 4 report: Apply the resolver to Credentials

## RED

Before production changes, ran:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/providers-connectors/TableMutationError.test.tsx
```

Result: 4 files failed; 9 tests failed and 8 passed. The expected failures showed that the public-key request threw an ordinary status-only error, the modal rendered that raw status text, the table omitted nested detail, and the delete alert rendered the wrapper status text.

## GREEN

After the production changes, the same focused command passed: 4 files, 17 tests.

Final focused regression command:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/credentials/api/credentialsApi.test.ts src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/providers-connectors/TableMutationError.test.tsx
```

Result: 5 files passed, 21 tests passed.

## Results

- The credential modal now uses the shared `Alert` with the localized credential failure title and an optional resolver-supported backend detail.
- Credential list failures retain the `DataTableRequestState` retry UI and include optional nested backend detail.
- Credential delete errors use the shared alert with optional nested FastAPI `detail[]` text.
- The public-key fetch parses an error body only for JSON content types, throws `OrvalApiError` with that unknown JSON body, and therefore lets the shared resolver promote supported string or FastAPI validation detail.
- HTML, plain text, invalid JSON, and unsupported JSON retain an API-error chain but resolve to the localized credential fallback without exposing raw content or status-only text.
- PEM loading, Web Crypto encryption, and public-key cache reset semantics are unchanged.

## Files changed

- `src/features/providers-connectors/credentials/api/credentialsCrypto.ts`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts`
- `src/features/providers-connectors/credentials/components/CredentialCreateModal.tsx`
- `src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx`
- `src/features/providers-connectors/TableMutationError.test.tsx`
- `.superpowers/sdd/backend-error-message-display-plan/task-4-report.md`

## Verification

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec eslint -- src/features/providers-connectors/credentials/api/credentialsCrypto.ts src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.tsx src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/providers-connectors/TableMutationError.test.tsx
& 'C:\Users\polnikr\nodejs\npm.cmd' run typecheck
git diff --check
```

Results: focused ESLint passed with no output; `tsc -b` passed; `git diff --check` passed.

## Self-review

- Confirmed the changes use the existing shared resolver and `Alert`/`DataTableRequestState` patterns without modifying shared resolver code.
- Confirmed all display paths avoid raw wrapper messages and status-only text; only recognized backend detail is used as an optional description.
- Confirmed no generated clients, Resources, Resources ISE, or unrelated shared code changed.
- Chrome DevTools MCP is not configured in this session; UI behavior is covered by focused React component tests rather than a live-browser session.

## Fix round 1

### RED

Before production changes, ran:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx
```

Output: 2 files failed; 2 tests failed and 13 passed. `application/not-json` exposed `Proxy diagnostics must stay private.` instead of the localized fallback, and an edit submission rendered `Credential could not be created securely.` instead of the edit-specific title.

### GREEN

After production changes, ran:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx
```

Output: 2 files passed, 15 tests passed.

Final amended focused regression command:

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec vitest run src/features/providers-connectors/credentials/api/credentialsApi.test.ts src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/providers-connectors/TableMutationError.test.tsx
```

Output: 5 files passed, 23 tests passed.

### Verification

```powershell
& 'C:\Users\polnikr\nodejs\npm.cmd' exec eslint -- src/features/providers-connectors/credentials/api/credentialsCrypto.ts src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts src/features/providers-connectors/credentials/components/CredentialCreateModal.tsx src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx
$localePaths = @('src/locales/en.json', 'src/locales/sk.json', 'src/locales/cs.json'); $referenceKeys = (ConvertFrom-Json -AsHashtable -InputObject (Get-Content -Raw $localePaths[0])).Keys; foreach ($localePath in $localePaths[1..2]) { $localeKeys = (ConvertFrom-Json -AsHashtable -InputObject (Get-Content -Raw $localePath)).Keys; $difference = Compare-Object -ReferenceObject $referenceKeys -DifferenceObject $localeKeys; if ($difference) { throw "Locale keys differ in ${localePath}: $($difference | Out-String)" } }
& 'C:\Users\polnikr\nodejs\npm.cmd' run typecheck
git diff --check
```

Output: focused ESLint passed with no output; locale JSON parse and key parity passed with no output; `tsc -b` passed; `git diff --check` passed.

### Files changed

- `src/features/providers-connectors/credentials/api/credentialsCrypto.ts`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts`
- `src/features/providers-connectors/credentials/components/CredentialCreateModal.tsx`
- `src/features/providers-connectors/credentials/components/CredentialCreateModal.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- `.superpowers/sdd/backend-error-message-display-plan/task-4-report.md`

### Scope note

- Cache-reset coverage was not changed in this fix round; it remains ledgered for final triage as requested.
