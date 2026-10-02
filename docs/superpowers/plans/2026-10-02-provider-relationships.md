# Plan: Provider Relationships

Spec: [2026-10-02-provider-relationships-design.md](../specs/2026-10-02-provider-relationships-design.md)
Template (content only): [2026-10-02-provider-relationships-helper-template.html](../specs/2026-10-02-provider-relationships-helper-template.html)

All paths below are relative to `src/features/providers-connectors/providers/` unless stated otherwise. Every task is test-first: write or adjust the failing test, then implement, then re-run.

## Dependency graph

```
T1 providerCategory ──┬─> T2 resolveProviderTopology ──┬─> T5 drawer/detail backing row
                      │                                └─> T6 buildRelationshipRows ─> T7 ProviderRelationshipsContent ─> T8 ProviderHelpHoverCard ─> T9 wiring
                      ├─> T3 ProviderCreateForm ─> T4 ProvidersCreateModal
```

Commit boundaries follow the approved order: **C1** = T1–T2, **C2** = T3–T5, **C3** = T6–T9.

---

## Commit 1: classifier and resolver

### T1. `model/providerCategory.ts`
- **Do:**
  - Add `COMPUTE_PROVIDER_TYPES`, `STORAGE_PROVIDER_TYPES` and `PARTNER_PROVIDER_TYPES`, each typed `as const satisfies readonly ProviderType[]`.
  - Add the three `is…ProviderType(type: string)` predicates.
  - Add a module comment that a backend category, when added, replaces this classification.
- **Acceptance:**
  - The four infrastructure types classify as the spec table says.
  - `HITACHI` is storage but not partner-capable.
  - `''` and unknown types are false everywhere.
- **Files:** `model/providerCategory.ts`, `model/providerCategory.test.ts`

### T2. `helpers/resolveProviderTopology.ts`
- **Do:** implement the types and `resolveProviderTopology`, following the spec's Part 1 rules exactly.
- **Acceptance:** every resolver case listed in the spec's testing strategy:
  - resolved, unresolved and mismatch, for both backing storage and partner
  - mutual merge and one-way partners
  - no reverse relationship is ever created
  - order is preserved
  - fixtures use arbitrary ids
- **Files:** `helpers/resolveProviderTopology.ts`, `helpers/resolveProviderTopology.test.ts`

**Verify C1:**

```
npm exec vitest run src/features/providers-connectors/providers/model/providerCategory.test.ts src/features/providers-connectors/providers/helpers/resolveProviderTopology.test.ts
npx eslint src/features/providers-connectors/providers/model/providerCategory.ts src/features/providers-connectors/providers/model/providerCategory.test.ts src/features/providers-connectors/providers/helpers/resolveProviderTopology.ts src/features/providers-connectors/providers/helpers/resolveProviderTopology.test.ts --max-warnings 0
node scripts/orval/check-feature-layout.mjs
git diff --check
```

Commit message: `feat: add provider category classifier and relationship resolver`

---

## Commit 2: form, drawer and detail aligned with the backend contract

### T3. `components/ProviderCreateForm.tsx`
- **Do:**
  - Replace the `storageProviders` prop with `backingStorageProviders` and `partnerProviders`.
  - Gate the backing field with `isComputeProviderType(data.type)`.
  - Gate the partner field with `isPartnerProviderType(data.type)`.
  - Keep excluding self from partner options inside the form (existing logic).
- **Acceptance:**
  - `IBM_POWER` shows the backing field.
  - `HITACHI` shows neither the partner nor the backing field.
  - Backing options come from `backingStorageProviders` and partner options from `partnerProviders`.
  - The "unavailable" options still render.
- **Files:** `components/ProviderCreateForm.tsx`, `components/ProviderCreateForm.test.tsx`

### T4. `components/ProvidersCreateModal.tsx`
- **Do:**
  - Pass `backingStorageProviders = existingProviders.filter(p => isStorageProviderType(p.type))`.
  - Pass `partnerProviders = existingProviders.filter(p => isPartnerProviderType(p.type))`.
  - On a type change, clear backing storage when `!isComputeProviderType(value)` and clear the partner on any change of type.
  - Submit `backingStorageProviderIds` when `isComputeProviderType(type)`.
