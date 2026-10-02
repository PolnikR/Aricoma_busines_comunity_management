# Spec: Provider Relationships (classifier, form alignment, helper modal)

## Objective

The Providers API already returns the relationships between infrastructure providers:

- `backingStorageProviderIds: string[]`: compute provider → storage providers that hold its workloads' disks.
- `partnerProviderId: string | null`: storage provider → its replication partner.

The frontend narrows these relationships more than the backend contract does, never shows backing storage, and does not explain the relationship model anywhere. This work:

1. Introduces one FE classification of provider types and one resolver that builds the relationship topology from the provider list by id.
2. Aligns the provider form, the drawer and the detail page with the verified backend contract.
3. Adds a helper modal that explains the model and shows the current relationships, following the approved template.

**Users:** operators configuring infrastructure providers who need to understand how compute and storage providers are connected.

**Out of scope:** backend, API, OpenAPI and generated contracts (`src/generated/**`); Metro Mirror logic in recovery groups; discovery/inventory per-vendor logic; VMware VM tags; a full topology or network viewer.

## Verified backend contract (source of truth)

Verified against the backend (`providers/models.py`, `providers/provider.py`, `api/routers/providers.py`, `recovery/groups.py`). The FE must mirror these rules and must not invent others.

| Field | Allowed on | Referenced provider must be | Backend rejects |
|---|---|---|---|
| `backingStorageProviderIds` | `VMWARE`, `IBM_POWER` | `FLASHCOPY` or `HITACHI` | field on non-compute provider, duplicate ids, unknown id, non-storage target |
| `partnerProviderId` | `FLASHCOPY` | `FLASHCOPY` | field on non-FLASHCOPY provider, self-partner, unknown id, non-FLASHCOPY partner, partner already pointing to a third provider |

- `topology=metro_mirror` is FLASHCOPY-only and additionally requires a symmetric partnership. It stays untouched.
- `HITACHI` is a storage provider that is valid as backing storage. It is **not** partner-capable.

## FE classification

The backend does not send a category, so the FE keeps one temporary classification in a single module:

| Constant | Types | Used for |
|---|---|---|
| `COMPUTE_PROVIDER_TYPES` | `VMWARE`, `IBM_POWER` | backing storage field visibility, submit and display |
| `STORAGE_PROVIDER_TYPES` | `FLASHCOPY`, `HITACHI` | backing storage candidates |
| `PARTNER_PROVIDER_TYPES` | `FLASHCOPY` | partner field visibility, partner candidates (same type, never self) |

A module comment states that this mirrors the current backend validation, and that an explicit backend `category` or `capabilities` field, if added later, takes precedence and replaces this classification. Such a field is not added now.

Relationships are always data-driven. No code may hardcode a link between concrete provider ids, and no rule may assume a partner exists because of the provider type.

## Part 1: Classifier and resolver

### `model/providerCategory.ts`

```ts
export const COMPUTE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]
export const STORAGE_PROVIDER_TYPES = ['FLASHCOPY', 'HITACHI'] as const satisfies readonly ProviderType[]
export const PARTNER_PROVIDER_TYPES = ['FLASHCOPY'] as const satisfies readonly ProviderType[]

export function isComputeProviderType(type: string): boolean
export function isStorageProviderType(type: string): boolean
export function isPartnerProviderType(type: string): boolean
```

The predicates accept `string` because form state holds the type as a string (including `''` before selection). Unknown types return `false`.

### `helpers/resolveProviderTopology.ts`

A pure function over the provider list, with no React and no fetching:

```ts
export type RelationshipStatus = 'resolved' | 'unresolved' | 'mismatch'

export interface BackingStorageRelationship {
  sourceId: string
  targetId: string
  target: ProviderRecord | null // null when unresolved
  status: RelationshipStatus
}

export interface PartnerRelationship {
  sourceId: string             // provider whose partnerProviderId declared the link
  targetId: string
  target: ProviderRecord | null
  status: RelationshipStatus
  mutual: boolean              // true only when both sides point at each other
}

export interface ProviderTopology {
  computeProviders: ProviderRecord[]   // API order
  storageProviders: ProviderRecord[]   // API order
  backingStorage: BackingStorageRelationship[]
  partners: PartnerRelationship[]
}

export function resolveProviderTopology(providers: readonly ProviderRecord[]): ProviderTopology
```

