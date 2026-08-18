# Full Response-Body Panel in Shared Component - Task Checklist

## Phase 1: Shared component

### Task 1: Rewrite ResponseBodyViewer
- [x] Open `src/shared/components/response-body/ResponseBodyViewer.tsx`
- [x] Component root becomes `<details className="group rounded-lg border border-border" open={defaultOpen}>`
- [x] `<summary>` = header bar (bg-surface-muted, rounded, px-3 py-2) with `t('common.responseBody')` + `ChevronDownIcon` (`transition-transform group-open:rotate-180`)
- [x] Body (`border-t border-border px-3 py-3`): one row (`flex items-center justify-between gap-2 mb-2`) with either the schema caption (`t('common.matchesSchema')` + `<code>{schemaTypeName}</code>`) or an empty spacer on the left, and the Copy button on the right
- [x] `<pre>` unchanged (`max-h-64 overflow-y-auto overflow-x-auto rounded-md bg-surface-subtle p-3 font-mono text-xs text-text-secondary`)
- [x] Props: `{ data: unknown; schemaTypeName?: string; defaultOpen?: boolean }`, `defaultOpen` defaults to `false`

### Task 2: Translation keys
- [x] Add `"common.responseBody": "Response body"` and `"common.matchesSchema": "Matches"` to en/sk/cs.json
- [x] Remove `"providers.connectionTest.responseBody"` and `"providers.connectionTest.schemaNote"` from en/sk/cs.json

### Task 3: Rewrite ResponseBodyViewer.test.tsx
- [x] Test: renders the "Response body" header label
- [x] Test: clicking the summary reveals the JSON (when `defaultOpen` omitted/false)
- [x] Test: `defaultOpen` renders the JSON immediately, no click needed
- [x] Test: `schemaTypeName` prop renders "Matches ProviderTestResponse"; omitted prop renders no such text
- [x] Test: copy button copies formatted JSON and shows "Copied" briefly
- [x] Test: copy button doesn't throw when clipboard is unavailable

## Phase 2: Wire into existing surfaces

### Task 4: Update JsonViewerModal
- [x] Open `src/shared/components/modal/JsonViewerModal.tsx`
- [x] `<ResponseBodyViewer data={data} defaultOpen />`

### Task 5: Update ProviderConnectionTestDialog
- [x] Open `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`
- [x] Remove the local `<details>`/`<summary>`/schema-note `<p>` markup
- [x] Replace with `<ResponseBodyViewer data={toProviderConnectionTestJson(result)} schemaTypeName="ProviderTestResponse" />`
- [x] Remove the now-unused `ChevronDownIcon` import

### Task 6: Verify ProviderConnectionTestDialog.test.tsx
- [x] Re-run; adjust only if a specific assertion actually breaks (label text and click target should be unchanged)

## Verification Steps
- [x] Run: `npx vitest run src/shared/components/response-body/ResponseBodyViewer.test.tsx src/shared/components/modal/JsonViewerModal.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all changed files
- [x] Grep for leftover references to the removed `providers.connectionTest.responseBody`/`.schemaNote` keys

## Explicitly Out of Scope
- The 8 table files calling `JsonViewerModal` — no changes, no schema-type-name captions added there
- No changes to the connection-test dialog's default-closed behavior (only the JSON-only modal case defaults open)
