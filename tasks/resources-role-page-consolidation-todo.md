# Task Checklist: Resources / Resources ISE Page Consolidation

## Shared tab builder

- [ ] Export `buildResourceTabsByRole` from `buildResourceSourceTabs.ts`.
- [ ] Confirm `buildResourceSourceTabs`/`buildResourceTargetTabs` still delegate to it and their tests still pass.

## Page consolidation

- [ ] Create `ResourceRolePage({ role })` with the body currently duplicated between `ResourcesPage.tsx` and `ResourcesIsePage.tsx`.
- [ ] Reduce `ResourcesPage.tsx` to `<ResourceRolePage role="source" />`.
- [ ] Reduce `ResourcesIsePage.tsx` to `<ResourceRolePage role="target" />`.
- [ ] Keep routes (`/discovery-inventory/resources`, `/discovery-inventory/resources-ise`) and sidebar entries untouched.
- [ ] Preserve the `key={activeTab?.value}` remount behavior on the resource-type sub-pages.

## Role-aware copy

- [ ] Make the `eyebrow` prop in `FlashSystemResourcesPage.tsx`/`IbmPowerResourcesPage.tsx`/`VmwareResourcesPage.tsx` role-aware (`pages.resourcesIse.eyebrow` for target, `pages.virtualMachines.eyebrow` for source).
- [ ] Update `pages.resourcesIse.eyebrow` text in `en.json`, `cs.json`, `sk.json` so it's visibly distinct from `pages.virtualMachines.eyebrow`.
- [ ] Leave title/description props untouched (still resource-type-specific, same for both roles).

## Verification

- [ ] Run focused tests: `npm run test -- src/features/discovery-inventory/resources --run`
- [ ] Run focused lint on all touched files.
- [ ] Manually confirm both pages render as independent sidebar tabs with correct source/target data.
- [ ] Manually confirm the eyebrow text differs between `/discovery-inventory/resources` and `/discovery-inventory/resources-ise`.
- [ ] Commit only files touched by this consolidation.
