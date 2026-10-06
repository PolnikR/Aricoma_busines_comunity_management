# Todo: DetailView rollout

Plan: `tasks/detail-view-rollout-plan.md`

## Phase 1 — API hardening
- [x] R1 Size variants `md | lg | xl` (default `lg`), compact unchanged; tests for each size and the default.
  Verify: `npm exec vitest run src/shared/components/detail-view` · eslint on the folder.
- [x] R2 Section composition contract: documented in `DetailView.tsx`, dev warning for non-section children, test that a wrapping helper is ignored and warned about.
  Verify: same as R1.

## Phase 2 — Recovery Group pilot in the browser (needs user login)
- [x] R3 Real app: expanded default, Overview / Orchestration / Inventory / Technical, single section, vertical nav, Technical last, compact ↔ expanded with section kept, footer Delete/Edit, Edit disabled (if data allows), help popover, long IDs, monospace, light/dark, desktop/narrow, inventory alignment, console clean. Fixes as separate commits.

## Phase 3 — migrations (one commit per group; browser pass per group)
### Group A — Resources
- [x] R4 VMware `VirtualMachineDetailPanel` — Overview / Disks / Backing storage / Technical; keep disk table, NAA, `BackingStorageInfo`, `VmRelationshipHelp`, hooks, statuses.
- [x] R5 IBM Power `IbmPowerDetailPanel` — flatten `PartitionSection`; Summary / Processor & memory / Network / Storage / I/O / Backing storage / Technical; keep `useVdisksByVm`, VIOS/LPAR conditions, retry.
- [x] R6 FlashSystem `FlashSystemVolumeDetailPanel` — identity / placement / state / copies / pool / technical; keep consistency groups and relationship help.
### Group B — Providers & Administration
- [x] R7 Platform providers (type-specific fields), R8 Provider catalogue (partner, backing storage, test connection, help), R9 Credentials (password hidden), R10 Users, R11 Clients (detail endpoint), R12 Realm roles.
### Group C — Recovery configuration
- [x] R13 Policy sets, R14 Snapshot / App / Clean-room policies (single section where simple), R15 Recovery applications (Overview / Orchestration / Inventory / Technical).
### Group D — Audit / History
- [x] R16 Access log (status block, code bodies, query string), R17 Recovery actions history, R18 Recovery run history (paginated list as arbitrary content).

## Phase 4 — Metro Mirror
- [x] R19 Decide DetailView single-section vs `Modal` for `RecoveryGroupMetroMirrorFields`; document and change.
  Decision: shared `Modal`. The review is a validation summary of the builder form (hint, help, loading/retry, problems), not an entity with fields or sections.

## Phase 5 — legacy removal
- [x] R20 `git grep` for `<DetailDrawer`, `DetailDrawerSection`, `DetailRow`, `DetailStat`; classify; delete legacy files/tests/exports; full FE suite once, lint, type check, `git diff --check`.

## Size per consumer (filled in during migration)
| Consumer | Size | Reason |
|---|---|---|
| Recovery group | lg | default; four sections, inventory |
| VMware VM | xl | compute/guest/placement grid, disk table, backing storage mapping tables |
| IBM Power partition | xl | many sections, backing storage tables |
| FlashSystem volume | lg | default; fields and copies, no wide tables |
| Platform provider | md | few fields per type |
| Provider catalogue | md | few fields; relationships list |
| Credential | md | username, hidden password, description |
| User / Client / Realm role | md | profile fields and role lists |
| Policy set, snapshot / app / clean-room policy | md | single section, no navigation |
| Recovery application | lg | default; four sections, inventory |
| Access log entry | lg | default; JSON bodies need width |
| Recovery test (history) | md | single section |
| Recovery run history | md | single Runs section with pagination |
