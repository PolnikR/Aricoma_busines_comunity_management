# Shared Button Variants Design

## Goal

Move repeated button styling from recovery, provider, and application-shell components into the shared `Button`. Preserve current behavior and visual intent while providing reusable variants for future features.

## Shared API

`Button` will support these semantic variants:

- `primary` for Save, Create, Confirm, Edit, and Close actions.
- `secondary` for filled neutral actions.
- `outline` for bordered neutral actions.
- `danger` for destructive actions.
- `soft` for low-emphasis informational actions such as viewing JSON.
- `ghost` for transparent actions.

The existing `sm`, `md`, and `icon` sizes remain. An `xs` size will support compact table actions. A `fullWidth` boolean will provide full-width presentation without repeating `w-full`.

Layout-specific classes such as `flex-1` and responsive visibility remain with consumers because they describe placement rather than button appearance.

## Migration Scope

- Save in `RecoveryAppBuilder.tsx`.
- Create and Cancel in `AddTierCard.tsx`.
- Confirm and Cancel in the `TierCard.tsx` edit form.
- Edit and Delete in the `TierCard.tsx` footer.
- Close, JSON/View, and detail-drawer Edit/Delete in `RecoveryApplicationsTable.tsx`.
- Cancel and Create/Edit in `ProvidersCreateModal.tsx`.
- Detail-drawer Edit/Delete in `ProvidersCatalogueTable.tsx`.
- Mobile menu toggle in `AppHeader.tsx`.

## Compatibility

Click handlers, button types, disabled states, titles, ARIA labels, translations, and conditional labels remain unchanged. Existing shared Button consumers continue to compile and retain supported variants and sizes.

## Verification

- Run focused recovery, provider, and header tests.
- Run ESLint and TypeScript type checking.
- Run the complete test suite and production build.
- Review the final diff for native buttons remaining in the agreed scope.
