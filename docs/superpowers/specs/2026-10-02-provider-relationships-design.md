# Spec: Provider Relationships (classifier, form alignment, drawer help)

## Objective

The Providers API already returns the relationships between infrastructure providers:

- `backingStorageProviderIds: string[]`: a compute provider points to the storage providers that hold its workloads' disks.
- `partnerProviderId: string | null`: a storage provider points to its replication partner.

The frontend narrows these relationships more than the backend contract does, never shows backing storage, and does not explain the relationship model. This work does three things:

1. Introduces one FE classification of provider types and one resolver that builds the relationship topology from the provider list by id.
2. Aligns the provider form, the drawer and the detail page with the verified backend contract.
3. Extends the existing **"?" help in the provider DetailDrawer header** into one hover/focus helper. It keeps the Role and Credential help and adds the relationship model explanation plus the approved relationship visualization.

**Users:** operators configuring infrastructure providers who need to understand how compute and storage providers are connected.

**Out of scope:**
- Backend, API, OpenAPI and generated contracts (`src/generated/**`).
- Metro Mirror logic in recovery groups.
- Per-vendor discovery and inventory logic.
- VMware VM tags.
- The shared click-to-open `HelpPopover` / `KeyedHelpPopover` used by other drawers.
- A full topology or network viewer.
- Any click-to-open modal for this content.

## Verified backend contract (source of truth)

This contract was verified against the backend (`providers/models.py`, `providers/provider.py`, `api/routers/providers.py`, `recovery/groups.py`). The FE mirrors these rules and invents no others.

| Field | Allowed on | Referenced provider must be | Backend rejects |
|---|---|---|---|
| `backingStorageProviderIds` | `VMWARE`, `IBM_POWER` | `FLASHCOPY` or `HITACHI` | field on non-compute provider, duplicate ids, unknown id, non-storage target |
| `partnerProviderId` | `FLASHCOPY` | `FLASHCOPY` | field on non-FLASHCOPY provider, self-partner, unknown id, non-FLASHCOPY partner, target already partnered with a third provider |

- `topology=metro_mirror` is FLASHCOPY-only and also requires a symmetric partnership. It stays untouched.
- `HITACHI` is a valid backing storage target. It is **not** partner-capable.

## FE classification

The backend sends no category, so the FE keeps one temporary classification in a single module:

| Constant | Types | Used for |
|---|---|---|
| `COMPUTE_PROVIDER_TYPES` | `VMWARE`, `IBM_POWER` | backing storage field visibility, submit and display |
| `STORAGE_PROVIDER_TYPES` | `FLASHCOPY`, `HITACHI` | backing storage candidates |
| `PARTNER_PROVIDER_TYPES` | `FLASHCOPY` | partner field visibility and partner candidates (same type, never self) |

A module comment states that this mirrors the current backend validation. If the backend later adds an explicit `category` or `capabilities` field, that field takes precedence and replaces this classification. No such field is added now.

Relationships are always data-driven. Nothing may hardcode a link between concrete provider ids, and no rule may assume a partner exists because of the provider type.

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

The predicates accept `string` because form state holds the type as a string, including `''` before a type is selected. Unknown types return `false`.

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

**Backing storage.** Each entry of every provider's `backingStorageProviderIds` becomes one relationship, in array order:

- `unresolved`: no provider with `targetId` exists. `target` is `null` and the raw id is kept.
- `mismatch`: the target exists, but the source is not a compute type or the target is not a storage type.
- `resolved`: everything else.

**Partner.** Each non-empty `partnerProviderId` becomes one relationship:

- `unresolved`: no provider with `targetId` exists.
- `mismatch`: the target exists, but it is a self-reference, or the source or target is not partner-capable.
- `resolved`: everything else.
- If A points to B and B points to A, the two merge into one relationship with `mutual: true`. Its `sourceId` is whichever of the two comes first in API order.
- A one-way link A→B keeps `mutual: false`. The resolver never creates the reverse direction.

