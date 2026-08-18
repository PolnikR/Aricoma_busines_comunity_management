# Hide Empty Resource Tabs - Task Checklist

## Phase 1: Core Logic

### Task 1: Update ResourceRolePage.tsx
- [x] Open `src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx`
- [x] Add `visibleRoleTabs`: `providersSuccess ? roleTabs.filter(tab => tab.providerId !== null) : roleTabs`
- [x] Add `effectiveActiveTab`: redirects to `visibleRoleTabs[0]` when `providersSuccess` is true, `activeRoleTab.providerId` is `null`, and `visibleRoleTabs.length > 0`; otherwise equals `activeRoleTab`
- [x] Update the redirect `useEffect` to compare against `effectiveActiveTab` instead of `activeRoleTab` (keep the hook call unconditional, before any early return)
- [x] After the effect (all hooks called), add early return: if `providersSuccess && visibleRoleTabs.length === 0`, render a `TableToolbar` (same eyebrow/title/description pattern as `VmwareResourcesPage`, role-conditional) + `EmptyState` using `resources.common.noProviderTitle` / `resources.common.noProviderDescription` — no tab strip
- [x] Change `tabs` JSX to use `items={visibleRoleTabs}` and `value={effectiveActiveTab?.value ?? 'vmware:none'}`
- [x] Change `rolePageProps.providerId` to `effectiveActiveTab?.providerId ?? null`
- [x] Change `switch (resourceTab)` to `switch (effectiveActiveTab?.resourceTab ?? resourceTab)`
- [x] Change the sub-page `key` prop from `activeRoleTab?.value` to `effectiveActiveTab?.value`
- [x] Import `TableToolbar` from `@/shared/components/table/TableToolbar` and `EmptyState` from `@/shared/components/empty-state/EmptyState`

## Phase 2: Test Updates

### Task 2: Update ResourcesPage.test.tsx
- [x] Open `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- [x] In "renders metrics, toolbar, and empty inventory state": replace the two `getByRole('tab', { name: 'FlashSystem Volumes' / 'IBM Power Partitions' })` assertions with `queryByRole(...)).not.toBeInTheDocument()` (only the VMware provider exists in this test's data)
- [x] In "renders a terminal no-provider state without a loading skeleton": add `expect(screen.queryByRole('tablist')).not.toBeInTheDocument()`

### Task 3: Update ResourcesIsePage.test.tsx
- [x] Open `src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx`
- [x] Apply the same two changes as Task 2 (empty-tab assertions + tablist absence) to this file's equivalent tests
- [x] Rewrite "excludes source-role providers from target tabs": add a second provider `flashTargetProvider` (already defined in this file, role `target`) alongside `vmwareSourceProvider` in `providersQuery.data`
- [x] Replace the assertion body with: `expect(screen.queryByRole('tab', { name: /VMware VMs/ })).not.toBeInTheDocument()` and `expect(screen.getByRole('tab', { name: 'FlashSystem Volumes' })).toBeInTheDocument()`

## Verification Steps
- [x] Run: `npx vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx` — 15 passed
- [x] Run: `npm run typecheck` — no errors
- [x] Manual trace: confirm no other test file renders `ResourceRolePage` and would be affected (checked: only these two page test files cover it)
- [x] Lint: `npx eslint` on changed files — clean

## Explicitly Out of Scope
- No changes to `buildResourceTabsByRole` / `buildResourceSourceTabs.test.ts`
- No changes to `VmwareResourcesPage.tsx`, `FlashSystemResourcesPage.tsx`, or `IbmPowerResourcesPage.tsx`
- No route or folder restructuring (`resources` staying under `discovery-inventory` — separate topic, not part of this fix)
- No new translation keys
