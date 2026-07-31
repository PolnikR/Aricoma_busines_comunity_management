# Discovery Inventory Production Hardening

## Goal

Make the Discovery Inventory implementation production-ready by resolving the
review findings for data identity, provider isolation, error handling, terminal
UI states, localization, accessibility, and regression coverage.

Dependency upgrades and dependency-audit remediation are explicitly outside the
scope of this change.

## Scope

The change covers the VMware, IBM FlashSystem, and IBM Power inventory flows
under `src/features/discovery-inventory`.

It preserves the existing page composition and provider-first fetch flow.
FlashSystem and Power continue to use provider-scoped TanStack Query entries.
This hardening does not migrate VMware to a new query architecture.

## Resource identity

Every rendered resource must have a non-empty identifier that is unique within
the combined provider inventory.

### IBM Power

The mapper selects the first non-empty normalized value from:

1. `PartitionUUID`
2. `LogicalSerialNumber`
3. `PartitionID`
4. `PartitionName`
5. a deterministic fingerprint of the normalized partition data
6. the source position as the final collision suffix

The identifier remains namespaced by provider ID and partition kind. Duplicate
candidate identifiers receive a deterministic occurrence suffix so React keys
remain unique.

### IBM FlashSystem

The mapper prefers the non-empty backend volume ID. If it is missing, it derives
an identity from stable fields such as UID, volume ID, name, and pool identity.
Duplicate candidates receive a deterministic occurrence suffix.

The API schema remains tolerant enough to display otherwise valid inventory.
Missing identifiers do not reject the complete provider response.

No raw payload data is written to the browser console. A mapper-level diagnostic
result or application telemetry hook may record an identifier fallback without
exposing credentials or the full payload.

## Provider-safe FlashSystem filters

Pool and host option values use composite identifiers containing both
`providerId` and the source pool or host ID.

Filtering compares both parts of the composite identity. Provider labels are
included when necessary to distinguish equal pool or host names. Selecting or
clearing a provider cannot accidentally include resources from another provider.

Existing status filtering and free-text search remain unchanged.

## FlashSystem table columns

The compact inventory table shows only the operational fields needed for
scanning and selection, in this order:

`Volume | Status | Capacity | Pool | Type | Mapped hosts | Copies | FlashCopy maps | Provider`

I/O group, protocol, copy identifiers, and the remaining API attributes stay in
the volume detail drawer.

## API and error behavior

HTTP 500 responses from the VMware inventory endpoint remain errors. They are
never converted to an empty successful inventory.

Only a documented backend response that explicitly means an empty inventory may
map to an empty result.

Components do not render raw `Error.message`, backend bodies, or Zod validation
details. Users receive localized, source-specific generic messages. Detailed
errors remain available to the query/error boundary and approved telemetry.

Partial provider failure continues to display resources returned by healthy
providers and identifies failed provider names without exposing internal error
details.

## Loading and terminal states

Metric skeletons render only while the relevant provider or inventory query is
pending.

Provider failure, no configured provider, empty inventory, and complete source
failure are terminal states. They render stable localized feedback instead of an
indefinite skeleton.

Refreshing retains cached data where available while clearly indicating
background refresh without replacing the table with an empty state.

## Localization

All newly introduced user-facing strings use the existing translation system for
every supported locale.

This includes:

- FlashSystem detail section names and field labels
- SCSI labels
- IBM Power boolean values
- generated Power field labels
- metric helper text and provider/error messages

Unknown API field names may use a safe formatted fallback, but known fields use
explicit translation keys.

## Detail drawer accessibility

The shared detail drawer:

- moves focus to the drawer or its close control when opened
- traps Tab and Shift+Tab within the modal drawer
- closes on Escape
- restores focus to the element that opened it
- keeps its existing dialog name and `aria-modal="true"`

Focus behavior is implemented in the shared drawer so all current consumers
receive the same behavior.

## Testing

Regression coverage includes:

- empty and duplicate Power identifiers
- empty and duplicate FlashSystem identifiers
- equal pool and host IDs across multiple providers
- VMware HTTP 500 propagation
- generic user-facing errors without internal validation details
- partial and complete provider failures
- terminal no-provider and error metric states
- provider-scoped cache reuse when switching resource tabs
- representative complete FlashSystem and Power payload fixtures
- FlashSystem and Power table/detail fields
- multi-provider metric aggregation
- translated labels and boolean values
- initial focus, focus trap, Escape close, and focus restoration

Existing lint, TypeScript checks, the complete Vitest suite, production build,
and `git diff --check` must pass.

## Non-goals

- Dependency upgrades or audit remediation
- Lockfile changes
- Backend API redesign
- VMware migration to the FlashSystem/Power multi-query implementation
- Changes outside Discovery Inventory except the shared detail drawer and
  translation resources required by its consumers
- Committing the implementation

## Acceptance criteria

1. Every displayed resource has a non-empty unique row identifier.
2. Pool and host filtering never crosses provider boundaries unintentionally.
3. Server failures are visible as failures and are not represented as empty data.
4. No raw backend or validation error is rendered to users.
5. Loading indicators stop for every terminal state.
6. New inventory and detail text is localized in every supported locale.
7. The detail drawer satisfies keyboard focus requirements.
8. The listed regression scenarios are automated.
9. All repository quality checks pass.
10. Dependency files and `.claude/` remain untouched.