**Backing storage rules.** Each entry of every provider's `backingStorageProviderIds` produces one relationship, in array order:

- `unresolved`: no provider with `targetId` exists. `target` is `null` and the raw id is kept.
- `mismatch`: the target exists, but the source is not a compute type or the target is not a storage type.
- `resolved`: otherwise.

**Partner rules.** Each non-empty `partnerProviderId` produces a relationship:

- `unresolved`: no provider with `targetId` exists.
- `mismatch`: the target exists, but it is a self-reference, or the source or the target is not a partner-capable type.
- `resolved`: otherwise.
- **Merging:** A→B and B→A merge into one relationship with `mutual: true`. The `sourceId` is the provider that appears first in API order. A one-way A→B stays `mutual: false`, and the resolver never creates the reverse direction.

**Invariants:**
- Nothing is dropped, deduplicated away or auto-corrected. `unresolved` and `mismatch` exist for legacy or manually edited data, since the current backend prevents them on write.
- A compute provider without backing storage appears in `computeProviders` and has no relationships.

## Part 2: Form, drawer, detail and translations

Every hardcoded type condition in the Providers feature that concerns relationships moves onto the classifier:

| Location | Today | After |
|---|---|---|
| `ProviderCreateForm.tsx`: backing storage field visibility | `type === 'VMWARE'` | `isComputeProviderType(type)` |
| `ProvidersCreateModal.tsx`: clear backing storage on type change | `value !== 'VMWARE'` | `!isComputeProviderType(value)` |
| `ProvidersCreateModal.tsx`: submit `backingStorageProviderIds` | `type === 'VMWARE'` | `isComputeProviderType(type)` |
| `ProvidersCreateModal.tsx`: candidate list | one `storageProviders` list, `type === 'FLASHCOPY'` | two props: `backingStorageProviders` (storage types) and `partnerProviders` (partner types; the form also excludes self) |
| `ProviderCreateForm.tsx`: partner field visibility | `type === 'FLASHCOPY'` | `isPartnerProviderType(type)` (same behavior) |
| `ProvidersCreateModal.tsx`: clear partner on type change | `value !== 'FLASHCOPY'` | clear on **any** type change, which also covers FLASHCOPY→HITACHI |
| `ProvidersCatalogueTable.tsx`: drawer | partner row for FLASHCOPY | partner row via `isPartnerProviderType` (unchanged), plus a new **Backing storage** row for compute providers |
| `ProviderDetailPage.tsx` | partner for FLASHCOPY | partner unchanged, plus a new **Backing storage** item for compute providers |

**Form behavior:**
- **Backing storage multiselect:** shown for `VMWARE` and `IBM_POWER`. Options are all `FLASHCOPY` and `HITACHI` providers. The existing "unavailable" option for ids that are no longer in the list stays.
- **Partner select:** shown only for `FLASHCOPY`. Options are `FLASHCOPY` providers other than the provider itself. `HITACHI` never appears. The existing self-partner validation and the "unavailable" option stay.
- **Type change:**
  - `VMWARE` ↔ `IBM_POWER` keeps the selected backing storage.
  - Compute → `FLASHCOPY` or `HITACHI` clears backing storage.
  - Any type change clears the partner.
- **Submit:** `backingStorageProviderIds` is sent for both compute types. As a side effect, editing an IBM Power provider no longer omits its backing storage from the request.

**Drawer and detail page, "Backing storage" row:**
- Shown only for compute providers.
- Values come from `resolveProviderTopology(allProviders)` for the selected provider: `Name (id)` per resolved target, `id (Unavailable)` per unresolved target, and a mismatch marked as `Name (id) · Mismatch`.
- Empty list shows `None`.
- The drawer already receives `allProviders`, and the detail page already loads `useGetProviders({ role: 'all' })`, so no extra request is needed.

