# Provider Page Colocation Design

## Goal

Colocate the providers catalogue page with the provider domain that owns its
API, components, helpers, model, and detail page.

## Change

Move these files:

- `src/features/providers-connectors/pages/ProvidersPage.tsx`
- `src/features/providers-connectors/pages/ProvidersPage.test.tsx`

to:

- `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`
- `src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx`

Update the `ProvidersPage` import in `src/app/AppRoutes.tsx` and adjust the
page's relative imports for its new location.

## Behavior and Boundaries

This is a structural refactor only. Routes, rendered UI, data fetching,
translations, error handling, and public component behavior remain unchanged.
No compatibility re-export remains in the old `pages` directory because the
application has a single known production import in `AppRoutes.tsx`.

The target provider page directory will contain both the catalogue and detail
route components, matching the feature-owned structure documented for
providers.

## Verification

- Run the colocated `ProvidersPage` test.
- Run TypeScript type checking.
- Run linting.
- Confirm no imports reference the old page path.
