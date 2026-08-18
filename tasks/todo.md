# Inline Response Body in Connection Test Dialog - Task Checklist

## Phase 1: Dialog markup

### Task 1: Remove the nested JsonViewerModal
- [x] Open `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`
- [x] Remove the `JsonViewerModal` import and its render, remove the "View" `Button` + `showJson` state
- [x] Drop the `<>...</>` fragment wrapper, back to a single `<Modal>` root

### Task 2: Add providerRole prop
- [x] Add `providerRole?: ProviderRole` (default `'source'`) to `ProviderConnectionTestDialogProps`

### Task 3: Identity badges + pass-count chip
- [x] Import `Badge` from `@/shared/components/badge/Badge` and `providerTypeLabel` from `../helpers/providerTypeLabel`
- [x] Next to the identity block, render `<Badge color="info">{providerTypeLabel(result.providerType)}</Badge>` and `<Badge color={providerRole === 'source' ? 'success' : 'warning'}>{t(\`forms.role.${providerRole}\`)}</Badge>` (only when `result` exists)
- [x] In the success banner, add a chip showing `${okCount} / ${total} passed` computed from `result.checks`

### Task 4: Inline Response body section
- [x] Add a `<details>` element below the checks list (only when `result` exists) with a `<summary>Response body</summary>`
- [x] Inside: a caption noting it matches `ProviderTestResponse`, a Copy button (feature-detect `navigator.clipboard`), and a `<pre>` showing `JSON.stringify(toProviderConnectionTestJson(result), null, 2)`
- [x] Style the `<pre>` with a fixed max-height, `overflow-y-auto`, and `overflow-x-auto`

## Phase 2: Call site + translations

### Task 5: Pass providerRole from the table
- [x] Open `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- [x] Add `providerRole={selected?.role ?? 'source'}` to the `<ProviderConnectionTestDialog>` call

### Task 6: Translation keys (en/sk/cs)
- [x] Replace `providers.connectionTest.jsonTitle` with `providers.connectionTest.responseBody` = "Response body" (and localized equivalents)
- [x] Add `providers.connectionTest.copy` = "Copy", `providers.connectionTest.copied` = "Copied"
- [x] Add `providers.connectionTest.passedCount` = "{ok} / {total} passed" (localized), using the existing `.replace('{x}', ...)` substitution convention

## Phase 3: Tests

### Task 7: Update ProviderConnectionTestDialog.test.tsx
- [x] Replace the "opens the raw JSON response" test: expand the `<details>` (fireEvent.click on the summary) and assert the JSON text appears in the same `dialog` (not a second one)
- [x] Add/adjust a Copy button test if practical in jsdom (feature-detect may no-op — assert the button exists and is clickable without throwing)

### Task 8: Badge + count chip test
- [x] Assert the type badge, role badge, and "`2 / 2 passed`"-style chip render for a passing result

## Verification Steps
- [x] Run: `npx vitest run src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- [x] Run: `npm run typecheck`
- [x] Run: `npx eslint` on all changed files
- [x] Manual trace: confirm no nested modal, no untranslated key, JSON scrolls instead of growing the dialog

## Explicitly Out of Scope
- The `JsonViewerModal` component and its 8 existing table usages stay unchanged
- No copy/download affordance added to `JsonViewerModal` itself (still out of scope per the original design doc)