**Translations (en, sk, cs):**
- `forms.backingStorageProviders*` become vendor-neutral:
  - "Backing storage providers"
  - "Select storage providers"
  - "No storage providers available"
  - "Select the storage providers that hold this compute provider's disks."
- `forms.partnerProvider*` and `providers.help.partner.*` keep their FlashSystem / Metro Mirror wording, which is accurate for the current contract.
- New keys for the backing storage row: `details.backingStorage`, `details.backingStorageNone`, `details.backingStorageUnavailable`, `details.relationshipMismatch`.

## Part 3: Helper modal

The visual reference is the approved template [2026-10-02-provider-relationships-helper-template.html](2026-10-02-provider-relationships-helper-template.html). Open it in a browser and toggle **Edge cases** to see every state.

**Trigger:** an outline button "Provider relationships" in the `ProvidersPage` toolbar actions, next to "Add provider". The modal reads the `allProviders` query that the page already runs.

**Shell:**
- The shared `Modal` gets a new `size="xl"` (`max-w-4xl`, about 880–896 px). Existing sizes do not change.
- Header (title and close) and footer (Close button) stay fixed. Only the body scrolls.

**Body, top to bottom:**

1. **Intro text**, three short sentences:
   - "Compute providers run workloads such as virtual machines or LPARs. They can use one or more storage providers as backing storage."
   - "IBM FlashSystem providers can additionally reference another FlashSystem as their replication partner."
   - "Relationships shown below are built from the current provider configuration." (muted)
2. **One-line legend:** `Compute → Backing storage → Storage` (blue) and `Storage ↔ Partner ↔ Storage` (orange).
3. **"Compute providers" list**, one row per compute provider in API order, read left to right: `[compute card] → Backing storage → [storage card] → Partner → [partner card]`.
   - **Several backing storage targets:** they stack vertically inside the same row. Each target carries its own partner, if it has one.
   - **No backing storage:** the row shows the muted text "No backing storage provider".
4. **"Other storage relationships" list:** partner relationships whose storage providers are not resolved backing targets of any compute provider and whose partner was not rendered above. Each row reads `[storage card] → Partner → [partner card]`. The section is hidden when empty. A storage provider with no relationship at all is not listed, because the modal shows relationships, not an inventory.

**Provider card** (compact): name (truncated, full name in `title`), provider type via `providerTypeLabel`, role badge (Source = success, Target = warning, the same colors as the table), and the id in small mono text. Nothing else.

**Connectors:**
- The label sits above the line and the arrowheads show direction.
- Backing storage is blue (`accent`).
- Partner is orange (`warning-600`).
- **Direction:**
  - `↔` (both tips) only for `mutual: true`.
  - One-way partners get a single tip in the declared direction: `→` when the row's storage is the source, `←` when it is the target.
- **Accessibility:** each connector carries visually hidden text: "backing storage", "mutual partner", "partner of" / "partnered by". The arrows are `aria-hidden`.

**Partner repetition:**
- The first time a partner relationship appears in reading order, it renders as connector + full card.
- Later occurrences of the same relationship render as a compact one-line reference: `↔ Partner {name} {id}`, or `→` / `←` for one-way.

**States:**

| State | Rendering |
|---|---|
| Resolved | Normal card and connector |
| Unresolved | Card with dashed border, raw id as the title, neutral "Unavailable" badge, hint "Not in the current provider list". The relationship stays visible. |
| Mismatch (backing) | Normal target card, followed by a subtle neutral "Mismatch" pill and the text "{type} is not a storage provider" |
| Mismatch (partner) | Dashed connector with a "Mismatch" pill, normal partner card |
| One-way partner | Single-direction connector, not styled as an error |
| No backing storage | Muted text "No backing storage provider" |
| Loading | Skeleton rows (existing `SkeletonBlock`) |
| Fetch error | Existing `FetchErrorAlert` with retry |
| No compute and no storage relationships | Muted empty text "No provider relationships are configured yet." |

