# VM Tags in Detail Panel — Design

**Date:** 2026-07-21
**Status:** Approved

## Problem

The discovery inventory API response ([`public/fixtures/apiResponse.json`](../../../public/fixtures/apiResponse.json)) returns each virtual machine with a `tags` array (e.g. `"tags": ["DEV/MNGT"]`, though most VMs have `[]`). This attribute is discarded at every layer of the frontend pipeline and is never shown to the user. The goal is to surface a VM's tags in the VM **detail panel**.

## Scope

Detail panel only. No table column and no tag filter in this change.

## Data flow

The `tags` attribute must be threaded through the existing two-stage mapping pipeline:

`apiResponse.json` → Zod schema → `DiscoveredVirtualMachine` → `VirtualMachine` → detail panel.

### Edits

1. **`src/features/discovery-inventory/api/discoveryInventoryApi.ts`**
   - Add `tags: z.array(z.string()).catch([])` to `virtualMachineSchema`.
   - Map `tags` into the `DiscoveredVirtualMachine` result in `mapVirtualMachine`.
2. **`src/features/discovery-inventory/model/discoveryTypes.ts`**
   - Add `tags: string[]` to the `DiscoveredVirtualMachine` interface.
3. **`src/features/discovery-inventory/virtual-machines/api/virtualMachinesApi.ts`**
   - Pass `tags: vm.tags` through in `mapVirtualMachine`.
4. **`src/features/discovery-inventory/virtual-machines/types.ts`**
   - Add `tags: string[]` to the `VirtualMachine` interface.
5. **`src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.tsx`**
   - Add a dedicated **Tags** row to the `<dl>` block after "Snapshots".

## Rendering

A dedicated Tags row rendering each tag as a rounded pill/badge, consistent with the existing badge styling in the panel header. When `tags` is empty, render `-` (matching the existing empty-value convention in `DetailRow`).

Because tags are an array rather than a scalar string, this row does not reuse the scalar `DetailRow` component; it uses a small dedicated layout (label on the left, wrapped pills on the right).

## Error handling

The Zod `.catch([])` guard means a missing or malformed `tags` field degrades to an empty array. No layer needs to handle `undefined` tags, and empty arrays render as `-`.

## Testing

The existing fixture already covers both states:
- `ADAMSRV01` (moId `vm-15754`) has `tags: ["DEV/MNGT"]` — verifies the populated pill state.
- The majority of VMs have `tags: []` — verifies the empty `-` state.

Both are verifiable by selecting the respective rows in the running app.