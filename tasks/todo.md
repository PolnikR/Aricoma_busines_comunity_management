# Shared Response Body Viewer - Task Checklist

## Phase 1: Shared component

### Task 1: Create ResponseBodyViewer
- [x] Create `src/shared/components/response-body/ResponseBodyViewer.tsx`
- [x] Props: `{ data: unknown }`
- [x] Internal `copyText` helper (try/catch around `navigator.clipboard.writeText`, rejects on failure)
- [x] Copy `Button` (size `xs`, variant `outline`) toggling label via `useState` + `setTimeout` (~1400ms), same UX as the dialog's original
- [x] `<pre>` with `max-h-64 overflow-y-auto overflow-x-auto rounded-md bg-surface-subtle p-3 font-mono text-xs text-text-secondary`, content `JSON.stringify(data, null, 2)`
- [x] Add `"common.copy": "Copy"` and `"common.copied": "Copied"` to `src/locales/en.json`, `sk.json`, `cs.json`

### Task 2: Test ResponseBodyViewer
- [x] Create `src/shared/components/response-body/ResponseBodyViewer.test.tsx`
- [x] Test: renders `JSON.stringify(data, null, 2)` content
- [x] Test: clicking Copy calls `navigator.clipboard.writeText` with the formatted JSON and shows "Copied" (mock `navigator.clipboard`)
- [x] Test: clicking Copy without a mocked clipboard does not throw (fallback path)

## Phase 2: Wire into existing surfaces

### Task 3: Refactor JsonViewerModal
- [x] Open `src/shared/components/modal/JsonViewerModal.tsx`
- [x] Replace the manual `<pre>{JSON.stringify(data, null, 2)}</pre>` block with `<ResponseBodyViewer data={data} />`
- [x] Drop the now-redundant `className="flex max-h-96 flex-col overflow-hidden"` on `Modal` and the manual `overflow-y-auto` wrapper div (the shared component owns its own scroll box)

### Task 4: Refactor ProviderConnectionTestDialog
- [x] Open `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`
- [x] Remove the local `copyText` function, `justCopied` state, and the inline Copy `Button` + `<pre>` block
- [x] Replace with `<ResponseBodyViewer data={toProviderConnectionTestJson(result)} />` inside the existing `<details>` (keep the `<summary>`, schema-note caption)
- [x] Remove the now-unused `useState` import if nothing else in the file needs it

### Task 5: Remove superseded translation keys
- [x] Remove `"providers.connectionTest.copy"` and `"providers.connectionTest.copied"` from en/sk/cs.json (replaced by the shared `common.copy`/`.copied`)

## Verification Steps
- [x] Run: `npx vitest run src/shared/components/response-body/ResponseBodyViewer.test.tsx src/shared/components/modal/JsonViewerModal.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all changed/created files
- [x] Confirm no leftover references to the removed `providers.connectionTest.copy`/`.copied` keys (grep)

## Explicitly Out of Scope
- The 8 table files that call `JsonViewerModal` (`RecoveryGroupsTable`, `RecoveryApplicationsTable`, `PolicySetsTable`, `ProvidersCatalogueTable`, `PlatformProvidersTable`, `SnapshotPoliciesTable`, `CleanRoomPoliciesTable`, `RecoveryAppPoliciesTable`) — zero changes needed, confirmed with user
- No configurable max-height prop on `ResponseBodyViewer` (YAGNI — one fixed height everywhere)
- No download affordance (still out of scope per the original JSON-viewer design doc)
