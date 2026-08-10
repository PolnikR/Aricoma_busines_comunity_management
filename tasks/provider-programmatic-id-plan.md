# Implementation Plan: Provider Programmatic IDs

## Overview

Make provider creation use the shared programmatic-ID utility with the same name-derived ID, normalization, and collision behavior already used by recovery groups. Preserve the existing locked-ID edit behavior.

## Architecture Decisions

- Keep ID state and validation in `ProvidersCreateModal`, where existing providers and create/edit mode are available.
- Keep `ProviderCreateForm` presentational; add only an ID blur callback.
- Use `toProgrammaticId` and `isProgrammaticIdAvailable` from `src/shared/utils/programmaticId.ts`; add no provider-specific duplicate implementation.
- Normalize again at submit so Enter-key submission cannot bypass blur normalization.

## Task List

### Phase 1: Regression Tests

- [x] Add tests for name-derived IDs, manual-ID preservation, blur normalization, and normalized collision rejection.
- [x] Run the focused provider modal tests and confirm the new expectations fail for the current implementation.

### Checkpoint: RED

- [x] Failures identify missing shared-ID behavior rather than fixture or tooling errors.

### Phase 2: Implementation

- [x] Wire ID blur from `ProviderCreateForm` to the modal.
- [x] Derive the ID from name only while the user has not customized it.
- [x] Validate normalized IDs with the shared collision helper.
- [x] Submit the normalized ID while leaving edit-mode IDs locked.

### Checkpoint: GREEN

- [x] Provider component/API tests pass.
- [x] Typecheck and lint pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Name changes overwrite an intentional custom ID | High | Derive only when current ID is empty or equals the previous normalized name. |
| Enter submission bypasses ID blur | Medium | Normalize during validation/submission as well as on blur. |
| Edit mode changes an existing provider key | High | Keep the existing disabled ID field and use the current provider ID as the edit exception. |

## Open Questions

None. Behavior was approved in the design review.
