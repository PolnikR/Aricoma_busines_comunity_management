# Implementation Plan: DetailView rollout (replace DetailDrawer everywhere)

Builds on phase 1 (`tasks/detail-view-phase1-*.md`, commits `c758da99`, `9efbf47d`, `f0b0edf4`,
`cbfe5925`, `77d3c98a`, `f9bf1482`). Tasks: `tasks/detail-view-rollout-todo.md`.

## Overview

Harden the shared `DetailView` API (size variants, section composition contract), verify the
Recovery Group pilot in the real app, then migrate every remaining `DetailDrawer` consumer in
four controlled groups, decide the Metro Mirror special case, and finally delete the legacy
`DetailDrawer` / `DetailDrawerSection` / `DetailRow` / `DetailStat`.

## Architecture decisions

- **Sizes, not widths.** `size?: 'md' | 'lg' | 'xl'` (≈ 880 / 960 / 1200 px, default `lg`) under
  the same `min(…, 100vw - 2rem)` viewport cap; compact width unchanged. Chosen per consumer after
  inspecting its content, recorded in the todo.
- **Section composition contract.** Direct logical children of `DetailView` are
  `DetailViewSection` elements, optionally inside fragments. Helpers live *inside* a section. Any
  other element child is ignored and reported by a development warning, so a wrapper like
  IBM Power's `PartitionSection` fails loudly instead of silently disappearing.
- **Presentation refactor only.** No changes to hooks, query keys, contracts, mapping, rollback,
  connection tests, pagination or permissions. Existing feature components (inventories,
  `BackingStorageInfo`, disk tables, run history list) are hosted as section content.
- **Only real data.** Fields come from current FE models/responses; nothing from the prototype
  mock data (replication state, consistency group, credential username, RMC state, …) unless the
  model really has it.
- **Tables reuse existing components.** No `DetailTable` abstraction unless a repeated need
  appears during Group A.
- **Metro Mirror decided on semantics** (DetailView single-section vs shared `Modal`), documented.

## Phases and checkpoints

1. **API hardening** — size variants + composition contract (shared files + tests).
2. **Browser verification of the Recovery Group pilot** — blocked until the user logs in to the
   Edge debug browser; visual fixes as separate commits before any further migration.
3. **Migrations** — Group A Resources (VMware, IBM Power, FlashSystem), Group B Providers &
   Administration, Group C Recovery configuration, Group D Audit / History. Per group: focused
   tests + related tests + lint on changed files, browser verification, one atomic commit
   (browser fixes separate).
4. **Metro Mirror review** — decision + change.
5. **Legacy removal** — `git grep` classification, delete legacy components/tests/exports, full FE
   test suite once, lint, type check, `git diff --check`.

Checkpoint after every group: tests/lint green, type check at group end, browser pass, commit.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser blocked by Keycloak | High (blocks phases 2–3) | Stop, report the page shown, ask the user to log in; no bypass |
| Consumer tests assert old drawer DOM | Med | Rewrite to behaviour (nav `aria-current`, regions), keep every behavioural assertion |
| Wrapper components hiding sections (IBM Power) | Med | Dev warning + contract test; flatten to direct sections |
| Locale files edited by other sessions | Med | Insert only own keys; check `git diff -U0 src/locales` before each commit |
| Interleaved unrelated commits | Low | Explicit paths per commit; never range-based operations |
| Hidden behaviour changes while moving UI | Med | Keep hooks/conditions verbatim; report bugs separately before changing behaviour |

## Open items

- Browser login (user action) before phase 2.
