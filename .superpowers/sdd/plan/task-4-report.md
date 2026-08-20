# Task 4 implementation report

## Changed files

- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx`
- Removed `src/features/discovery-inventory/resources/hooks/useVmwareInventory.ts`
- Removed `src/features/discovery-inventory/resources/hooks/useVmwareInventory.test.tsx`

## Behavior

- Resolves the selected VMware provider within the active source or target role, falling back to the first eligible provider.
- Passes the selected provider's `id`, `vmPrefix`, and `vmTags` to the Task 1 URL-filter hook, preserving its URL-precedence and one-default-per-provider behavior.
- Passes the current URL search prefix, single URL tag, selected provider id, and enabled state to Task 2's unified VMware inventory hook.
- Keeps provider-scoped tag options and all existing page state handling intact: loading, errors, retry, refresh, metrics, filters, pagination, table, and detail panel.
- Removed the legacy inventory hook and test after confirming no runtime consumers remain.

## Verification

- `node_modules/.bin/vitest.cmd run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx` — passed: 3 files, 19 tests.
- `node_modules/.bin/eslint.cmd src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx` — passed.
- `git diff --check` — passed.
- The required `C:\\Users\\polnikr\\nodejs\\npm.cmd exec vitest ...` command could not start because the environment blocks `lstat` on `C:\\Users\\polnikr\\nodejs` with `EPERM`; the repository-local executables ran the identical focused checks.

## Scope

Only VMware resource integration and its page tests changed. IBM Power, FlashSystem, provider forms, recovery-plan consumers, `tasks/plan.md`, and `tasks/todo.md` were not modified.
