# Task Checklist: Airflow DAG Link in Recovery Run History Drawer

## Drawer link

- [x] Call `usePlatformProviders()` inside `RecoveryRunHistoryDrawer.tsx` and
      resolve the provider URL from `entity?.providerId`.
- [x] Render a "View in Airflow" link (in `headerExtra`, below the subtitle)
      opening `buildAirflowDagUrl(entity.dagId, providerUrl)` in a new tab.
- [x] Add `recoveryRuns.drawer.viewInAirflow` to `en.json`, `sk.json`,
      `cs.json`.
- [x] Add/update the drawer's component test for the link.

## Focused verification

- [x] Run `RecoveryRunHistoryDrawer.test.tsx`.
- [x] Run TypeScript type checking (2 pre-existing, unrelated failures found
      in recovery-applications pages/tests — not touched by this task, not
      caused by it; already broken in committed HEAD before this change).
- [x] Check for hardcoded Airflow host literals in the changed files (none —
      only a test-fixture URL).
- [x] Run `git diff --check` and inspect only the scoped files.
- [ ] Manually verify the link opens the same DAG as the entity's own
      table/detail-drawer link (not done — no running dev/API environment in
      this session).
