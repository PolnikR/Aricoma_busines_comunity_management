# Virtual Machines loading skeleton

## Goal

Replace the coarse Virtual Machines loading placeholders with a presentation skeleton that closely matches the loaded page. The transition from loading to content should preserve the page hierarchy and approximate dimensions, reducing visible layout shift.

## Design

The page header remains real content while the data area uses a dedicated `VirtualMachinesSkeleton` component colocated with the Virtual Machines feature.

The skeleton mirrors these loaded sections:

1. Four responsive metric cards with icon, label, and value placeholders.
2. The inventory card heading.
3. The table toolbar with search and filter control placeholders.
4. A table header and six representative data rows.
5. The pagination footer.
6. The virtual-machine detail panel with title, status, summary, and property placeholders.

At narrow widths the metric cards and inventory/detail areas follow the same stacking behavior as the loaded page. At desktop widths the detail panel occupies the same right-hand column as the real component.

## Visual treatment and accessibility

Skeleton surfaces reuse the existing Virtual Machines borders, backgrounds, radii, spacing, and responsive grid definitions. Placeholder shapes use a subtle pulse animation and reflect the expected content length instead of appearing as undifferentiated solid panels.

The skeleton container exposes `aria-busy="true"` and an accessible loading label. Decorative placeholders remain hidden from assistive technology. No inactive controls are rendered as interactive elements.

## Data and state behavior

The detailed skeleton is rendered only during the initial pending query when no data is available. Background refreshes keep the existing data visible and continue to use the current compact `Updating` indicator. Error and empty states remain unchanged.

## Component boundary

The skeleton moves out of `VirtualMachinesPage.tsx` into:

`src/features/discovery-inventory/virtual-machines/components/VirtualMachinesSkeleton.tsx`

It has no props and no dependency on API data. `VirtualMachinesPage` remains responsible for selecting loading, error, empty, and loaded states.

## Verification

- Run the existing test suite and production build.
- Confirm that the initial loading state matches the loaded structure at mobile and desktop widths.
- Confirm that the page does not expose focusable placeholder controls.
- Confirm that background refresh does not replace loaded content with the skeleton.