- **Acceptance (tests):**
  - `IBM_POWER` submits its backing ids.
  - Hitachi appears in backing candidates and not in partner candidates.
  - `VMWARE` → `IBM_POWER` keeps backing storage.
  - `IBM_POWER` → `VMWARE` keeps backing storage.
  - Compute → `FLASHCOPY` and compute → `HITACHI` clear backing storage, and the submitted body has no backing ids.
  - `FLASHCOPY` → `HITACHI` clears the partner.
  - The existing tests are updated for the new vendor-neutral labels ("Backing storage providers"). Partner labels are unchanged.
- **Files:** `components/ProvidersCreateModal.tsx`, `components/ProvidersCreateModal.test.tsx`

### T5. Backing storage row and translations
- **Do:**
  - **Drawer** (`ProvidersCatalogueTable.tsx`):
    - Switch the partner row condition to `isPartnerProviderType`.
    - Add a "Backing storage" `DetailRow` for compute providers, built from a memoized `resolveProviderTopology(allProviders)`.
  - **Detail page** (`ProviderDetailPage.tsx`): same backing item, built from the loaded `providers`.
  - **Locales** (en/sk/cs):
    - Rewrite `forms.backingStorageProviders*` to vendor-neutral texts.
    - Add `details.backingStorage`, `details.backingStorageNone`, `details.backingStorageUnavailable` and `details.relationshipMismatch`.
- **Acceptance:**
  - Resolved targets show `Name (id)`, unresolved show `id (Unavailable)`, a mismatch shows the mismatch marker, and an empty list shows `None`.
  - The row is absent for storage providers.
  - The partner row is unchanged.
- **Files:** `components/ProvidersCatalogueTable.tsx` (+test), `pages/ProviderDetailPage.tsx` (+test), `src/locales/{en,sk,cs}.json`

**Verify C2:**

```
npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx src/locales/detailDrawerHelpTranslations.test.ts
npx eslint <changed .ts/.tsx files> --max-warnings 0
npm run typecheck
git diff --check
```

Commit message: `feat: align provider backing storage and partner fields with backend contract`

---

## Commit 3: drawer hover/focus help with relationship content

### T6. `helpers/buildRelationshipRows.ts`
- **Do:** write a pure view model from `ProviderTopology` covering:
  - compute rows in API order, with stacked targets
  - each target's partner as `full` on first occurrence and `compact` afterwards
  - direction `both`, `out` or `in`
  - the `otherStorageRows` selection
- **Acceptance:**
  - Every case in the spec's `buildRelationshipRows` tests passes.
  - No React imports.
- **Files:** `helpers/buildRelationshipRows.ts`, `helpers/buildRelationshipRows.test.ts`

### T7. `components/ProviderRelationshipsContent.tsx`
- **Do:**
  - Render the template v2 content from the view model: section heading, three intro sentences, legend, the "Compute providers" list and "Other storage relationships".
  - Render the card and connector states. Hidden direction text goes on connectors and `aria-hidden` on arrows.
  - Accept `isLoading` and `isError`, showing skeleton rows and muted text for them.
  - Add locale keys under `providers.relationships.*` in en, sk and cs.
- **Locale key placement:** the keys must **not** go under `providers.help.*`. `src/locales/detailDrawerHelpTranslations.test.ts` requires every `*.help.*.title` key to have a matching `.text` key.
- **Layout:** the rows use the template widths, and a container-width breakpoint (about 760 px) collapses them into a vertical stack. Split the card and connector into sibling files if a file would exceed about 200 lines.
- **Acceptance:**
  - Each state renders its text label: Unavailable, Mismatch, No backing storage provider.
  - `↔` appears only for mutual partners.
  - Loading, error and empty states render.
- **Files:** `components/ProviderRelationshipsContent.tsx` (+test, plus optional `ProviderRelationshipCard.tsx` and `ProviderRelationshipConnector.tsx`), `src/locales/{en,sk,cs}.json`