**Invariants:**

- Nothing is dropped, deduplicated away or auto-corrected. `unresolved` and `mismatch` exist for legacy or manually edited data, because the current backend prevents them on write.
- A compute provider without backing storage still appears in `computeProviders`; it simply has no relationships.

## Part 2: Form, drawer, detail and translations

Every hardcoded type condition in the Providers feature that concerns relationships moves onto the classifier:

| Location | Today | After |
|---|---|---|
| `ProviderCreateForm.tsx` backing field visibility | `type === 'VMWARE'` | `isComputeProviderType(type)` |
| `ProvidersCreateModal.tsx` clear backing on type change | `value !== 'VMWARE'` | `!isComputeProviderType(value)` |
| `ProvidersCreateModal.tsx` submit `backingStorageProviderIds` | `type === 'VMWARE'` | `isComputeProviderType(type)` |
| `ProvidersCreateModal.tsx` candidate list | one `storageProviders` list, `type === 'FLASHCOPY'` | two props: `backingStorageProviders` (storage types) and `partnerProviders` (partner types; the form also excludes self) |
| `ProviderCreateForm.tsx` partner field visibility | `type === 'FLASHCOPY'` | `isPartnerProviderType(type)` (same behavior) |
| `ProvidersCreateModal.tsx` clear partner on type change | `value !== 'FLASHCOPY'` | clear on **any** type change, which also covers FLASHCOPY→HITACHI |
| `ProvidersCatalogueTable.tsx` drawer | partner row for FLASHCOPY | partner row via `isPartnerProviderType` (unchanged), plus a new **Backing storage** row for compute providers |
| `ProviderDetailPage.tsx` | partner for FLASHCOPY | partner unchanged, plus a new **Backing storage** item for compute providers |

**Form behavior:**

- The backing storage multiselect appears for `VMWARE` and `IBM_POWER`. Its options are all `FLASHCOPY` and `HITACHI` providers. The existing "unavailable" option for ids missing from the list stays.
- The partner select appears only for `FLASHCOPY`. Its options are `FLASHCOPY` providers other than the provider itself; `HITACHI` never appears. The existing self-partner validation and "unavailable" option stay.
- Type changes:
  - `VMWARE` ↔ `IBM_POWER` keeps the selected backing storage.
  - Compute → `FLASHCOPY` or `HITACHI` clears backing storage.
  - Any type change clears the partner.
- Submit sends `backingStorageProviderIds` for both compute types. As a side effect, editing an IBM Power provider no longer omits its backing storage from the request.

**"Backing storage" row in the drawer and on the detail page:**

- It appears only for compute providers.
- It reads `resolveProviderTopology(allProviders)` for the selected provider:
  - resolved target: `Name (id)`
  - unresolved target: `id (Unavailable)`
  - mismatch: `Name (id) · Mismatch`
  - empty list: `None`
- No extra request is needed. The drawer already receives `allProviders`, and the detail page already loads `useGetProviders({ role: 'all' })`.

**Translations (en, sk, cs):**

- `forms.backingStorageProviders*` become vendor-neutral:
  - "Backing storage providers"
  - "Select storage providers"
  - "No storage providers available"
  - "Select the storage providers that hold this compute provider's disks."
- `forms.partnerProvider*` keep their FlashSystem / Metro Mirror wording, which matches the current contract.
- New keys: `details.backingStorage`, `details.backingStorageNone`, `details.backingStorageUnavailable`, `details.relationshipMismatch`.

## Part 3: Drawer help (hover/focus helper)

### Placement and interaction

