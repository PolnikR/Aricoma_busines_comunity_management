# Todo: DetailView — phase 1

Plan: `tasks/detail-view-phase1-plan.md` · Spec: `tasks/detail-view-phase1-spec.md`

## T1 — `--font-mono` theme token (XS)
**Description:** Define `--font-mono` in the `@theme` block of `src/index.css` so the existing
`font-mono` class (36 files) renders monospace.

**Acceptance criteria**
- [ ] `font-mono` resolves to `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`.
- [ ] No other token changed.

**Verification**
- [ ] `git diff --check` and CSS diff review.
- [ ] Browser: Resources (VMware table), Recovery runs, Access logs, Platform providers drawer — IDs monospace, no broken column layout.

**Dependencies:** none · **Files:** `src/index.css`

## T2 — Generic DetailView translations (S)
**Description:** Add `detailView.compactView`, `detailView.expand`, `detailView.sections`,
`detailView.notSet`, `detailView.resize` in en/cs/sk, plus Recovery Group keys
`recoveryGroups.drawer.latestRunUnavailable`, `recoveryGroups.resourceType.vm`,
`recoveryGroups.resourceType.volume`; parity test.

**Acceptance criteria**
- [ ] Keys present and non-empty in all three locales.
- [ ] Parity test fails if a locale misses a `detailView.*` key.

**Verification**
- [ ] `npm exec vitest run src/locales/detailViewTranslations.test.ts`
- [ ] `git diff -U0 src/locales` shows only these keys.

**Dependencies:** none · **Files:** `src/locales/{en,cs,sk}.json`, `src/locales/detailViewTranslations.test.ts`

## T3 — DetailView shell (M)
**Description:** `DetailView` + `DetailViewSection`: header, vertical/horizontal nav, single active
section, expanded/compact modes in one DOM tree, compact resize, dialog contract.

**Acceptance criteria**
- [ ] Dialog contract: `role=dialog`, `aria-modal`, label, focus to Close on open, Tab trap, Escape closes, focus restored, backdrop closes.
- [ ] Exactly one section's children mounted; nav marks it with `aria-current`; Arrow keys move focus; falsy children skipped; `secondary` sections last; `count` shown.
- [ ] Mode toggle keeps section and mounted content; focus moves to the counterpart toggle; state resets to expanded + first section when closed.

**Verification**
- [ ] `npm exec vitest run src/shared/components/detail-view/DetailView.test.tsx`
- [ ] `npm exec eslint src/shared/components/detail-view`

**Dependencies:** T2 · **Files:** `detail-view/DetailView.tsx`, `DetailViewSection.tsx`, `DetailView.test.tsx`, `index.ts`

## T4 — Content primitives (M)
**Description:** `DetailFieldGroup` (default grid + technical list), `DetailField`,
`DetailStatusBlock`, `DetailCode`, internal `DetailCopyButton`.

**Acceptance criteria**
- [ ] Field: label/value, "Not set" for empty, `wide` spans row, `mono`, `emphasis`, `copyValue` copy with feedback, secondary line; technical variant renders label | mono value | copy row.
- [ ] Status block renders status (tone), timestamp, facts, reference with copy, action — each optional except status.
- [ ] Code: caption, Copy, empty state, JSON tinting without changing text content.

**Verification**
- [ ] `npm exec vitest run src/shared/components/detail-view`
- [ ] `npm exec eslint src/shared/components/detail-view`

**Dependencies:** T2 · **Files:** `detail-view/DetailField.tsx`, `DetailStatusBlock.tsx`, `DetailCode.tsx`, `DetailCopyButton.tsx`, their tests, `index.ts`

## Checkpoint A
- [ ] All `detail-view` tests and lint green.
- [ ] API reviewed against the spec's consumer mapping table.

## T5 — Recovery Group pilot (M)
**Description:** Replace the `DetailDrawer` composition in `RecoveryGroupsTable.tsx` with
`DetailView` (Overview / Orchestration / Inventory / Technical) per the spec mapping; rewrite the
drawer tests to the new navigation.

**Acceptance criteria**
- [ ] Header, footer, help, Delete/Edit, unresolved-provider behaviour unchanged.
- [ ] Orchestration states A–E render as the spec table; "View recovery runs" navigates as today; Airflow link/fallback URL unchanged.
- [ ] Inventory mounts only when its section is active; resource type shows plain "VM"/"Volume"; no duplicated status; identifiers only in Technical.

**Verification**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/shared/components/detail-view`
- [ ] `npm exec eslint src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- [ ] `npm exec tsc -- -b --noEmit`

**Dependencies:** T3, T4 · **Files:** `RecoveryGroupsTable.tsx`, `RecoveryGroupsTable.test.tsx`

## T6 — Browser verification (S)
**Description:** Verify the pilot in the real app (Edge CDP, own tab) and fix what it reveals.

**Acceptance criteria**
- [ ] Expanded: Overview, Orchestration, Inventory, Technical — light and dark.
- [ ] Compact ↔ expanded switch keeps section; resize in compact; Escape closes; reopen starts expanded on Overview.
- [ ] Long values (injected long name/description/IDs) wrap without overflow; 1280 px and 390 px viewports; keyboard-only pass (Tab order, nav arrows, help popover Escape); Delete and Edit open their flows (dialogs cancelled, nothing deleted).

**Verification**
- [ ] Screenshots reviewed; no console errors.
- [ ] Focused tests re-run after any fix.

**Dependencies:** T5 · **Files:** fixes only in files from T3–T5

## Checkpoint B
- [ ] Focused tests and lint green; type check clean.
- [ ] Browser checklist complete.
- [ ] User review before phase 2 (next consumers).