### T8. `components/ProviderHelpHoverCard.tsx`
- **Do:**
  - The "?" trigger reuses the existing icon and button styling from `HelpPopover`.
  - Pointer handling:
    - Open after a hover delay of about 150 ms.
    - Bridge the move between trigger and panel with a grace delay of about 200 ms.
  - Focus handling:
    - Open immediately on focus.
    - Keep the panel open while focus is within the wrapper.
    - Close on `focusout` to outside.
  - While open, a capture-phase `window` keydown listener closes the panel on Escape with `stopPropagation()`.
  - Render the panel in place: right-aligned, shifted horizontally into the viewport, height capped below the trigger.
  - Panel layout:
    - Width `min(880px, 100vw - 2rem)`.
    - Fixed title.
    - A focusable scroll body containing the intro, Role, Credential and `ProviderRelationshipsContent`.
- **Acceptance (fake timers):**
  - Hover opens the panel.
  - Moving from the trigger to the panel keeps it open.
  - Leaving both closes it.
  - Focus opens the panel.
  - Tab into the panel keeps it open, and tabbing out closes it.
  - Role, Credential and relationship content are all present, and no Partner section remains.
  - The ARIA attributes match the spec.
- **Files:** `components/ProviderHelpHoverCard.tsx`, `components/ProviderHelpHoverCard.test.tsx`

### T9. Wiring and cleanup
- **Do:**
  - In `ProvidersCatalogueTable.tsx`, replace `<KeyedHelpPopover helpKey="providers.help" …>` with `<ProviderHelpHoverCard providers={allProviders} isLoading=… isError=… />`, and remove the import if it becomes unused.
  - In `ProvidersPage.tsx`, pass the all-providers query's loading and error state down.
  - Remove `providers.help.partner.title` and `providers.help.partner.text` from en, sk and cs.
- **Acceptance:**
  - With the drawer open, Escape on a hover-opened helper and on a focus-opened helper closes only the helper; the drawer stays open.
  - A second Escape closes the drawer.
  - No modal is rendered.
  - The other drawers' `KeyedHelpPopover` usages are untouched.
- **Files:** `components/ProvidersCatalogueTable.tsx` (+test), `pages/ProvidersPage.tsx` (+test if props change is asserted), `src/locales/{en,sk,cs}.json`

**Verify C3:**

```
npm exec vitest run src/features/providers-connectors/providers/helpers/buildRelationshipRows.test.ts src/features/providers-connectors/providers/components/ProviderRelationshipsContent.test.tsx src/features/providers-connectors/providers/components/ProviderHelpHoverCard.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx src/locales/detailDrawerHelpTranslations.test.ts src/shared/components/help-popover
npx eslint <changed .ts/.tsx files> --max-warnings 0
node scripts/orval/check-feature-layout.mjs
npm run typecheck
git diff --check
```

Manual check: run `npm run dev`, open the Providers drawer, and confirm the helper's hover, focus, Escape, placement and scrolling against the template content in both light and dark themes.

Commit message: `feat: show provider relationships in drawer hover help`

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Escape also closes the drawer (both listen on `window`) | Capture-phase listener with `stopPropagation()` while the helper is open, plus an explicit test in `ProvidersCatalogueTable.test.tsx` |
| The panel is constrained by the drawer's `transform` | In-place absolute positioning (as with `HelpPopover`) extends past the drawer because the drawer has no `overflow`. Fall back to a portal only if this fails in the manual check. |
| A hover helper is unreachable by keyboard | A focusable scroll body directly after the trigger in DOM order, so it stays inside the drawer's focus trap |
| A wide panel on small screens | The width is capped to the viewport, and a container breakpoint stacks the rows |
| The `detailDrawerHelpTranslations` invariant | Relationship keys live under `providers.relationships.*`, and the removed `providers.help.partner.*` keys are dropped from all three locales together |
| Parallel sessions in the working tree | Stage and commit explicit paths only |

## Not run by default

The full `npm test` and `npm run build` are not part of this plan (CLAUDE.md §5) unless requested.