- **Trigger:** the existing "?" icon button in the provider DetailDrawer header, at the same position and with the same look. The `<KeyedHelpPopover helpKey="providers.help" …>` there is replaced by `ProviderHelpHoverCard`. No separate button, link or modal is added. Other drawers keep the shared click-to-open `HelpPopover` unchanged.
- **Open:** after about 150 ms of pointer hover on the trigger, or immediately when the trigger receives keyboard focus. A touch tap focuses the trigger, so it also opens the helper.
- **Stay open:** while the pointer is over the trigger or the panel, or while focus is inside the trigger or the panel. Moving from the trigger to the panel does not close it; a grace delay of about 200 ms bridges the gap.
- **Close:** when pointer and focus have both left the trigger and panel area (after the grace delay), or on Escape.
- **Escape** closes only the helper, never the DetailDrawer. The drawer listens for Escape on `window` in the bubble phase. While the helper is open, it registers a `window` keydown listener in the **capture** phase that closes it and calls `stopPropagation()`. This works whether the helper was opened by hover (focus elsewhere in the drawer) or by focus. After an Escape, focus stays where it was (on the trigger if it opened by focus).
- **Keyboard reading:** the panel's scroll container is focusable (`tabIndex={0}`) and follows the trigger directly in DOM order. Tab therefore moves from the trigger into the panel, keeps the helper open, and lets the arrow keys and PageUp/PageDown scroll it. Tabbing out of the panel closes it.
- **No click toggle:** a click only focuses the trigger, which opens the helper. Nothing else is clickable inside the panel.
- **ARIA:**
  - The trigger is a `button` with `aria-label` from `providers.help.trigger`, `aria-expanded`, and `aria-controls` pointing to the panel id.
  - The panel is a non-modal `role="dialog"` labelled by its title, like the existing HelpPopover.
  - The arrow glyphs are `aria-hidden`, and each connector carries visually hidden text.
- **Known deviation:** the other drawers' "?" stays click-only, as the shared HelpPopover documents. This drawer's helper is hover/focus by product decision.

### Rendering and placement

- The panel renders **in place**, as a child of the trigger wrapper inside the drawer. This mirrors the existing HelpPopover rationale: it stays inside the drawer's `aria-modal` subtree and focus trap, and the drawer sets no `overflow`, so nothing clips it.
- It is positioned absolutely under the trigger and right-aligned to it, so it extends leftwards over the page. A horizontal shift keeps it inside the viewport, the same technique `HelpPopover` uses.
- Width: `min(880px, 100vw − 2rem)`. Max height: the space below the trigger minus a viewport gap.
- The panel title stays fixed and the content scrolls.
- Portalling to `document.body` is approved as a fallback, but only if in-place rendering cannot satisfy clipping or positioning. If used, the Escape and focus-trap behavior above must still hold.

### Content (top to bottom)

1. **Title and intro**: the existing `providers.help.title` and `providers.help.intro`.
2. **Role**: the existing `providers.help.role.title` / `.text`.
3. **Credential**: the existing `providers.help.credential.title` / `.text`.
4. **Provider relationships**: the approved v2 template content, rendered by `ProviderRelationshipsContent`:
   - A section heading, then three short intro sentences:
     - "Compute providers run workloads such as virtual machines or LPARs. They can use one or more storage providers as backing storage."
     - "IBM FlashSystem providers can additionally reference another FlashSystem as their replication partner."
     - "Relationships shown below are built from the current provider configuration." (muted)
   - A one-line legend: `Compute → Backing storage → Storage` (blue) and `Storage ↔ Partner ↔ Storage` (orange).
   - The relationship rows, as described below.

This section replaces the old `providers.help.partner.*` section. Those keys become unused and are removed.

The rows use the **whole `allProviders` dataset** and show the full relevant relationship topology, not only the selected provider. The selected provider gets no special treatment.

### Relationship rows (approved template v2)

Visual reference: [2026-10-02-provider-relationships-helper-template.html](2026-10-02-provider-relationships-helper-template.html). Only its *content* applies (intro, legend, rows, states). Its modal shell is superseded by this helper panel.