No aggressive error panels and no red error colors for mismatch or unresolved states.

**Responsive:**
- Below `md`, rows collapse to a vertical stack with vertical connectors.
- No horizontal page scroll.

**Structure:**
- `helpers/buildRelationshipRows.ts`: a pure view model from `ProviderTopology` to rows, holding the ordering, first-full-then-compact partner logic and the "Other storage relationships" selection.
- `components/ProviderRelationshipsModal.tsx`: renders the view model only, no business rules. Small subcomponents (card, connector) live in the same folder if the file would exceed about 200 lines.

## Tech Stack

React 19 + TypeScript, Tailwind v4 tokens from `src/index.css`, TanStack Query via the generated Orval hooks (`useGetProviders` + `selectProviders`), Vitest + Testing Library. No new dependencies.

## Commands

```
Focused tests: npm exec vitest run <changed test files>
Focused lint:  npx eslint <changed files> --max-warnings 0
Layout check:  node scripts/orval/check-feature-layout.mjs
Typecheck:     npm run typecheck   (prop signature of ProviderCreateForm changes)
Whitespace:    git diff --check
```

The full suite (`npm test`) and the production build are not run by default (CLAUDE.md §5).

## Project Structure

```
src/features/providers-connectors/providers/
  model/providerCategory.ts(+.test.ts)              Part 1
  helpers/resolveProviderTopology.ts(+.test.ts)     Part 1
  components/ProviderCreateForm.tsx(+.test.tsx)     Part 2
  components/ProvidersCreateModal.tsx(+.test.tsx)   Part 2
  components/ProvidersCatalogueTable.tsx(+.test.tsx) Part 2
  pages/ProviderDetailPage.tsx(+.test.tsx)          Part 2
  helpers/buildRelationshipRows.ts(+.test.ts)       Part 3
  components/ProviderRelationshipsModal.tsx(+.test.tsx) Part 3
  pages/ProvidersPage.tsx(+.test.tsx)               Part 3 (trigger)
src/shared/components/modal/Modal.tsx(+.test.tsx)   Part 3 (size "xl")
src/locales/{en,sk,cs}.json                         Parts 2 and 3
```

## Code Style

Follow the surrounding Providers code: named function exports, `as const satisfies` constant tuples, `useTranslation().t` keys, Tailwind semantic tokens (`text-text-muted`, `border-border`, `bg-surface`), and no raw hex in components. Example:

```ts
// Mirrors current backend validation. A backend-provided category, when added, replaces this.
export const COMPUTE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]

export function isComputeProviderType(type: string): boolean {
  return COMPUTE_PROVIDER_TYPES.some(known => known === type)
}
```

## Testing Strategy

Vitest unit and component tests, colocated. Test first per slice.

**`providerCategory.test.ts`**
- Each of the four infrastructure types is classified correctly.
- `HITACHI` is storage but not partner-capable.
- Unknown types and `''` are false everywhere.

**`resolveProviderTopology.test.ts`**
- Resolved backing to `FLASHCOPY` and to `HITACHI` from both `VMWARE` and `IBM_POWER`.
- Several backing targets keep array order.
- Unresolved backing keeps the raw id and `target: null`.
- Mismatch backing: compute → compute target, and a non-compute source that carries backing ids.
- Compute without backing has no relationships.
- Mutual partner A↔B becomes one relationship with `mutual: true`.
- One-way A→B gives `mutual: false` and no reverse relationship.
- Unresolved partner.
- Mismatch partner: FLASHCOPY→HITACHI, a HITACHI source, and self-partner.
- No hardcoded ids: the tests use arbitrary ids such as `c-1` and `s-1`.

