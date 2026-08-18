# Implementation Plan: Inline Response Body in the Connection Test Dialog

## Overview
The previous change made "View JSON" open a second `JsonViewerModal` on top of `ProviderConnectionTestDialog`, matching the table convention. In practice this produced a stacked-modal look with two "Close" buttons visible at once, and the dialog title showed the raw, un-interpolated translation key instead of its resolved text. The user rejected this and asked to go back to the originally-approved artifact design instead: an inline, collapsible "Response body" section inside the same dialog — no second modal.

This reverses the table-convention choice for this one dialog only. The distinction: table rows show their JSON via a button because the row itself is the "rendered summary" living outside any modal — clicking View has nowhere else to put the JSON but a new modal. This dialog already **is** a modal with its own rendered summary (checks list) inside it, so nesting a second modal duplicates chrome (title bar, footer, Close button) for no reason. An inline `<details>` section avoids that entirely. The shared `JsonViewerModal` and its use in the 8 tables are untouched.

## Architecture Decisions
- Remove the `JsonViewerModal` usage and the "View" button from `ProviderConnectionTestDialog`. Keep `toProviderConnectionTestJson` (the payload mapper) — it's still needed to build the inline JSON text.
- Add an inline `<details>` "Response body" disclosure (matches native semantics used elsewhere for progressive disclosure; no extra JS needed to open/close), containing:
  - a small caption noting it matches the generated `ProviderTestResponse` type
  - a Copy-to-clipboard button (feature-detected, no-op if unavailable)
  - a `<pre>` block, capped height + `overflow-y-auto` (vertical) and `overflow-x-auto` (horizontal) so a large response scrolls instead of growing the dialog — same requirement as before, just enforced inline this time instead of relying on `JsonViewerModal`'s existing cap.
- Add provider type/role badges next to the identity row, reusing the existing `Badge` component and the same `success`/`warning` role-color convention already used in `ProvidersCatalogueTable`. Role isn't currently passed to the dialog, so add an optional `providerRole` prop (default `'source'`) and pass `selected?.role` from the call site.
- Add a pass-count chip ("2 / 3 passed") next to the existing success/failure banner, computed from `checks.filter(isCheckOk).length` vs `checks.length` — encodes the same information the artifact showed, without inventing new data.
- Translation: repurpose the `providers.connectionTest.jsonTitle` key (no longer used as a modal title) into `providers.connectionTest.responseBody` = "Response body"; add `providers.connectionTest.copy` / `.copied` for the button; add `providers.connectionTest.passedCount` as a `{ok}/{total}` template string, resolved the same way `providers.credentials.unavailable` already does its `{id}` substitution.

## Task List

### Phase 1: Dialog markup
- [ ] Task 1: Remove `JsonViewerModal` import/usage and the "View" button from `ProviderConnectionTestDialog.tsx`; drop the `<>...</>` wrapper fragment since there's only one root element again.
- [ ] Task 2: Add `providerRole` prop (optional, default `'source'`) to `ProviderConnectionTestDialogProps`.
- [ ] Task 3: Add the type/role `Badge` pair next to the identity block, and the pass-count chip next to the success/failure banner.
- [ ] Task 4: Add the inline `<details>` "Response body" section with the capped/scrollable `<pre>` and the Copy button.

### Checkpoint: Dialog markup
- [ ] Component compiles with no type errors
- [ ] Manual trace: opening the dialog no longer shows a nested modal or an untranslated key anywhere

### Phase 2: Call site + translations
- [ ] Task 5: Update `ProvidersCatalogueTable.tsx` to pass `providerRole={selected?.role ?? 'source'}` into `ProviderConnectionTestDialog`.
- [ ] Task 6: Update `en.json`/`sk.json`/`cs.json` — replace `jsonTitle` with `responseBody`, add `copy`, `copied`, `passedCount`.

### Phase 3: Tests
- [ ] Task 7: Replace the "opens the raw JSON response" test (which asserted a second dialog) with a test that expands the inline `<details>` and asserts the JSON text is present in the same dialog, plus a Copy-button test.
- [ ] Task 8: Add a test asserting the type/role badges and the pass-count chip render with the real sample data.

### Checkpoint: Complete
- [ ] Focused tests pass: `ProviderConnectionTestDialog.test.tsx`, `ProvidersCatalogueTable.test.tsx`
- [ ] Typecheck and lint clean on all changed files
- [ ] All acceptance criteria met

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| A very long response makes the `<pre>` push the dialog past the viewport | Medium — same bug class as before | Fixed `max-height` + `overflow-y-auto` on the `<pre>`, independent of `JsonViewerModal` |
| `providerRole` not passed from some other call site (if one exists) silently defaults wrong | Low | Default to `'source'`, the more common case; only one call site exists today (`ProvidersCatalogueTable`) |
| `<details>` default-open/closed state not obvious to screen readers | Low | Native `<details>/<summary>` already carries correct ARIA semantics with no extra markup needed |

## Open Questions
None — scope confirmed: revert this dialog to the inline design, leave the table `JsonViewerModal` convention untouched elsewhere.