- **"Compute providers" list**: one row per compute provider, in API order, read left to right: `[compute card] → Backing storage → [storage card] → Partner → [partner card]`.
  - Several backing targets stack vertically inside the same row. Each target carries its own partner, if it has one.
  - A compute provider without backing storage shows the muted text "No backing storage provider".
- **"Other storage relationships" list**: partner relationships whose storage providers are not resolved backing targets of any compute provider and whose partner was not rendered above. Each row reads `[storage card] → Partner → [partner card]`. The list is hidden when empty. A storage provider with no relationship at all is not listed.
- **Provider card** (compact):
  - name, truncated, with the full name in `title`
  - type via the existing `providerTypeLabel` (FLASHCOPY reads "FlashCopy", as everywhere else in the app)
  - role badge (Source = success, Target = warning, as in the table)
  - id in small mono text

  Nothing else.
- **Connectors**: the label sits above the line and the arrowheads show direction. Backing storage is blue (`accent`), partner is orange (`warning-600`).
  - `↔` (both tips) appears only for `mutual: true`.
  - A one-way partner has a single tip in the declared direction: `→` when the row's storage is the source, `←` when it is the target.
  - Visually hidden text: "backing storage", "mutual partner", "partner of" / "partnered by".
- **Partner repetition**: the first time a partner relationship appears in reading order, it renders as connector + full card. Later occurrences render as a compact one-line reference, `↔ Partner {name} {id}` (`→` / `←` when one-way).
- **Panel width**: inside the panel the rows use the template column widths. Below about 760 px of panel width they collapse into a vertical stack with vertical connectors. No horizontal scroll.

### States

| State | Rendering |
|---|---|
| Resolved | Normal card and connector |
| Unresolved | Card with a dashed border, the raw id as title, a neutral "Unavailable" badge and the hint "Not in the current provider list". The relationship stays visible. |
| Mismatch (backing) | Normal target card, followed by a subtle neutral "Mismatch" pill and "{type} is not a storage provider" |
| Mismatch (partner) | Dashed connector with a "Mismatch" pill, normal partner card |
| One-way partner | Single-direction connector, not styled as an error |
| No backing storage | Muted "No backing storage provider" |
| `allProviders` loading | Skeleton rows (existing `SkeletonBlock`) in the relationships section; Role and Credential render immediately |
| `allProviders` error | Muted text "Relationships could not be loaded." in the relationships section, with no interactive retry (the page toolbar refresh stays the recovery path) |
| No relationships at all | Muted "No provider relationships are configured yet." |

There are no aggressive error panels and no red colors for the mismatch or unresolved states.

### Structure

- `helpers/buildRelationshipRows.ts`: a pure view model from `ProviderTopology` to rows. It owns ordering, the first-full-then-compact partner logic and the "Other storage relationships" selection.
- `components/ProviderRelationshipsContent.tsx`: renders the approved v2 content (intro, legend, rows, states) from the view model, with no business rules. Small subcomponents (card, connector) go into sibling files if a file would exceed about 200 lines.
- `components/ProviderHelpHoverCard.tsx`: the "?" trigger, the hover/focus/Escape behavior, in-place placement, and the Role and Credential sections plus `ProviderRelationshipsContent`. It receives `allProviders` (plus loading and error state) from `ProvidersCatalogueTable`.

## Tech Stack

React 19 + TypeScript, Tailwind v4 tokens from `src/index.css`, TanStack Query via the generated Orval hooks (`useGetProviders` + `selectProviders`), and Vitest + Testing Library. No new dependencies.

## Commands

```
Focused tests: npm exec vitest run <changed test files>
Focused lint:  npx eslint <changed files> --max-warnings 0
Layout check:  node scripts/orval/check-feature-layout.mjs
Typecheck:     npm run typecheck   (ProviderCreateForm props and drawer props change)
Whitespace:    git diff --check
```

The full suite (`npm test`) and the production build are not run by default (CLAUDE.md §5).

