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

- [x] Run all Stage 1 focused Vitest files together.
- [x] Confirm static toolbars, column names, metric icons, and labels remain visible.
- [x] Confirm cached background refresh never reverts to skeletons.
- [x] Confirm loading, error, empty-success, and populated-success remain distinct.
- [x] Run focused ESLint for changed files with zero warnings.
- [x] Run `npm run typecheck`.
- [ ] Browser-check representative tables and metrics at 320, 768, 1024, and 1440 px.
- [x] Commit every task/sub-slice atomically before Stage 2.

## Stage 2: Specialized loading states

- [x] Task 11: Preserve infrastructure topology chrome during loading.
- [x] Task 12: Preserve the provider detail shell during loading.
- [x] Task 13: Preserve the recovery application editor shell.
- [x] Task 14: Preserve the recovery group editor shell.
- [x] Task 15a: Refine recovery builder/type-step loading regions.
- [x] Task 15b: Refine shared resource-sidebar loading regions.
- [x] Task 16: Refine Identity users and clients loading states.
- [x] Task 17: Refine Identity realm and authentication loading states.
- [ ] Task 18: Complete loading-transition accessibility and visual audit.

## Checkpoint: Complete

- [x] Run all affected focused Vitest files together.
- [x] Run `npm run typecheck`.
- [x] Run focused ESLint for every changed TS/TSX file.
- [x] Run `git diff --check` and inspect staged files before each commit.
- [x] Audit remaining skeleton and whole-page loading branches and document valid exceptions.
- [ ] Browser-check table, metric, topology, editor, sidebar, and Identity loading states.
- [x] Confirm `RouteLoadingSkeleton` and mutation indicators remain unchanged.
- [x] Confirm every implementation slice has an atomic task-scoped commit.
