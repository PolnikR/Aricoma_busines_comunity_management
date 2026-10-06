# Implementation Plan: DetailView — phase 1

Spec: `tasks/detail-view-phase1-spec.md`. Tasks: `tasks/detail-view-phase1-todo.md`.

## Overview

Build the shared `DetailView` system (shell + content primitives) from prototype Variant D, make
`font-mono` work, and move only the Recovery Group detail onto it. `DetailDrawer` stays for every
other consumer until later phases.

## Architecture decisions

- **Compositional API, sections as direct children.** `DetailView` reads `DetailViewSection`
  props (`id`, `title`, `icon`, `count`, `secondary`, `navLabel`) from its children to build the
  navigation and renders only the active one. Same pattern as tab components; no registry, no
  data-driven renderer. Conditional sections work with `cond ? <Section/> : null`.
- **One DOM tree for both modes.** Expanded and compact differ by frame classes and container
  queries, not by separate components, so focus, section and the hosted feature state survive a
  mode switch (prototype re-rendered; production must not).
- **Compact mode shows the same sections in full** (nav becomes a horizontal strip, grid becomes one
  column). The prototype's abbreviated/accordion compact content is dropped — it was the
  inconsistent part. Compact stays modal in phase 1 (same focus trap as today's drawer).
- **Field primitive with a group-level variant.** `DetailField` is one API; `DetailFieldGroup
  variant="technical"` switches its rendering to the identifier row via context. Feature code
  passes links/badges/tags as `value` nodes — no link/badge props in the primitive.
- **Status block is the only bordered surface.** Used for operational state; everything else is
  spacing and hairlines.
- **No table primitive yet.** The pilot hosts `RecoveryGroupInventory` unchanged in a `flush`
  section. Table reuse (`DataTable` vs a light detail table) is decided with VMware Disks.
- **Focus trap copied, not shared.** The trap logic is lifted from `DetailDrawer` into
  `DetailView`; `DetailDrawer` is deleted at the end of the migration, so a shared hook would have
  one long-term user.
- **Generic strings in the shared layer.** `DetailView` uses `useTranslation` for its own labels
  (`detailView.compactView`, `.expand`, `.sections`, `.notSet`, `.resize`) like
  `ResponseBodyViewer`; entity labels stay props.
- **Monospace token is global.** Defining `--font-mono` fixes 36 files that already use
  `font-mono`; checked visually on the densest tables before committing.

## Dependency graph

```
T1 font-mono token ─────────────────────────────┐
T2 i18n keys ─┬─ T3 DetailView shell ─┬─ T5 RG pilot ── T6 browser verification
              └─ T4 content primitives ┘
```

T1 is independent (own commit, own visual check). T3 and T4 can be built in either order but T5
needs both.

## Tasks (ordered)

1. **T1 — `--font-mono` token** (XS) — `src/index.css`. Visual check of mono-heavy screens.
2. **T2 — `detailView.*` i18n keys + parity test** (S) — en/cs/sk + `detailViewTranslations.test.ts`.
3. **T3 — `DetailView` + `DetailViewSection` shell** (M) — dialog contract, nav, single active
   section, modes, reset, resize in compact. Tests.
4. **T4 — content primitives** (M) — `DetailField`, `DetailFieldGroup` (+ technical),
   `DetailStatusBlock`, `DetailCode`, `DetailCopyButton`. Tests. Export from `index.ts`.

   **Checkpoint A** — focused tests + lint for `detail-view/`; quick render of a fixture
   composition in the real app is not possible without a consumer, so review the API against the
   spec mapping table before T5.

5. **T5 — Recovery Group pilot** (M) — `RecoveryGroupsTable.tsx` composition, resource-type plain
   labels and "Latest run unavailable" key, test rewrite.
6. **T6 — browser verification + fixes** (S) — full checklist in the todo; fixes land as
   follow-up commits in the same files.

   **Checkpoint B** — focused tests green, lint clean, browser checklist complete, user review.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Global `font-mono` widens IDs in page tables (column wrap) | Med | Own commit (T1), screenshot resources/runs/access-log tables before/after; revert is one line |
| Reading children for navigation breaks with wrappers/fragments | Med | Documented "direct children" rule; dev-time warning test for non-section children; RG uses plain conditionals |
| Hosted `RecoveryGroupInventory` padding/cards look off inside the new content area | Low | `flush` section; restyle deferred and noted |
| Help popover inside new frame (focus trap, Escape, clipping by overflow) | Med | Keep popover in header (no overflow there); keep RG help tests; browser check |
| Mode switch loses focus / scroll | Low | One DOM tree; focus counterpart toggle; tests |
| Other sessions edit `src/locales/*.json` in parallel | Med | Check `git diff -U0 src/locales` before committing; commit only own keys |
| Existing RG tests assert `DetailDrawer` DOM (`aria-expanded`, meta row) | Low | Rewrite to behaviour (nav `aria-current`, header text); keep all state assertions |

## Verification commands (focused)

- `npm exec vitest run src/shared/components/detail-view src/locales/detailViewTranslations.test.ts src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `npm exec eslint src/shared/components/detail-view src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- Type check (`npm exec tsc -- -b --noEmit`) once after T5, because a new shared API is exported.
- Full suite / production build: not run unless requested.

## Open questions (need user input before T3)

1. Compact mode: full sections (recommended) or abbreviated content like the prototype? Modal in
   phase 1 (recommended) or non-modal now?
2. Is hosting `RecoveryGroupInventory` unchanged (own cards/accordions) acceptable for the pilot,
   with its restyle in a later phase?
