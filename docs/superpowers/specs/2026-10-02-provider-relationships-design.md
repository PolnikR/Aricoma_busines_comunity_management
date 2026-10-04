# Spec: Provider Relationships (classifier, form alignment, hover/focus help)

## Objective

The Providers API already returns the relationships between infrastructure providers:

- `backingStorageProviderIds: string[]`: a compute provider points to the storage providers that hold its workloads' disks.
- `partnerProviderId: string | null`: a storage provider points to its replication partner.

The frontend narrows these relationships more than the backend contract does, never shows backing storage, and does not explain the relationship model. This work does three things:

1. Introduces one FE classification of provider types and one resolver that builds the relationship topology from the provider list by id.
2. Aligns the provider form, the drawer and the detail page with the verified backend contract.
3. Makes the shared detail help (`HelpPopover`, and through it `KeyedHelpPopover`) open on **hover and focus** everywhere it is used. The provider drawer's help keeps Role and Credential and adds the relationship model explanation plus the approved relationship visualization.

**Users:** operators configuring infrastructure providers who need to understand how compute and storage providers are connected.

**Out of scope:**
- Backend, API, OpenAPI and generated contracts (`src/generated/**`).
- Metro Mirror logic in recovery groups.
- Per-vendor discovery and inventory logic.
- VMware VM tags.
- A full topology or network viewer.
- Any modal, link or second popover implementation for this content.

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

## Part 3: Shared hover/focus help and provider help content

### 3a. Shared `HelpPopover` interaction (global)

The interaction changes in `src/shared/components/help-popover/HelpPopover.tsx` and applies to **every** existing "?" help. All `KeyedHelpPopover` usages (about 20 drawers and panels) inherit it with no change at their call sites. No feature gets its own hover, focus, positioning or Escape logic.

| Interaction | Behavior |
|---|---|
| Pointer hover on "?" (`pointerType !== 'touch'`) | Opens after about 150 ms |
| Pointer moves from trigger to panel | Stays open; a grace delay of about 200 ms bridges the gap |
| Pointer leaves both trigger and panel | Closes after the grace delay, **unless focus is inside the trigger or panel** |
| Keyboard focus on "?" | Opens immediately |
| Focus moves within trigger or panel (Tab into the panel) | Stays open |
| Focus leaves trigger and panel | Closes, **unless the pointer is over the trigger or panel** |
| Hover opening | Never moves focus. The panel no longer auto-focuses on open, whatever opened it. |
| Click or tap on "?" | Fallback: opens if closed and does nothing if already open. It **no longer toggles closed**, because a desktop click arrives after hover/focus has already opened the panel. |
| Close button in panel | Closes and returns focus to the trigger |
| Pointer down outside | Closes (existing behavior) |
| Escape | Closes only the help, never an enclosing `DetailDrawer` or `Modal`. While open, the help registers a `window` keydown listener in the **capture** phase that closes it and calls `stopPropagation()`, so the drawer's bubble-phase `window` listener never sees the key. This works whether the help was opened by hover (focus elsewhere) or by focus. Focus returns to the trigger only if focus was inside the panel; otherwise it stays where it is. |
| After an explicit dismissal (Escape or close button) | The help does not reopen just because focus is on, or returns to, the trigger. Reopening requires focus to leave and come back, or the pointer to re-enter the trigger (WCAG 1.4.13: dismissible). |

What stays the same:

- **Rendering:** in place, absolutely positioned under the trigger, right-aligned, with the horizontal viewport shift and a max height capped to the space below. The help stays inside the drawer's `aria-modal` subtree and focus trap.
- **ARIA:** the trigger keeps `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`. The panel stays a non-modal `role="dialog"` labelled by its title.

The panel becomes focusable in tab order (`tabIndex={0}`), so keyboard users can scroll long content. The file's header comment is updated: "never on hover" is replaced by the new contract.

**New generic width prop.** `width?: 'default' | 'wide'` on `HelpPopover`, passed through by `KeyedHelpPopover`:

- `default` (the default) is today's compact `w-[min(22rem,calc(100vw-2rem))]`.
- `wide` is `w-[min(55rem,calc(100vw-2rem))]` (about 880 px), used by the provider help.

**New optional `children` on `KeyedHelpPopover`.** They render after the key-driven intro and sections, so a feature can append custom content while keeping the shared locale-key convention.

### 3b. Provider drawer help content

In `ProvidersCatalogueTable.tsx` the trigger stays the existing "?" in the DetailDrawer header:

```tsx
<KeyedHelpPopover helpKey="providers.help" sections={['role', 'credential']} width="wide">
  <ProviderRelationshipsContent providers={allProviders} isLoading={…} isError={…} />
</KeyedHelpPopover>
```

Content, top to bottom:

