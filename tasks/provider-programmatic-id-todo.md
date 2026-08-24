# Task Checklist: Provider Programmatic IDs

## Regression Tests

- [x] Name derives `new_provider` from `New Provider`.
- [x] Manual custom ID survives later name changes.
- [x] ID blur normalizes spaces and punctuation.
- [x] Normalized collision blocks create.
- [x] Red test run confirms the old behavior fails.

## Implementation

- [x] Add ID blur callback to the presentational form.
- [x] Use shared `toProgrammaticId` and `isProgrammaticIdAvailable` in the modal.
- [x] Normalize submitted ID.
- [x] Preserve locked edit IDs.

## Verification

- [x] Focused provider tests pass.
- [x] Provider feature tests pass.
- [x] Typecheck passes.
- [x] Lint passes.
- [x] Final diff contains no unrelated changes.