## Project Structure

```
src/features/providers-connectors/providers/
  model/providerCategory.ts(+.test.ts)                  Part 1
  helpers/resolveProviderTopology.ts(+.test.ts)         Part 1
  components/ProviderCreateForm.tsx(+.test.tsx)         Part 2
  components/ProvidersCreateModal.tsx(+.test.tsx)       Part 2
  components/ProvidersCatalogueTable.tsx(+.test.tsx)    Parts 2 and 3 (backing row, helper trigger)
  pages/ProviderDetailPage.tsx(+.test.tsx)              Part 2
  helpers/buildRelationshipRows.ts(+.test.ts)           Part 3
  components/ProviderRelationshipsContent.tsx(+.test.tsx) Part 3
  components/ProviderHelpHoverCard.tsx(+.test.tsx)      Part 3
src/locales/{en,sk,cs}.json                             Parts 2 and 3
```

`ProvidersCatalogueTable` needs the loading and error state of the all-providers query for the helper. `ProvidersPage` passes them down (a prop addition only, with no new query).

## Code Style

Follow the surrounding Providers code:

- named function exports
- `as const satisfies` constant tuples
- `useTranslation().t` keys
- Tailwind semantic tokens (`text-text-muted`, `border-border`, `bg-surface`), with no raw hex in components

Example:

```ts
// Mirrors current backend validation. A backend-provided category, when added, replaces this.
export const COMPUTE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]

export function isComputeProviderType(type: string): boolean {
  return COMPUTE_PROVIDER_TYPES.some(known => known === type)
}
```

## Testing Strategy

Vitest unit and component tests are colocated with the code. Each slice is written test-first.

- **`providerCategory.test.ts`**
  - All four infrastructure types are classified correctly.
  - `HITACHI` is storage but not partner-capable.
  - Unknown types and `''` are false everywhere.
- **`resolveProviderTopology.test.ts`**
  - Resolved backing to `FLASHCOPY` and `HITACHI` from both `VMWARE` and `IBM_POWER`.
  - Multiple backing targets keep their order.
  - Unresolved backing keeps the raw id and `target: null`.
  - Mismatch backing: compute → compute, and a non-compute source with backing ids.
  - A compute provider without backing has no relationships.
  - Mutual A↔B becomes one relationship with `mutual: true`.
  - One-way A→B gives `mutual: false` and no reverse relationship.
  - Unresolved partner.
  - Mismatch partner: FLASHCOPY→HITACHI, a HITACHI source, and a self-partner.
  - Fixtures use arbitrary ids (`c-1`, `s-1`).
- **`ProviderCreateForm.test.tsx` / `ProvidersCreateModal.test.tsx`**
  - `IBM_POWER` shows the backing field and submits `backingStorageProviderIds`.
  - Backing candidates include `FLASHCOPY` and `HITACHI` and exclude compute providers.
  - Partner candidates are only `FLASHCOPY` providers, never self and never `HITACHI`. The partner field is hidden for `HITACHI`.
  - Type changes:
    - `VMWARE` → `IBM_POWER` keeps backing storage.
    - `IBM_POWER` → `VMWARE` keeps backing storage.
    - Compute → `FLASHCOPY` and compute → `HITACHI` clear backing storage, and the submitted body has no backing ids.
    - `FLASHCOPY` → `HITACHI` clears the partner.
  - The existing self-partner and edit/clear tests still pass.
- **`ProvidersCatalogueTable.test.tsx` / `ProviderDetailPage.test.tsx`**
  - The backing row shows resolved names, unresolved ids as unavailable, and `None` when empty.
  - The backing row is absent for storage providers.
  - The partner row is unchanged.
- **`buildRelationshipRows.test.ts`**
  - API order is kept.
  - Multiple targets stack in one row.
  - A partner renders full the first time and compact afterwards.
  - Direction is `both` only for mutual relationships; otherwise `out` or `in`.
  - "Other storage relationships" lists only partner relationships not shown above and is empty when nothing remains.
  - A storage provider with no relationships is not listed.