1. `providers.help.title` / `providers.help.intro` (existing).
2. **Role** (existing `providers.help.role.*`).
3. **Credential** (existing `providers.help.credential.*`).
4. **Provider relationships**, rendered by `ProviderRelationshipsContent`:
   - a section heading
   - three short intro sentences:
     - "Compute providers run workloads such as virtual machines or LPARs. They can use one or more storage providers as backing storage."
     - "IBM FlashSystem providers can additionally reference another FlashSystem as their replication partner."
     - "Relationships shown below are built from the current provider configuration." (muted)
   - a one-line legend: `Compute → Backing storage → Storage` (blue) and `Storage ↔ Partner ↔ Storage` (orange)
   - the relationship rows

The old `partner` section is dropped from the `sections` list, and its `providers.help.partner.*` keys become unused and are removed. The relationship texts live under `providers.relationships.*`, not under `providers.help.*`, because `src/locales/detailDrawerHelpTranslations.test.ts` requires every `*.help.*.title` to have a `.text`.

The rows use the **whole `allProviders` dataset** and show the full relevant topology, not only the selected provider. The selected provider gets no special treatment.

### Relationship rows (approved template v2)

Visual reference: [2026-10-02-provider-relationships-helper-template.html](2026-10-02-provider-relationships-helper-template.html). Only its *content* applies (intro, legend, rows, states). Its modal shell is superseded: the content renders inside the shared `HelpPopover` panel with `width="wide"`.

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
- **Partner repetition**: the partner always renders as connector + full card, also when the same partner appears in several compute rows, so every row reads on its own. (Revision 2026-10-04: this supersedes the compact one-line partner references shown in template v2.)
- **Panel width**: inside the wide panel the rows use the template column widths. When the panel is narrower than about 760 px (a small viewport), they collapse into a vertical stack with vertical connectors. No horizontal scroll.

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

- `helpers/buildRelationshipRows.ts`: a pure view model from `ProviderTopology` to rows. It owns the ordering, the partner direction, and the selection for "Other storage relationships" (partner relationships that no compute row rendered).
- `components/ProviderRelationshipsContent.tsx`: renders the approved v2 content (intro, legend, rows, states) from the view model, with no business rules. Small subcomponents (card, connector) go into sibling files if a file would exceed about 200 lines.
- Shared `HelpPopover` / `KeyedHelpPopover`: hold the interaction and the `width` / `children` props (3a). There is no Providers-specific popover component.

## Tech Stack

React 19 + TypeScript, Tailwind v4 tokens from `src/index.css`, TanStack Query via the generated Orval hooks (`useGetProviders` + `selectProviders`), and Vitest + Testing Library. No new dependencies.

## Commands

```
Focused tests: npm exec vitest run <changed test files>
Focused lint:  npx eslint <changed files> --max-warnings 0
Layout check:  node scripts/orval/check-feature-layout.mjs
Typecheck:     npm run typecheck   (ProviderCreateForm, HelpPopover and KeyedHelpPopover props change)
Whitespace:    git diff --check
```

The full suite (`npm test`) and the production build are not run by default (CLAUDE.md §5).

## Project Structure

```
src/features/providers-connectors/providers/
  model/providerCategory.ts(+.test.ts)                     Part 1
  helpers/resolveProviderTopology.ts(+.test.ts)            Part 1
  components/ProviderCreateForm.tsx(+.test.tsx)            Part 2
  components/ProvidersCreateModal.tsx(+.test.tsx)          Part 2
  components/ProvidersCatalogueTable.tsx(+.test.tsx)       Parts 2 and 3b (backing row, help content)
  pages/ProviderDetailPage.tsx(+.test.tsx)                 Part 2
  pages/ProvidersPage.tsx                                  Part 3b (pass all-providers loading/error state)
  helpers/buildRelationshipRows.ts(+.test.ts)              Part 3b
  components/ProviderRelationshipsContent.tsx(+.test.tsx)  Part 3b
src/shared/components/help-popover/HelpPopover.tsx(+.test.tsx)       Part 3a
src/shared/components/help-popover/KeyedHelpPopover.tsx(+.test.tsx)  Part 3a
src/features/**/*.test.tsx (help "?" interactions)                   Part 3a, only where the new contract requires it
src/locales/{en,sk,cs}.json                                          Parts 2 and 3b
```

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
  - The same partner reached from several compute rows is a full partner link in every row.
  - Direction is `both` only for mutual relationships; otherwise `out` or `in`.
  - "Other storage relationships" lists only partner relationships not shown above and is empty when nothing remains.
  - A storage provider with no relationships is not listed.
- **`ProviderRelationshipsContent.test.tsx`**
  - Intro and legend render.
  - Each state shows its text label: Unavailable, Mismatch, No backing storage provider.
  - The connectors' hidden text conveys direction.
  - Loading, error and empty states render.
