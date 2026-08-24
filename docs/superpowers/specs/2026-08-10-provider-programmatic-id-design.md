# Provider Programmatic ID Design

## Goal

Use the shared programmatic-ID utilities when creating a provider so provider IDs follow the same normalization and collision rules as recovery-group IDs.

## Scope

The change applies to `src/features/providers-connectors/providers` create mode. Edit mode keeps its existing immutable ID. Provider API contracts, provider types, credentials, and backend endpoints remain unchanged.

## User-visible Behavior

- While the provider ID is empty or still equals the ID derived from the previous provider name, changing `Name` updates `ID` automatically.
- Once the user manually customizes `ID`, later name changes do not overwrite it.
- Leaving the ID field normalizes it through `toProgrammaticId`.
- Creation is blocked when the normalized ID is empty or matches an existing provider ID.
- Submission sends the normalized ID.
- In edit mode, the existing provider ID remains prefilled and disabled.

Examples:

| Input name or ID | Normalized provider ID |
|---|---|
| `Production vCenter` | `production_vcenter` |
| `IBM Power – Žilina` | `ibm_power_zilina` |
| ` FlashCopy @ DR ` | `flashcopy_dr` |

## Architecture

`ProvidersCreateModal` owns form state and validation, so it will own the ID derivation and collision rules. It will import `toProgrammaticId` and `isProgrammaticIdAvailable` directly from `src/shared/utils/programmaticId.ts`.

`ProviderCreateForm` remains presentational. It will report an ID blur event to the modal, while ordinary field changes continue through its existing `onChange` callback.

No provider-specific duplicate normalizer will be introduced. The shared utility remains the single source of truth.

## Data Flow

1. The user types a provider name.
2. In create mode, the modal compares the current ID with the normalized previous name.
3. If the ID has not been customized, the modal updates both `name` and the derived `id`.
4. A manual ID change updates only `id`.
5. On ID blur, the modal stores `toProgrammaticId(id)`.
6. Validation uses `isProgrammaticIdAvailable(id, existingProviderIds)`.
7. Submission sends the normalized ID in `ProviderSubmitData`.

In edit mode, name changes never derive a new ID and the disabled ID input remains unchanged.

## Validation and Errors

- Empty or punctuation-only IDs use the existing required-ID message.
- A normalized collision uses the existing `providers.validation.idExists` message.
- Other provider-field validation and submit error handling remain unchanged.
- Collision checks are client-side protection; the backend remains authoritative for concurrent creates.

## Testing

Tests will cover:

- deriving an ID from the provider name;
- preserving a manually customized ID after later name changes;
- normalizing a manually entered ID on blur and in the submitted payload;
- rejecting a collision that appears only after normalization;
- preserving the locked ID during edit mode;
- existing provider create/edit tests remaining green.

Implementation will follow a test-first red/green cycle, followed by focused provider tests, typecheck, and lint.

