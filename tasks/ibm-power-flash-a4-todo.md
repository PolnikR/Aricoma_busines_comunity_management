# Todo: IBM Power + FlashSystem volume on A4 DetailOverview

See `tasks/ibm-power-flash-a4-plan.md`.

- [x] Task 1: IBM Power field sections on `DetailOverview`
- [x] Task 2: FlashSystem field sections + Pool on `DetailOverview`
- [x] Task 3: Parametrized A4 assertions in both panel tests
- [x] Checkpoint: vitest (2 files), eslint (4 files), typecheck, `git diff --check`
- [x] Task 5: Browser verification IBM Power + FlashSystem (1440 light, narrow, dark)
- [x] Task 6: Commit explicit paths only

## Verification record (2026-10-07)
- vitest: 2 files, 35 tests green; the 10 new grid tests fail on the HEAD components.
- eslint (4 files), `npm run typecheck`, `git diff --check`: clean.
- Browser (Edge CDP :9333, own tab): IBM Power `ibu_aix` + `aix2source` (1440 light, 420 dark),
  FlashSystem `V5000_VOLUME01` + `vdisk1` (1440 light, 1440 dark, 420 dark). Every field section:
  one A4 `dl`, no old grid, no vertical borders, `grid-auto-flow: row`, last-row clip, no
  horizontal overflow; UUID / vdisk UID take two tracks by the shared helper; Consistency groups
  `col-span-full` (also empty); copy focus ring visible.
- Not in live data: no LPAR has HMC Storage data (section hidden) and no volume has consistency
  groups (no pills). Both are covered by the unit tests; the renderer is shared.
