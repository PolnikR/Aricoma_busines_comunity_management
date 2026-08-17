# FlashSystem Detail Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove FlashSystem table-owned information from the volume detail drawer while preserving deeper technical and related-pool data.

**Architecture:** Keep the existing drawer component and narrow its declarative field groups. Remove the duplicated host/provider sections and subtitle values at the presentation boundary; inventory models and fetch flow remain untouched.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Do not add or update dependencies.
- Do not add API calls or change cached inventory data.
- Do not change the FlashSystem table columns or mapped-host badges.
- Do not create a Git commit.
- Preserve unrelated user changes and untracked `.claude/`.

---

### Task 1: Remove table-owned fields from the FlashSystem drawer

**Files:**
- Modify: `src/features/discovery-inventory/resources/components/FlashSystemInventoryView.test.tsx`
- Modify: `src/features/discovery-inventory/resources/components/FlashSystemVolumeDetailPanel.tsx`
- Modify: `src/features/discovery-inventory/resources/components/FlashSystemInventoryView.tsx`

**Interfaces:**
- Consumes: `FlashSystemVolumeResource` and the existing `DetailDrawer`/`DetailRow` API.
- Produces: the existing `FlashSystemVolumeDetailPanel` interface narrowed to labels that the drawer still renders.

- [x] **Step 1: Write the failing integration assertions**

Extend the existing drawer test after opening `FlashSystem volume detail`:

```tsx
expect(within(dialog).queryByText('Status')).not.toBeInTheDocument()
expect(within(dialog).queryByText('Type')).not.toBeInTheDocument()
expect(within(dialog).queryByText('Host mappings')).not.toBeInTheDocument()
expect(within(dialog).queryByText('Provider')).not.toBeInTheDocument()
expect(within(dialog).getByText('Protocol')).toBeInTheDocument()
expect(within(dialog).getByText('Free capacity')).toBeInTheDocument()
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/components/FlashSystemInventoryView.test.tsx --maxWorkers=1
```

Expected: FAIL because the drawer still renders table-owned fields and the host/provider sections.

- [x] **Step 3: Narrow the drawer field groups**

Use these exact groups:

```ts
const fieldGroups = [
  { key: 'identity', fields: ['id', 'volume_id', 'vdisk_UID'] },
  {
    key: 'placement',
    fields: [
      'mdisk_grp_id',
      'parent_mdisk_grp_id',
      'parent_mdisk_grp_name',
      'IO_group_id',
      'IO_group_name',
    ],
  },
  {
    key: 'state',
    fields: ['function', 'protocol', 'fast_write_state', 'formatting', 'encrypt'],
  },
  {
    key: 'copies',
    fields: [
      'FC_id',
      'FC_name',
      'RC_id',
      'RC_name',
      'se_copy_count',
      'compressed_copy_count',
      'RC_change',
    ],
  },
]
```

Remove the complete host mappings section and provider row. Keep the drawer
title as `volume.name`, make the subtitle empty, and keep related pool capacity,
used capacity, and free capacity without the duplicated pool-name row.

- [x] **Step 4: Narrow the label contract**

Remove now-unused `hostMappings`, `host`, `cluster`, `noMappings`, `provider`,
`scsiId`, and pool-row `name` labels from the component prop type and from
`FlashSystemInventoryView`.

- [x] **Step 5: Run focused verification**

Run:

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/components/FlashSystemInventoryView.test.tsx --maxWorkers=1
node node_modules/eslint/bin/eslint.js src/features/discovery-inventory/resources/components/FlashSystemVolumeDetailPanel.tsx src/features/discovery-inventory/resources/components/FlashSystemInventoryView.tsx src/features/discovery-inventory/resources/components/FlashSystemInventoryView.test.tsx --max-warnings 0
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
git diff --check
```

Expected: all commands exit with code `0`; no dependency, API, or unrelated
files appear in the diff.
