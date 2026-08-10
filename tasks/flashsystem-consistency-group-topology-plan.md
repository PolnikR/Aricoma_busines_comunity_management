# Implementation Plan: FlashSystem Consistency Group Topology

## Overview

Align the frontend topology mapper with the real `consistency_group` tree returned by the FlashSystem API. The API path `pool -> consistency_group -> fcmap -> source volume -> target volume` will become structural edges through the source volume and one semantic `copies` edge from source to target.

## Architecture Decisions

- Keep the API contract and data types unchanged; the response already contains all required nodes and roles.
- Preserve structural edges from pool through FC map to the source volume.
- Represent the source-to-target relationship only as `copies`, avoiding a duplicate `contains` edge.
- Continue deduplicating volumes by their topology node ID when a source is referenced by multiple FC maps.

## Task List

### Phase 1: Regression Test

- [x] Replace the synthetic consistency-group fixture with the real API nesting shape.
- [x] Assert the exact structural and semantic edges: pool to group, group to FC map, FC map to source, and source to target via `copies` only.
- [x] Run the focused test and confirm it fails because the FC map-to-source edge is missing and the source-to-target `contains` edge is present.

### Checkpoint: RED

- [x] The focused test fails for the expected mapper behavior, not because of fixture or tooling errors.

### Phase 2: Minimal Mapper Fix

- [x] Change traversal so a volume directly below an FC map retains its structural parent.
- [x] Suppress the structural edge only for a target volume nested below a source volume.
- [x] Keep creation of the semantic `copies` edge unchanged.

### Checkpoint: GREEN

- [x] Focused mapper tests pass.
- [x] Discovery-inventory infrastructure tests pass.
- [x] Typecheck and lint pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Snapshot view changes accidentally | Medium | Retain its existing expected edges in the focused test suite. |
| Target receives both `contains` and `copies` edges | Medium | Assert explicitly that no structural edge targets the snapshot target. |
| Shared source volume becomes duplicated | Low | Keep ID-based node deduplication and the existing multi-FC-map regression test. |

## Open Questions

None. The supplied production API response defines the required nesting and the proposed visual semantics were approved in the preceding discussion.
