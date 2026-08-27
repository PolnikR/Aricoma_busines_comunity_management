# Todo: Dynamic-Data-Only Loading Skeletons

## Stage 1: Shared tables and metrics

- [x] Task 1: Add value-only loading rows to `DataTable`.
- [x] Task 2: Migrate provider catalogue and credentials tables.
- [x] Task 3: Migrate the platform providers table.
- [x] Task 4: Migrate policy sets and application recovery policy tables.
- [x] Task 5: Migrate snapshot and clean-room policy tables.
- [x] Task 6a: Migrate the Recovery Applications list table.
- [x] Task 6b: Migrate the Recovery Groups list table.
- [x] Task 6c: Migrate the Recovery Runs table.
- [x] Task 7a: Migrate VM inventory and VM snapshot tables.
- [x] Task 7b: Migrate Permissions and Realm Roles tables.
- [x] Task 8: Add value-level loading to `StatCard`.
- [x] Task 9: Migrate VMware metrics.
- [x] Task 10a: Migrate FlashSystem metrics.
- [x] Task 10b: Migrate IBM Power metrics.

## Checkpoint: Stage 1

- [ ] Run all Stage 1 focused Vitest files together.
- [ ] Confirm static toolbars, column names, metric icons, and labels remain visible.
- [ ] Confirm cached background refresh never reverts to skeletons.
- [ ] Confirm loading, error, empty-success, and populated-success remain distinct.
- [ ] Run focused ESLint for changed files with zero warnings.
- [ ] Run `npm run typecheck`.
- [ ] Browser-check representative tables and metrics at 320, 768, 1024, and 1440 px.
- [ ] Commit every task/sub-slice atomically before Stage 2.

## Stage 2: Specialized loading states

- [ ] Task 11: Preserve infrastructure topology chrome during loading.
- [ ] Task 12: Preserve the provider detail shell during loading.
- [ ] Task 13: Preserve the recovery application editor shell.
- [ ] Task 14: Preserve the recovery group editor shell.
- [ ] Task 15a: Refine recovery builder/type-step loading regions.
- [ ] Task 15b: Refine shared resource-sidebar loading regions.
- [ ] Task 16: Refine Identity users and clients loading states.
- [ ] Task 17: Refine Identity realm and authentication loading states.
- [ ] Task 18: Complete loading-transition accessibility and visual audit.

## Checkpoint: Complete

- [ ] Run all affected focused Vitest files together.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint for every changed TS/TSX file.
- [ ] Run `git diff --check` and inspect staged files before each commit.
- [ ] Audit remaining skeleton and whole-page loading branches and document valid exceptions.
- [ ] Browser-check table, metric, topology, editor, sidebar, and Identity loading states.
- [ ] Confirm `RouteLoadingSkeleton` and mutation indicators remain unchanged.
- [ ] Confirm every implementation slice has an atomic task-scoped commit.
