# Features Quality Fixes

## Scope

Implement findings 1, 2, 4, 6, 7, and 8 from the full `src/features`
review. Finding 3 remains unchanged because the backend currently represents an
unsupported filtered discovery request with HTTP 500 and the frontend is
expected to display an empty result for that response.

## Design

### Recovery tier identifiers

Tier identifiers will be normalized before validation. Creation and editing
will use one shared utility so that uniqueness is checked against the exact key
that will be written to the tiers `Map`. A normalized identifier that already
belongs to another tier will be rejected instead of overwriting it.

### Provider creation and cache updates

Create mode will reject an identifier already present in
`existingProviders`. Edit mode will continue to use its locked existing
identifier. Provider upserts will update the current React Query cache through
a functional updater instead of rebuilding it from a provider-list snapshot
captured when the mutation started.

### Recovery DAG response

The successful JSON response from `submit_recovery_dag` will be parsed with a
Zod schema containing `status`, `filename`, and the backend's local persisted
path field `local`. Invalid 2xx
responses will be treated as errors and will not trigger success navigation.

### Unsaved changes

Create and edit pages will share a navigation-guard hook. When dirty, the guard
will intercept React Router navigation and browser unload. In-app navigation
will use the existing shared confirmation dialog. Cancelling stays in the
builder; continuing retries the blocked navigation once. Successful save
clears the dirty state before navigating.

### Localization

Remaining user-facing hardcoded strings under `src/features` will be moved to
the EN, SK, and CS locale files. This includes headings, descriptions, loading,
error and empty states, validation messages, modal content, buttons,
`aria-label` values, and title text. Backend values, identifiers, provider
product names, paths, and other technical data will remain unchanged.

## Testing

- Tier creation and editing tests will cover normalized collisions and valid
  identifiers.
- Provider modal tests will cover duplicate create IDs, while mutation tests
  will cover concurrent cache changes.
- Recovery API tests will cover valid and invalid successful responses.
- Builder and editor page tests will cover router navigation, cancellation,
  confirmation, successful save, and `beforeunload`.
- Component tests and locale parity checks will cover the newly translated UI.
- Final verification will run lint, typecheck, tests, locale JSON validation,
  key parity, and `git diff --check`.

## Non-goals

- Do not change the filtered discovery HTTP 500 handling.
- Do not add keyboard drag-and-drop alternatives in this change.
- Do not change backend contracts or install dependencies.
