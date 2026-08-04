# FlashSystem Detail Panel Deduplication

## Goal

Keep the FlashSystem volume detail drawer focused on information that is not
already available in the inventory table or its mapped-host badges.

## Approved information hierarchy

The table remains the primary source for:

- volume name;
- status;
- volume capacity;
- pool;
- volume type;
- mapped hosts and their hover details;
- copy count;
- FlashCopy map count;
- provider.

The drawer keeps only deeper technical information:

- identity identifiers: `id`, `volume_id`, and `vdisk_UID`;
- placement details: parent pool identifiers and I/O group identifiers/names;
- behavior details: function, protocol, fast-write state, formatting, and
  encryption;
- copy relationships that are not table counters: FlashCopy and remote-copy
  identifiers/names, space-efficient/compressed copy counts, and RC change;
- related pool capacity, used capacity, and free capacity.

The following drawer content is removed because it duplicates the table:

- `volume_name`;
- volume `capacity`;
- `mdisk_grp_name`;
- `status`;
- `type`;
- `fc_map_count`;
- `copy_count`;
- provider row;
- the complete host mappings section;
- provider and status from the drawer subtitle.

The drawer title stays as the selected volume name because it identifies which
record is open; it is navigation context, not a repeated detail row.

## UI behavior

Existing drawer structure, resizing, close behavior, spacing, typography, and
responsive behavior remain unchanged. Empty technical values continue to render
as `-`. A section is rendered only when it still owns at least one technical
field.

## Data and architecture

This is a presentation-only change in `FlashSystemVolumeDetailPanel`. It does
not alter models, inventory mapping, caching, fetching, APIs, dependencies, or
the FlashSystem table.

## Verification

- An integration test opens the drawer and proves table-owned labels and values
  are absent from it.
- The same test proves deeper technical fields and related pool capacity remain
  available.
- Focused tests, lint, TypeScript, and the production build pass.