- **`HelpPopover.test.tsx`** (shared; fake timers for the delays):
  - Hover opens the help.
  - Moving the pointer from trigger to panel keeps it open.
  - Leaving both closes it.
  - Focus opens it.
  - Tab or focus inside the panel keeps it open.
  - Focus moving outside closes it.
  - Opening by hover does not move focus.
  - Escape closes only the help and not the enclosing `DetailDrawer`, both when hover-opened (focus elsewhere in the drawer) and when focus-opened. A second Escape closes the drawer.
  - Click/tap fallback opens the help, and a click on an already open trigger keeps it open.
  - After Escape or the close button, focus on the trigger does not reopen it until focus leaves or the pointer re-enters.
  - The close button returns focus to the trigger.
  - Pointer down outside closes the help.
  - `width="wide"` applies the wide width, and the default width is unchanged.
  - Existing tests that assert "moves focus into the panel" or "closes on a second trigger click" are replaced, because the contract changes.
- **`KeyedHelpPopover.test.tsx`**
  - `children` render after the sections.
  - `width` passes through.
- **Feature tests that open "?" by click** (about 20 files, for example `CredentialsTable`, `RecoveryGroupsTable`, `PowerInventoryView` and `ProvidersCatalogueTable`):
  - Run them unchanged first. The click fallback is designed to keep them passing.
  - Adjust only those that fail because of the new contract, such as a second click expected to close, or focus expected inside the panel. Do not rewrite passing tests.
- **`ProvidersCatalogueTable.test.tsx`**
  - The provider help contains Role, Credential and the relationship content, and no Partner section.
  - No modal is rendered.

## Implementation Order and Commits

Each step is verified with focused tests, focused lint and, where needed, typecheck, then committed atomically with explicit paths (other sessions share the working tree).

1. **Commit 1:** classifier and resolver, plus their unit tests.
2. **Commit 2:** form and create modal, drawer and detail backing storage row, form and detail translations, plus their tests.
3. **Commit 3:** shared `HelpPopover` hover/focus contract, the `width` prop and `KeyedHelpPopover` `children` / `width`, plus shared tests and any feature help tests the new contract requires.
4. **Commit 4:** provider help content:
   - `buildRelationshipRows`
   - `ProviderRelationshipsContent`
   - wiring in `ProvidersCatalogueTable` / `ProvidersPage`
   - translations, including removal of `providers.help.partner.*`
   - tests

Commit 3 is cross-cutting (every detail help). Its verification runs every test file that interacts with a "?" help, not only the shared tests.

## Boundaries

- **Always:**
  - Derive every relationship from provider data by id.
  - Keep `unresolved` and `mismatch` visible.
  - Use the classifier instead of type literals for relationship logic.
  - Run focused verification before each commit.
- **Ask first:**
  - Any change to `src/generated/**`, OpenAPI or the backend.
  - Changes to Metro Mirror, discovery or VM tag logic.
  - Changes to the shared `DetailDrawer` or `Modal`.
  - Changes to `HelpPopover` / `KeyedHelpPopover` beyond the contract in Part 3a.
  - New dependencies.
- **Never:**
  - Hardcode links between concrete provider ids.
  - Enable partners for `HITACHI`.
  - Auto-correct or create reverse relationships.
  - Add a backend `category` or `capabilities` field.
  - Build a global graph with crossing lines.
  - Add a modal, a link, or a second hover/focus/positioning/Escape implementation outside the shared `HelpPopover`.

## Success Criteria

- `VMWARE` and `IBM_POWER` can both select, save and display backing storage from `FLASHCOPY` and `HITACHI` providers.
- The partner field and its candidates follow FLASHCOPY → FLASHCOPY only, never self and never `HITACHI`, matching the backend contract.
- Type changes keep or clear backing storage and partner exactly as listed in Part 2.
- The drawer and detail page show backing storage for compute providers without an extra API call.
- Every existing "?" help (the shared `HelpPopover`, including all `KeyedHelpPopover` usages) behaves as follows:
  - Hover and focus open it.
  - It stays open while the trigger or panel is hovered or focused, and closes when both pointer and focus leave.
  - Opening by hover never moves focus.
  - Escape closes only the help, never the enclosing drawer.
  - On touch, a click or tap still opens it.
- The provider drawer "?" opens one wide help containing Role, Credential and the approved relationship content, built from the full `allProviders` dataset. No modal exists for this content.
- The relationship content matches template v2 in every listed state, uses `↔` only for mutual partners, and reads left to right.
- No changes under `src/generated/**`, OpenAPI or the backend.
- Metro Mirror, discovery and VM tag behavior is unchanged.
- Feature tests that open "?" by click are changed only where the new contract requires it.

## Resolved decisions

- **Trigger:** the existing "?" in the provider DetailDrawer header. No modal and no extra button.
- **Interaction:** hover/focus changes **globally** in the shared `HelpPopover`, and every `KeyedHelpPopover` usage inherits it. Click/tap stays as an open-only fallback.
- **Content:** a single wide help holding Role, Credential and Provider relationships (template v2 content), appended via `KeyedHelpPopover` `children`.
- **Width:** a generic `width: 'default' | 'wide'` prop on the shared popover.
- **Type label:** the existing `providerTypeLabel` ("FlashCopy") is used unchanged.
- **Portal:** in place by default. Portalling is approved only if it becomes necessary, and the Escape and focus-trap contract must hold.
