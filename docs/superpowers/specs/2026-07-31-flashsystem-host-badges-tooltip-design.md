# FlashSystem Host Badges and Tooltip

## Goal

Make mapped FlashSystem hosts recognizable and inspectable without adding
another page, panel, tab, or visible action button to the already dense Resource
Inventory interface.

## Table presentation

The `Mapped hosts` cell renders mapped hosts as subtle outline badges that match
the selected visual variant A:

- white background
- restrained blue-gray border
- small host icon
- compact typography
- truncated long host names
- hover cursor indicating contextual information

The cell displays at most two host badges. When more hosts are mapped, a compact
`+N` indicator represents the remaining hosts. Badges stay on one visual line so
the table row height does not grow with host count.

The host badge is contextual information, not an action that navigates away.
There is no new page, drawer, modal, or visible button.

## Host summary model

Host summaries are derived client-side from the already fetched,
provider-scoped FlashSystem inventories. No additional API request is made.

Each summary contains:

- provider ID
- host ID and name
- cluster ID and name, when present
- unique mapped volumes
- SCSI/LUN ID for every volume mapping
- number of mapped volumes
- total mapped capacity calculated from capacities with recognized units

Host identity is always provider-scoped so equal host IDs from two FlashSystem
providers cannot be merged.

## Tooltip behavior

Hovering a host badge or moving keyboard focus to it opens an anchored tooltip.
On touch devices, tapping the badge toggles it. The tooltip closes on pointer
leave, focus loss, Escape, or tapping outside.

The tooltip displays:

1. host name
2. host ID
3. cluster name, or a localized "Not assigned" value
4. mapped-volume count
5. total mapped capacity, or a localized unavailable value
6. mapped volumes in the form `Volume name · LUN N`

The mapped-volume list displays at most five rows without scrolling. Starting
with the sixth volume, only that list receives a vertical scrollbar. The tooltip
header and summary remain fixed and visible.

Hovering or focusing the `+N` indicator opens a compact tooltip listing the
remaining host names. It does not duplicate all host summaries.

Tooltip placement must remain inside the viewport and must not affect table
layout.

## Cluster readiness

The current API normally returns `cluster_id: null`, an empty `cluster_name`,
and an empty `clusters` object. In that case, the tooltip displays a localized
"Not assigned" value.

When the existing payload later contains a cluster association, the same host
summary and tooltip use the returned cluster ID and name without requiring a UI
redesign. Unknown extra cluster fields remain data-layer values and are not
rendered automatically.

## Accessibility

- Every host badge is keyboard-focusable without using a visible button style.
- The focused badge has a visible focus ring.
- Badge accessible names identify the host and indicate that more information is
  available.
- Tooltip content is connected to its badge with `aria-describedby`.
- Escape closes the active tooltip.
- Tooltip information is available through hover, focus, and touch.
- The `+N` indicator has an accessible label containing the number of additional
  hosts.

## Localization

All tooltip labels and empty/unavailable values are added to EN, SK, and CS
translation catalogs. API values such as host names, volume names, IDs, and LUN
numbers are displayed unchanged.

## Component boundaries

- A pure helper derives provider-scoped host summaries from volume resources.
- A focused host badge component owns badge and tooltip interaction.
- A small host-cell component enforces the two-badge limit and `+N` behavior.
- FlashSystem column configuration receives the host-cell renderer without
  owning aggregation logic.

No topology-specific tooltip component is imported into the resource table.
Shared low-level positioning behavior may be extracted only if it remains
generic and does not couple the two features.

## Testing

Automated coverage includes:

- provider-scoped aggregation for equal host IDs
- unique volume counting and mapped-capacity totals
- correct SCSI/LUN mapping per volume
- two visible badges and `+N` overflow behavior
- tooltip opening through hover and focus
- Escape and focus-loss closing
- five visible volume rows with internal scrolling for larger lists
- localized labels and missing-cluster state
- no additional inventory/API request
- unchanged table row structure and volume-row selection behavior

## Non-goals

- A host detail page or drawer
- A cluster detail page or drawer
- New API endpoints
- Editing host or cluster configuration
- Dependency changes
- Committing the implementation

## Acceptance criteria

1. Mapped hosts are visually distinct without increasing normal row height.
2. At most two host badges and one `+N` indicator are visible in a cell.
3. Host details are available through an accessible localized tooltip.
4. More than five mapped volumes scroll inside the tooltip list only.
5. Host aggregation never crosses provider boundaries.
6. Missing cluster data is handled without an empty or broken layout.
7. Existing row selection, volume detail, filters, and pagination continue to
   work.
