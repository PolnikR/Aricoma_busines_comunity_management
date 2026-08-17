# Shared Recovery Form Controls Design

## Goal

Replace native labels, inputs, and selects in the recovery application UI with the shared controls from `FormControls.tsx`. Preserve all existing form state, validation, callbacks, and user-visible behavior while making the shared controls suitable for future compact forms.

## Shared control API

- `Input` and `Select` support `size="sm" | "md"`.
- `md` remains the default so existing consumers do not change visually.
- `sm` provides the compact control dimensions needed by tier cards and the VM sidebar.
- `Input` supports an `invalid` boolean that applies the shared error border and focus styling while forwarding `aria-invalid`.
- `className` remains available for exceptional presentation needs, not routine sizing or validation.
- `Field` continues to own the label, `htmlFor` association, and control content.

## Component migration

- `AppMetadataForm.tsx` uses `Field`, `Input`, and `Select` with the default size.
- `AddTierCard.tsx` uses compact `Field` and `Input` controls for ID and name. The description remains a textarea wrapped by `Field`.
- The edit form in `TierCard.tsx` follows the same pattern and uses `invalid` for ID and name errors.
- `VMSidebar.tsx` uses a compact shared `Input` for search.

Every migrated control receives a stable `id` matched by its `Field.htmlFor`.

## Compatibility

No state shape, validation rule, event callback, translation key, or submit behavior changes. Existing shared-control consumers keep the default `md` appearance.

## Verification

- Run focused recovery application component tests.
- Run ESLint and TypeScript type checking.
- Run the complete test suite and production build.
