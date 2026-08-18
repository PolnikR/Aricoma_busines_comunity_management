# Implementation Plan: Move the Full Response-Body Panel into the Shared Component

## Overview
`ResponseBodyViewer` currently only extracted the "copy button + pre" core. The bordered panel chrome around it — the header bar with a label and chevron, the optional "Matches &lt;Type&gt;" schema caption, the collapse/expand behavior — still lives locally inside `ProviderConnectionTestDialog`, so `JsonViewerModal` (used by all 8 table "View JSON" buttons) never got that chrome and looks like a stripped-down version. This moves the whole panel (header bar, chevron, optional schema caption, copy button, scrollable JSON) into `ResponseBodyViewer` itself, so every place that shows a JSON response looks identical. Confirmed with the user: in the JSON-only modal case it should default open (no click needed) but remain collapsible; the connection-test dialog's existing closed-by-default behavior is unaffected since that wasn't the complaint.

## Architecture Decisions
- `ResponseBodyViewer` becomes the `<details>` element itself (header `<summary>` with a generic "Response body" label + chevron, body with an optional schema-caption/copy-button row, then the capped scrollable `<pre>`). Callers no longer build any of that markup themselves.
- New props: `schemaTypeName?: string` (renders "Matches `<code>{schemaTypeName}</code>`" when provided, omitted otherwise — this is the one piece that's genuinely dialog-specific) and `defaultOpen?: boolean` (default `false`, matching today's connection-test behavior; `JsonViewerModal` passes `true`).
- The label text ("Response body") and the "Matches" caption prefix become generic `common.*` translation keys, reused everywhere, replacing the `providers.connectionTest.responseBody` / `.schemaNote` keys.
- `JsonViewerModal` passes only `data` and `defaultOpen`, no `schemaTypeName` — none of the 8 table call sites have a schema type name to give it, and adding one would mean touching those 8 files, which stays out of scope (confirmed previously, unchanged here).
- Schema caption and Copy button share one row (`justify-between`), matching the screenshot — an empty spacer keeps the Copy button right-aligned even when there's no caption, so the row looks the same shape in both contexts.

## Task List

### Phase 1: Shared component
- [ ] Task 1: Rewrite `ResponseBodyViewer.tsx` to own the full `<details>` panel (header bar, chevron, optional schema caption + copy button row, scrollable pre). Add `schemaTypeName?` and `defaultOpen?` props.
- [ ] Task 2: Add `common.responseBody` / `common.matchesSchema` translation keys (en/sk/cs); remove the now-superseded `providers.connectionTest.responseBody` / `.schemaNote` keys.
- [ ] Task 3: Rewrite `ResponseBodyViewer.test.tsx` for the new shape: renders the header label, expands on summary click, shows/hides the schema caption based on the prop, copy still works, `defaultOpen` renders already expanded.

### Checkpoint: Shared component
- [ ] `ResponseBodyViewer.test.tsx` passes standalone
- [ ] Typecheck clean

### Phase 2: Wire into existing surfaces
- [ ] Task 4: Update `JsonViewerModal.tsx` — pass `defaultOpen` to `ResponseBodyViewer`, no other changes (still zero changes to the 8 table files).
- [ ] Task 5: Update `ProviderConnectionTestDialog.tsx` — remove its local `<details>`/`<summary>`/schema-note markup and the now-unused `ChevronDownIcon` import; render `<ResponseBodyViewer data={...} schemaTypeName="ProviderTestResponse" />` directly.
- [ ] Task 6: Update `ProviderConnectionTestDialog.test.tsx` if the "Response body" label text or click target changed shape (verify, adjust only if a real assertion breaks).

### Checkpoint: Wired in
- [ ] `JsonViewerModal.test.tsx` still passes unmodified (its assertions don't depend on the panel chrome, and `defaultOpen` makes the JSON immediately present, same as before)
- [ ] `ProviderConnectionTestDialog.test.tsx` passes
- [ ] One representative table test (`ProvidersCatalogueTable.test.tsx`) still passes untouched

### Checkpoint: Complete
- [ ] Full focused test run across all touched + representative files
- [ ] Typecheck and lint clean
- [ ] Manual trace: JsonViewerModal now shows a header bar + chevron + already-expanded JSON; connection-test dialog looks the same as before (still closed by default)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| React re-rendering `<details open={defaultOpen}>` could fight a user's manual toggle if `defaultOpen`'s value ever changed across renders | Low | `defaultOpen` is a static prop passed once per mount in both call sites; it never changes value during a component's lifetime, so React's prop-diffing never re-touches the `open` attribute after mount |
| Removing the schema caption for the 8 table modals could look like a regression (no "Matches X" line where the connection-test dialog has one) | Low | Intentional — those 8 tables never had this caption; adding it is out of scope and would require touching each one, which the user already confirmed against |

## Open Questions
None — confirmed: default open + collapsible for the JSON-only case, same component everywhere else.
