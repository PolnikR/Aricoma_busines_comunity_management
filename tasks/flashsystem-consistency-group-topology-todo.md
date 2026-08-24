# Task Checklist: FlashSystem Consistency Group Topology

## Regression Test

- [x] Model `pool -> consistency_group -> fcmap -> source -> target` exactly.
- [x] Assert `pool -> consistency_group` contains edge.
- [x] Assert `consistency_group -> fcmap` contains edge.
- [x] Assert `fcmap -> source` contains edge.
- [x] Assert `source -> target` copies edge.
- [x] Assert no `source -> target` contains edge.
- [x] Confirm the focused test fails for the expected reason.

## Mapper Fix

- [x] Preserve the FC map-to-source structural edge.
- [x] Suppress only the source-to-target structural edge.
- [x] Keep snapshot and flat behavior unchanged.

## Verification

- [x] Focused mapper test passes.
- [x] Infrastructure feature tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Review final diff for unrelated changes and secrets.
