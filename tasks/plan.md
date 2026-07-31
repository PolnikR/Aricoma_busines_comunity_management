# Implementation Plan: FlashSystem Detail Deduplication

## Overview

Remove from the FlashSystem volume drawer every data point already owned by the
inventory table or mapped-host badge interaction. Preserve only deeper
technical identifiers, behavior/copy relationships, and related-pool capacity.

## Architecture Decisions

- Narrow the existing declarative `fieldGroups`; do not add a new component.
- Remove host/provider presentation from the drawer; do not change data models.
- Keep the volume name only as drawer navigation context.

## Task List

### Phase 1: Regression contract

- [x] Add failing assertions for duplicate fields and preserved technical data.

### Checkpoint: RED

- [x] The focused test fails because current duplicate content is still present.

### Phase 2: Presentation change

- [x] Remove duplicated fields, host section, provider row, and subtitle values.
- [x] Remove unused label props from the drawer boundary.

### Checkpoint: Complete

- [x] Focused test passes.
- [x] Lint, TypeScript, production build, and diff checks pass.
- [x] No API, dependency, table, badge, or unrelated-file changes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Remove a deeper field accidentally | Medium | Assert protocol and pool free capacity remain visible |
| Leave a duplicate in the subtitle | Medium | Render an empty subtitle and assert table-owned status is absent |
| Leave dead label props | Low | Narrow the TypeScript label contract and run typecheck |

## Open Questions

None. The user approved removal of the complete host mappings section.
