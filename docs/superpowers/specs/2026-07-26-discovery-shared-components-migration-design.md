# Discovery Shared Components Migration Design

## Goal

Remove repeated UI implementations from discovery inventory and provider detail screens by extending the existing shared component system. Preserve current behavior, accessibility, translations, filtering semantics, and responsive layouts.

## Pagination

`VirtualMachinesPage` will use `DataTablePagination` directly. The feature-specific `VirtualMachinesPagination` wrapper will be removed after all references are migrated. Page sizes remain 10, 25, and 50, and pagination continues to update URL-backed query state.

## Data Table Toolbar

`DataTableToolbar` will support:

- a callback invoked before the filter panel opens,
- customizable labels for the filter trigger and footer actions,
- arbitrary filter content, including a loading skeleton.

`VirtualMachinesToolbar` remains a feature-level composition layer for VM filter state and fields. Its duplicated search, density selector, overlay, modal shell, and action footer will be replaced by `DataTableToolbar`.

## Tabs

A shared underline-style `Tabs` component will accept typed items, a controlled value, an on-change callback, and an accessible label. It will provide tab roles, selected state, roving focus, and arrow-key navigation.

It will replace local tab buttons in:

- `VirtualMachineDetailPanel`,
- `ProviderDetailPage`.

`FilterTabs` remains separate because it represents a segmented filtering control rather than content navigation.

## Checkbox Field

A shared `CheckboxField` will provide an associated label, native checkbox props, focus and disabled styling, and standard and bordered presentation variants.

It will replace:

- the Datastores toggle in `InfrastructureTopologyToolbar`,
- the Untagged VMs toggle in `VirtualMachinesToolbar`.

## Stat Card

A shared `StatCard` will accept an icon, value, label, helper text, and `sm` or `md` size. Grid placement remains the responsibility of each feature.

It will replace:

- metric articles in `VirtualMachineMetrics`,
- the local `MetricCard` in `ProviderDetailPage`.

## Virtual Machine Table Decision Gate

After the preceding migrations, `VirtualMachinesTable` will be assessed against `DataTable`. Migration proceeds only if:

- all nine columns and rich cell contents are preserved,
- compact mode hides only secondary details,
- pointer and Enter/Space selection remain intact,
- selected-row styling remains intact,
- row keys remain stable even if VM identifiers repeat,
- shared APIs remain domain-neutral.

Small generally reusable `DataTable` extensions are allowed. VM-specific exceptions are not. If these conditions cannot be satisfied cleanly, the table remains implemented with the shared low-level table primitives and the decision is documented.

## Verification

- Add focused tests for new shared components and toolbar extensions.
- Preserve and run VM toolbar, table, detail panel, infrastructure toolbar, and provider tests.
- Run ESLint, TypeScript type checking, the complete test suite, and the production build.
- Review the final diff for dead wrappers and remaining duplicated patterns in scope.