- **`ProviderRelationshipsContent.test.tsx`**
  - Intro and legend render.
  - Each state shows its text label: Unavailable, Mismatch, No backing storage provider.
  - The connectors' hidden text conveys direction.
  - Loading, error and empty states render.
- **`ProviderHelpHoverCard.test.tsx`** (fake timers)
  - Opens after a hover delay.
  - Stays open while the pointer moves from the trigger to the panel.
  - Closes after the pointer leaves both.
  - Opens on focus, and Tab into the panel keeps it open.
  - Tabbing out closes it.
  - Role, Credential and relationships content are all present.
  - The old Partner section is gone.
- **`ProvidersCatalogueTable.test.tsx`**
  - Escape while the helper is open closes the helper and leaves the DetailDrawer open, both for hover-opened and focus-opened helpers.
  - No click-to-open modal exists.

## Implementation Order and Commits

Each step is verified with focused tests, focused lint and, where needed, typecheck, then committed atomically with explicit paths (other sessions share the working tree).

1. **Commit 1:** classifier and resolver, plus their unit tests.
2. **Commit 2:** form and create modal, drawer and detail backing storage row, form and detail translations, plus their tests.
3. **Commit 3:** drawer help:
   - `buildRelationshipRows`
   - `ProviderRelationshipsContent`
   - `ProviderHelpHoverCard`
   - wiring in `ProvidersCatalogueTable` / `ProvidersPage`
   - translations, including removal of the now-unused `providers.help.partner.*` keys
   - tests

The implementation plan is written after this spec revision.

## Boundaries

- **Always:**
  - Derive every relationship from provider data by id.
  - Keep `unresolved` and `mismatch` visible.
  - Use the classifier instead of type literals for relationship logic.
  - Run focused verification before each commit.
- **Ask first:**
  - Any change to `src/generated/**`, OpenAPI or the backend.
  - Changes to Metro Mirror, discovery or VM tag logic.
  - Changes to the shared `HelpPopover`, `KeyedHelpPopover`, `DetailDrawer` or `Modal`.
  - New dependencies.
- **Never:**
  - Hardcode links between concrete provider ids.
  - Enable partners for `HITACHI`.
  - Auto-correct or create reverse relationships.
  - Add a backend `category` or `capabilities` field.
  - Build a global graph with crossing lines.
  - Add a click-to-open modal or link for this content.

## Success Criteria

- `VMWARE` and `IBM_POWER` can both select, save and display backing storage from `FLASHCOPY` and `HITACHI` providers.
- The partner field and its candidates follow FLASHCOPY → FLASHCOPY only, never self and never `HITACHI`, matching the backend contract.
- Type changes keep or clear backing storage and partner exactly as listed in Part 2.
- The drawer and detail page show backing storage for compute providers without an extra API call.
- Hovering or focusing the drawer "?" opens one helper containing Role, Credential and the approved relationship content, built from the full `allProviders` dataset.
- The helper stays open while it is hovered or focused, and closes when hover and focus leave it.
- Escape closes only the helper, never the drawer.
- No modal exists for this content.
- The relationship content matches template v2 in every listed state, uses `↔` only for mutual partners, and reads left to right.
- No changes under `src/generated/**`, OpenAPI or the backend.
- Metro Mirror, discovery and VM tag behavior is unchanged.
- Other drawers' help popovers are unchanged.

## Resolved decisions

- **Trigger:** the existing "?" in the provider DetailDrawer header, opening on hover or focus. No modal and no extra button.
- **Content:** a single helper holding Role, Credential and Provider relationships (template v2 content).
- **Type label:** the existing `providerTypeLabel` ("FlashCopy") is used unchanged.
- **Portal:** in place by default. Portalling is approved if needed.
