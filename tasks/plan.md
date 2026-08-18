# Implementation Plan: Shared Response Body Viewer

## Overview
Extract the "copy + scrollable JSON" piece built for the connection-test dialog into a shared component (`ResponseBodyViewer`), then reuse it everywhere a raw JSON response is shown: the 8 existing table `JsonViewerModal` usages, and `ProviderConnectionTestDialog`'s inline "Response body" section. Confirmed with the user: the table "View" button keeps opening a modal (there's no other content to embed JSON into there) — only `JsonViewerModal`'s internals change, so none of the 8 table files need touching. The connection-test dialog keeps its `<details>` wrapper (it already shows other content, so JSON stays packed behind a disclosure) but delegates the actual rendering to the same shared piece.

## Architecture Decisions
- New component `src/shared/components/response-body/ResponseBodyViewer.tsx`: takes `data: unknown`, renders a Copy button (feature-detected clipboard, "Copy" → "Copied" for ~1.4s) and a `<pre>` capped at a fixed height with both-axis scroll. It owns its own translation (`common.copy` / `common.copied`, added as generic keys) so no caller needs to pass label props through.
- `JsonViewerModal` renders `<ResponseBodyViewer data={data} />` instead of its own raw `<pre>`. Its outer `max-h-96`/`overflow-hidden` scaffolding is removed since the new component self-limits its own height — this actually simplifies the modal. No changes needed in any of the 8 files that call `JsonViewerModal`.
- `ProviderConnectionTestDialog` drops its local `copyText` helper, `justCopied` state, and inline Copy `<Button>` + `<pre>` — replaced by `<ResponseBodyViewer data={toProviderConnectionTestJson(result)} />` inside the existing `<details>`. The dialog keeps its own `responseBody`/`schemaNote` copy (that framing is specific to this dialog), but the now-duplicate `providers.connectionTest.copy` / `.copied` keys are removed in favor of the shared component's generic ones.
- No prop for configurable max-height — one fixed, sensible height (`max-h-64`) everywhere. Add it later only if a real case needs it (YAGNI).

## Task List

### Phase 1: Shared component
- [ ] Task 1: Create `ResponseBodyViewer.tsx` (copy button + scrollable `<pre>`), add generic `common.copy`/`common.copied` translation keys (en/sk/cs).
- [ ] Task 2: Create `ResponseBodyViewer.test.tsx` — renders formatted JSON, copy button copies to clipboard and shows "Copied" briefly, falls back gracefully when `navigator.clipboard` is unavailable.

### Checkpoint: Shared component
- [ ] `ResponseBodyViewer.test.tsx` passes standalone
- [ ] Typecheck clean

### Phase 2: Wire into existing surfaces
- [ ] Task 3: Refactor `JsonViewerModal.tsx` to render `ResponseBodyViewer` internally; simplify its now-redundant height/scroll wrapper classes.
- [ ] Task 4: Refactor `ProviderConnectionTestDialog.tsx` to use `ResponseBodyViewer` inside its existing `<details>`; remove the now-dead local copy logic.
- [ ] Task 5: Remove the now-unused `providers.connectionTest.copy` / `.copied` keys from en/sk/cs.json (superseded by the shared `common.copy`/`.copied`).

### Checkpoint: Wired in
- [ ] `JsonViewerModal.test.tsx` still passes (existing assertions on formatted JSON text are whitespace-insensitive, unaffected by the internal refactor)
- [ ] `ProviderConnectionTestDialog.test.tsx` still passes (same visible "Copy"/"Copied" text, now sourced from the shared component)
- [ ] One representative table (`ProvidersCatalogueTable.test.tsx`) still passes untouched, proving the 8 table call sites needed zero changes

### Checkpoint: Complete
- [ ] Full focused test run across all touched + representative files
- [ ] Typecheck and lint clean
- [ ] All acceptance criteria met

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing `JsonViewerModal`'s outer height cap changes visible dialog size for all 8 tables at once | Medium — visual change across many screens | The new `ResponseBodyViewer`'s own `max-h-64` scroll box replaces the old `max-h-96` modal cap with an equivalent (slightly smaller, more predictable) constraint; verified visually is out of scope for this pass but flagged here |
| Two different Copy-labeled buttons (old provider-specific, new generic) briefly coexist mid-refactor if done out of order | Low | Do Task 1 fully before Task 3/4 touch the call sites, so nothing references the old keys after Task 5 |
| `navigator.clipboard` absent in some real deployment context (non-HTTPS, older browser) | Low | Already handled via try/catch + no-op fallback, unchanged from the original dialog-local implementation |

## Open Questions
None — table-modal scope confirmed with the user (keep as modal, refactor internals only).
