# Implementation Plan: Recovery Application VM Selection

## Overview

Add an accessible checkbox selection mode to recovery-application tier cards. All recovery-group VMs start selected, users can exclude and restore individual VMs, and only the application-local VM snapshot changes.

## Architecture Decisions

- Keep the recovery-group query data immutable and use it only as the complete option source.
- Keep selected VM names in the existing `RecoveryTier.recovery_group.vms` payload model.
- Extend the shared resource card with an optional selection mode while preserving existing remove-item behavior.

## Task List

### Phase 1: Regression contract
- [x] Add failing shared-card, tier-card, canvas, and builder tests.

### Checkpoint: RED
- [x] Focused tests fail because checkbox selection is not implemented.

### Phase 2: Vertical implementation
- [x] Propagate recovery-group VM options and toggle events through builder, canvas, and tier card.
- [x] Render native checkboxes, selected count, excluded styling, and a bounded scroll area.
- [x] Add English, Slovak, and Czech selection-summary translations.

### Checkpoint: Complete
- [x] Focused tests pass.
- [x] Lint and TypeScript checks pass.
- [x] Source recovery-group data remains unchanged after an application VM toggle.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Shared card regression | Medium | Make selection behavior opt-in and keep existing tests |
| Stale group membership | Medium | Render the union of current group options and saved selections |
| Accidental recovery-group mutation | High | Immutable builder update plus regression assertion |

## Open Questions

None. The visual design and checkbox behavior were approved.