**`ProviderCreateForm.test.tsx` / `ProvidersCreateModal.test.tsx`**
- `IBM_POWER` shows the backing field and submits `backingStorageProviderIds`.
- Backing candidates include `FLASHCOPY` and `HITACHI` and exclude compute providers.
- Partner candidates include only `FLASHCOPY` without self, never `HITACHI`. The partner field is hidden for `HITACHI`.
- Type change `VMWARE` → `IBM_POWER` keeps backing storage.
- Type change `IBM_POWER` → `VMWARE` keeps backing storage.
- Type change compute → `FLASHCOPY` and compute → `HITACHI` clears backing storage, and the submitted body has no backing ids.
- Type change `FLASHCOPY` → `HITACHI` clears the partner.
- Existing self-partner and edit/clear tests still pass.

**`ProvidersCatalogueTable.test.tsx` / `ProviderDetailPage.test.tsx`**
- The backing storage row shows resolved names, unresolved ids as unavailable, and `None` when empty.
- The row is absent for storage providers.
- The partner row is unchanged.

**`buildRelationshipRows.test.ts`**
- Row order follows the API.
- Several targets stack in one row.
- A partner renders full on first occurrence and compact afterwards.
- Direction is `both` only for mutual relationships, otherwise `out` or `in`.
- "Other storage relationships" lists only partner relationships not already shown, and is empty when none remain.
- A storage provider with no relationships is not listed.

**`ProviderRelationshipsModal.test.tsx`**
- Intro and legend render.
- Each state renders its text label (Unavailable, Mismatch, No backing storage provider).
- The connector hidden text conveys direction.
- Loading, error with retry, and empty states.
- Escape and Close close the modal (via the shared `Modal`).

**`Modal.test.tsx`**
- `size="xl"` applies the wide max width, and other sizes are unchanged.

**`ProvidersPage.test.tsx`**
- The trigger opens the modal with data from the all-providers query.

## Implementation Order and Commits

Each step is verified with focused tests, focused lint and, where needed, typecheck, then committed atomically with explicit paths. Other sessions share the working tree.

1. **Commit 1:** classifier and resolver with their unit tests.
2. **Commit 2:** form and create modal, drawer, detail page, translations, and their tests.
3. **Commit 3:** helper modal (`Modal` size `xl`, `buildRelationshipRows`, `ProviderRelationshipsModal`, `ProvidersPage` trigger, translations) and its tests.

The implementation plan (`tasks/…`) is written after this spec is approved.

## Boundaries

- **Always:**
  - Derive every relationship from provider data by id.
  - Keep `unresolved` and `mismatch` visible.
  - Use the classifier instead of type literals for relationship logic.
  - Run focused verification before each commit.
- **Ask first:**
  - Any change to `src/generated/**`, OpenAPI or the backend.
  - Changing Metro Mirror, discovery or VM tag logic.
  - Changing other `Modal` sizes or other shared components.
  - Adding dependencies.
- **Never:**
  - Hardcode links between concrete provider ids.
  - Enable partners for `HITACHI`.
  - Auto-correct or create reverse relationships.
  - Add a backend `category` or `capabilities` field.
  - Build a global graph with crossing lines.

## Success Criteria

- Both `VMWARE` and `IBM_POWER` can select, save and display backing storage from `FLASHCOPY` and `HITACHI` providers.
- The partner field and its candidates follow FLASHCOPY → FLASHCOPY, never self, never `HITACHI`, exactly matching the backend contract.
- Type changes keep or clear backing storage and partner exactly as listed in Part 2.
- The drawer and detail page show backing storage for compute providers without an extra API call.
- The helper modal matches the approved v2 template. It covers every listed state, uses `↔` only for mutual partners, scrolls only its body, and reads left to right.
- No changes under `src/generated/**`, OpenAPI or backend.
- Metro Mirror, discovery and VM tag behavior is unchanged, and their existing tests pass untouched.

## Open Questions

1. **Trigger placement:** proposed as a toolbar button on the Providers page. Alternatively, the existing `providers.help` popover in the drawer could link to the modal. Confirm or adjust.
2. **Type label:** `providerTypeLabel('FLASHCOPY')` returns "FlashCopy", while the template shows "IBM FlashSystem". The spec reuses the existing helper unchanged, so cards show "FlashCopy". Say so if the label should change; that would be a separate decision, because the helper is used app-wide.
