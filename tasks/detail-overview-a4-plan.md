# Implementation Plan: Shared Overview layout (A4)

Task list: `tasks/detail-overview-a4-todo.md`. Branch `spike/ant-design-shell`.
Planning only. No production code changes until the plan is approved.

## 0. Blockers
- **Foreign uncommitted change in `src/shared/components/detail-view/index.ts`.** Another
  session removed the `DetailCopyButton` export and has not committed it (worktree on
  2026-10-06). A task that edits this file must not start until that change is committed or
  reverted by its owner, or is explicitly resolved with the user.
  - Only Task 6 (export `DetailOverview`) needs this file.
  - Never overwrite, stage or commit the foreign hunk.
  - Check with `git diff -- src/shared/components/detail-view/index.ts` right before the task.
  - **Status 2026-10-06:** resolved by its owner. The change was committed as `90d66d79`
    (`refactor(detail-view): remove unused copy-button barrel export`), so `DetailCopyButton`
    is intentionally no longer exported. The rule stays: re-check `git diff` for new foreign
    hunks right before Task 6.

## Overview
Every DetailView has an `Overview` section, and each of the 14 consumers builds it by hand
from `DetailFieldGroup` + `DetailField`. This plan adds one shared Overview primitive that
owns the layout (grid, column count, rhythm, spacing, row separators, wide/full spans) and
moves all `id="overview"` consumers onto it. A consumer passes only `DetailField`s.

Chosen visual direction **A4**: the A1 "Tight technical" grid from
`prototypes/detail-overview-design/` plus the A2 horizontal row rule. Nothing else changes:
no content redesign, no business logic, no other sections.

## 1. Current state (audit, worktree on 2026-10-06)

### Shared components (`src/shared/components/detail-view/`)
- `DetailView.tsx`: the active section's content region is
  `@container/detail-content` with `px-(--detail-gutter) py-6` (1.25rem / 2rem gutter).
  `DetailViewSection` stacks its children with `flex flex-col gap-7`.
- `DetailField.tsx`:
  - `DetailField` renders a grid cell (label above value). Inside `DetailTechnicalGroup` it
    reads `TechnicalContext` and renders a "label | mono value | copy" row instead.
    `wide` = `col-span-full`. Empty value → muted "Not set". `mono` →
    `font-mono text-[12.5px] text-text-secondary`.
  - `DetailFieldGroup`: optional `h4` title, then
    `grid-cols-1 @min-[520px]/detail-content:grid-cols-2 @min-[860px]/detail-content:grid-cols-3`,
    `gap-x-10 gap-y-5`. Consecutive groups get a hairline + `pt-7`.
  - `DetailTechnicalGroup`: recessed identifier rows.
- `DetailStatusBlock.tsx` also renders `DetailField`s in its own `dl` grid (must not change).
- `index.ts` exports all of the above.

### Root cause
1. **Layout is decided by the consumer.** Every Overview picks its own grouping, its own
   `wide` flags and its own number of `DetailFieldGroup`s. The same entity shape therefore
   looks different from feature to feature.
2. **Hardcoded column counts.** `DetailFieldGroup` jumps 1 → 2 → 3 columns at 520 / 860 px.
   It never uses the real width: at `xl` (≈926 px of content) there are 3 wide columns with
   large `gap-x-10` gaps, and a 2-field group leaves a whole empty column.
3. **Groups multiply whitespace.** Each group adds a title, a hairline and `pt-7`. Groups of
   2–3 fields (VM: 2 + 3 + 4, Users: 4 + 2, Recovery groups: 2 + 4) produce mostly gaps.
4. **`wide` is a blunt instrument.** `wide` always means a full row. Short descriptions
   ("Primary site storage.") take a full row, while long plain values without `wide` wrap
   into a narrow column.
5. **Loose vertical rhythm.** `gap-y-5` + `mt-1` gives a ~60 px row pitch with nothing that
   holds the eye on a row once there are 10+ fields.

### `id="overview"` consumers (14 files, 16 Overview sections)

| # | Consumer | DetailView size | Overview content | Groups | Technical in Overview | `wide` fields | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx` | xl | 9 fields | **3 titled** (Compute, Guest, Placement) + section `description` | – | Folder (string), Tags (node: tag pills) | secondary on Cluster and Datastore; mono IP |
| 2 | `platform-administration/identity-access/components/ClientsSection.tsx` | md | **3 sections with `id="overview"`**: error (`FetchErrorAlert`), loading (skeleton `DetailFieldGroup` × 6), loaded (3 fields) | 1 | – | – | Type = `Badge` node |
| 3 | `platform-administration/identity-access/components/RealmRolesSection.tsx` | md | 3 fields | 1 | – | Description (string) | |
| 4 | `platform-administration/identity-access/components/UsersSection.tsx` | md | 6 fields | **2 titled** (Profile, Account) | – | – | |
| 5 | `platform-administration/platform-providers/components/PlatformProvidersTable.tsx` | md | 3–9 fields depending on `type` (conditional fields and fragments) | 1 | – | Description (string), URL (node: external `DetailFieldLink`, `mono`) | |
| 6 | `providers-connectors/credentials/components/CredentialsTable.tsx` | md | 3 fields | 1 | – | Description (string) | Username `mono` + `emphasis` |
| 7 | `providers-connectors/providers/components/ProvidersCatalogueTable.tsx` | md | 4 fields | 1 | – | Description (string), URL (node: external link) | |
| 8 | `recovery-actions/pages/RecoveryActionsHistoryPage.tsx` | md | 5 fields | 1 | – | Summary (string) | |
| 9 | `recovery-plans/policy-sets/components/PolicySetsTable.tsx` | md | 4 fields | 1 | **yes** (Policy set ID + copy) | Description (string) | |
| 10 | `recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx` | md | 4–5 fields | 1 | – | Description (string), Submission (node: `Badge` + mono secondary) | |
| 11 | `recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx` | xl | 6 fields | **2 titled** (General, Workload) + section `description` | – | Description (string) | test asserts both group headings |
| 12 | `recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx` | md | 6 fields | 1 | **yes** (Policy ID) | Description (string) | |
| 13 | `recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx` | md | **1 field** | 1 | **yes** (Policy ID) | Description (string) | 1-field case |
| 14 | `recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx` | md | 5 fields | 1 | **yes** (Policy ID) | Description (string) | |

Findings for the six audit questions:
1. **Overview consumers:** the 14 files above. `ClientsSection` has three mutually exclusive
   `id="overview"` sections (error, loading, loaded).
2. **`DetailFieldGroup` outside Overview** (must stay as-is): Roles (Users, Clients), Connection
   and Relationships (Providers, Platform providers), FlashSystem and IBM Power field sections,
   `AccessLogDetailView`, `BackingStorageInfo`, `OrchestratorResultModal`, and
   `DetailStatusBlock` facts. `DetailFieldGroup` is **not** obsolete after this plan.
3. **Multi-group Overviews:** VM (3), Users (2), Recovery groups (2).
4. **`DetailTechnicalGroup` inside Overview:** Policy sets, Recovery app policies, Clean room
   and Snapshot policies (ID + copy under the field grid). It stays where it is, unchanged.
5. **`wide` in Overviews:** 12 string-valued fields (10 descriptions, the action Summary, the VM Folder) and
   4 node-valued fields (two external URLs, VM tags, application submission).
6. **Layout assumptions A4 could break:**
   - `RecoveryGroupsTable.test.tsx:573-574` asserts the "General" and "Workload" headings
     (only if group titles are dropped, see D3).
   - `DetailContent.test.tsx` asserts `DetailFieldGroup`'s grid classes. That stays valid
     because `DetailFieldGroup` does not change.
   - No consumer test asserts Overview grid classes, column counts or `col-span-*`.
   - No popover or absolutely positioned content inside any Overview value. The clip used
     for the last-row separator (D5) cannot hide one.
   - `DetailField` is also rendered by `DetailStatusBlock` and every non-Overview group. A4
     typography must apply only inside the new primitive (D2).

Out of scope: FlashSystem (`placement` first section) and IBM Power (`summary` first section)
have no `id="overview"`. They are listed as a follow-up in Open questions.

## 2. Architecture decisions

### 2.0 Values approved at Checkpoint 0
Filled in at Checkpoint 0. Production tasks (Phase 1+) use only these values. Until then the
prototype defaults apply, and they may change in the prototype without touching production.

| Decision | Prototype default | Approved |
|---|---|---|
| Multi-group Overviews (D3) | grouped | _pending_ |
| `NORMAL_MAX` (plain text up to N chars = one track) | 34 | _pending_ |
| `WIDE_MAX` (up to N chars = two tracks; above = full row) | 72 | _pending_ |
| Track minimum incl. 1.75rem cell gutter (D5) | 12.75rem | _pending_ |
| Two-track span gate (content width) | 24rem | _pending_ |
| Cell padding / label → value / label size (D6) | `py-2` / 2 px / 11.5px medium | _pending_ |
| Full-row prose cap | 88ch | _pending_ |

**D1. New `DetailOverview` primitive, not a `DetailFieldGroup` variant.**
- Extending `DetailFieldGroup` (e.g. `variant="overview"`) would put a layout switch on every
  call site, which is the consumer-side decision this plan removes. It would also tempt
  restyling the 9+ non-Overview usages.
- A schema-driven renderer (`fields={[…]}`) would replace JSX that already works (fragments,
  conditional fields, custom nodes) for no gain.
- `DetailOverview` is one small component next to `DetailFieldGroup` and
  `DetailTechnicalGroup` in `DetailField.tsx`, with the same children contract
  (`DetailField` elements, fragments and conditionals allowed).

**D2. Layout context instead of a second field component.** The private `TechnicalContext`
(boolean) becomes a private `FieldLayoutContext` with the values
`'grid' | 'technical' | 'overview'`. The default `'grid'` keeps today's rendering for
`DetailFieldGroup`, `DetailStatusBlock` and loose fields. `DetailOverview` provides
`'overview'`, and `DetailField` switches its A4 typography and span logic on it. Consumers keep
using `DetailField` with the same props.

**D3. Grouped vs flat is decided in the prototype (Checkpoint 0), not in production.**
VM (Compute / Guest / Placement), Users (Profile / Account) and Recovery groups (General /
Workload) are the only multi-group Overviews.
- Phase 0 shows the same VM-style fields in the same order two ways: **A4-grouped** (titled
  blocks) and **A4-flat** (one grid, no headings).
- The user picks one at Checkpoint 0, and the result goes into §2.0. The pilot does not
  revisit it.
- **If grouped:** `DetailOverview` gets an optional `title` (same `h4` as `DetailFieldGroup`).
  The three Overviews become consecutive titled `DetailOverview` blocks. No locale or test
  changes.
- **If flat:**
  - `DetailOverview` has no `title` prop.
  - The three Overviews become one `DetailOverview` each, with the fields in today's order.
  - The 7 group-title keys are removed from en/cs/sk.
  - `RecoveryGroupsTable.test.tsx:573-574` changes from asserting the two headings to
    asserting the field order.

**D4. The span is decided by the shared layer.** Inside `DetailOverview`, `DetailField`
computes a footprint:
- **normal** is one track.
- **wide** is two tracks when the content is ≥ 24rem wide, otherwise one.
- **full** is the whole row.

The rules:
- **Plain-text values** (`typeof value === 'string'`) are measured by character count against
  two thresholds, `NORMAL_MAX` and `WIDE_MAX`.
- **Empty values** ("Not set") are always normal.
- **Node values** (links, badges, tag lists, skeletons) cannot be measured, so `wide` stays the
  consumer's only signal: `wide` → full, otherwise normal.
- The `wide` prop on a plain-text Overview field is ignored. It is removed from those call
  sites in the cleanup phase.
- **The thresholds are not a contract yet.**
  - The prototype heuristic is 34 / 72 characters.
  - Phase 0 checks it, including values just around both thresholds.
  - Only the values approved at Checkpoint 0 (§2.0) go into production.
- **Internal, not public:**
  - The rule lives in a new internal module
    `src/shared/components/detail-view/overviewLayout.ts`: `getOverviewFootprint`, the
    `OverviewFootprint` type and the two threshold constants.
  - `DetailField.tsx` and its unit test import it directly.
  - It is **not** exported from `detail-view/index.ts`, because no consumer needs it.

**D5. Grid and separator mechanics (A4).**
- **Grid:** `grid-template-columns: repeat(auto-fill, minmax(min(12.75rem, 100%), 1fr))` with
  no fixed column count and no viewport breakpoints. The track count follows the DetailView
  content width. 12.75rem = A1's 11rem track + 1.75rem gutter, because the gutter moves into
  the cell (next point).
- **Separator:** `column-gap: 0`, and each cell gets `padding-inline-end: 1.75rem`. The row
  rule is a 1 px line at the cell's bottom (`::after`, `position: relative` cell). Its
  `box-shadow` copies sit 12rem apart (never wider than a track) and run on to the grid's
  right edge. (Revised in Task 1: a plain `border-bottom` left gaps, see below.)
  - Every grid row therefore has one continuous rule, even when it ends early.
  - Shadows are ink overflow, so they add no scrolling.
  - The colour is an opaque mix (`color-mix(border 60%, surface)`), so overlapping copies do
    not darken.
  - No vertical rules, no outer border, no background. This is not a cell grid.
- **Clip:** the `dl` gets `clip-path: inset(-0.5rem 0 2px -0.5rem)`.
  - It cuts the shadow copies at the right edge, and the bottom 2 px, which hold the last
    row's rule, whatever the number of fields in that row.
  - Why 2 px: a grid that ends on a fractional pixel (e.g. a row of tag pills) draws the 1 px
    rule across two device pixels, and a 1 px clip left a visible line (Task 2 finding).
  - The 2 px come out of the cell's 8 px bottom padding, so a focus ring in the last row stays
    clear of the clip.
  - Focus rings keep 0.5rem at the top and left.
  - The right edge stays clear because of the cell end-padding.
- **Order:** `grid-auto-flow: row`, never `dense`, so the visual order equals the DOM and field
  order. A wide field that does not fit at the end of a row moves to the next row and leaves
  empty tracks; the rule still spans them.
  - Prototype finding (Task 1): with a plain `border-bottom` those rows had visible gaps in
    the rule. The shadow rule above fixes that.
- **Narrow width:** below 24rem the grid is one column and the cell end-padding is 0.5rem
  (room for a focus ring at the right edge).

**D6. A4 tokens (Overview only).**
- **Cell:** `py-2`. Row pitch ≈ 8 + 16 + 2 + 20 + 8 px + 1 px rule, versus ≈ 60 px today.
- **Label:** `text-[11.5px] font-medium leading-4 text-text-muted`, regular case, no
  uppercase.
- **Label → value:** `mt-0.5` (2 px).
- **Value:** `text-sm leading-5 text-text-primary`, `font-semibold` with `emphasis`.
- **Mono:** `font-mono text-[12.5px] text-text-primary` (normal contrast, no pill, no
  outline).
- **Secondary:** `mt-0.5 text-[11.5px] leading-4 text-text-muted`.
- **Copy, link and Not set:** unchanged components (`DetailCopyButton`, `DetailFieldLink`,
  muted "Not set").
- **Full-row plain text:** capped at `max-w-[88ch]` for readability.
- **No** card, surface, background, uppercase or outlined code.

The tokens are first confirmed as variant **A4** in the prototype (Phase 0). Any change is
made in the prototype and recorded in §2.0 before production code.

## 3. Proposed shared API

Public API (the only new export from `detail-view/index.ts`):

```tsx
// src/shared/components/detail-view/DetailField.tsx
interface DetailOverviewProps {
  // Only if Checkpoint 0 = grouped: heading for one titled block (D3).
  title?: string | undefined
  // DetailField elements; fragments and conditional (falsy) children are fine.
  children: ReactNode
}
export function DetailOverview(props: DetailOverviewProps): JSX.Element
```

Internal (not exported from `index.ts`):

```ts
// src/shared/components/detail-view/overviewLayout.ts
export const NORMAL_MAX = /* approved at Checkpoint 0 */
export const WIDE_MAX = /* approved at Checkpoint 0 */
export type OverviewFootprint = 'normal' | 'wide' | 'full'
export function getOverviewFootprint(value: ReactNode, wide: boolean): OverviewFootprint
```

Consumer usage after migration:

```tsx
<DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
  <DetailOverview>
    <DetailField label={t('details.type')} value={providerTypeLabel(selected.type)} emphasis />
    <DetailField label={t('details.notificationEmail')} value={selected.notificationEmail} />
    <DetailField label={t('details.description')} value={selected.description} />
    <DetailField label={t('details.url')} value={selected.url ? <DetailFieldLink href={selected.url} external>{selected.url}</DetailFieldLink> : null} wide />
  </DetailOverview>
</DetailViewSection>
```

`DetailField`'s props do not change. The `wide` comment is updated to say that inside a
`DetailOverview` plain text sizes itself and `wide` applies to node values only.

## 4. Files

| File | Change |
|---|---|
| `prototypes/detail-overview-design/{data.js,templates.js,app.js,index.html}` | A4, A4-grouped / A4-flat, VM multi-group and threshold-probe datasets, production-faithful footprint |
| `src/shared/components/detail-view/overviewLayout.ts` (new, internal) | `getOverviewFootprint`, `OverviewFootprint`, `NORMAL_MAX`, `WIDE_MAX` |
| `src/shared/components/detail-view/overviewLayout.test.ts` (new) | footprint table test, imports the internal module directly |
| `src/shared/components/detail-view/DetailField.tsx` | `FieldLayoutContext`, `DetailOverview`, Overview branch in `DetailField` |
| `src/shared/components/detail-view/index.ts` | export `DetailOverview` only (§0 blocker resolved in `90d66d79`; re-check `git diff` before editing) |
| `src/shared/components/detail-view/DetailContent.test.tsx` | `DetailOverview` tests and regression tests for the other contexts |
| the 14 consumer files in §1 | `DetailFieldGroup` → `DetailOverview` inside `id="overview"` only; import update |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx` | only if Checkpoint 0 = flat |
| `src/locales/{en,cs,sk}.json` | only if Checkpoint 0 = flat: remove the 7 group-title keys |
| `tasks/detail-overview-a4-todo.md` | progress and final audit record |

## 5. Migration phases

1. **Phase 0, prototype (no production code).**
   - A4 with production-faithful footprint rules (strings measured, nodes only via `wide`), no
     `dense`, last-row clip.
   - A4-grouped vs A4-flat on a VM-style multi-group dataset (Compute / Guest / Placement),
     same fields, same order.
   - A threshold-probe dataset with values just below, at and above both thresholds. It covers
     description, URL, email, ID, path, a short label with a long value, and node values.
   - Responsive and stress validation at MD/LG/XL/Narrow, Normal and Long, light and dark.
2. **Checkpoint 0 (user).** Approve the A4 look, decide grouped vs flat, and approve the
   footprint behaviour and thresholds. The results go into §2.0. Nothing in Phase 1+ starts
   before this.
3. **Phase 1, shared primitive and shared tests.** The internal `overviewLayout.ts`, then
   `DetailOverview` and the layout context, with jsdom tests. No consumer changes yet.
   The §0 blocker for exporting `DetailOverview` is resolved (`90d66d79`). Re-check
   `git diff -- src/shared/components/detail-view/index.ts` right before Task 6, and stop if a
   new foreign hunk appears.
4. **Phase 2, pilot.** `ProvidersCatalogueTable`: 4 fields covering emphasis, plain email,
   measured description and an external-link node with `wide`. Connection, Relationships and
   Technical stay untouched.
   - **Checkpoint 2:** the user only confirms that production matches the approved prototype.
     Grouped vs flat and the thresholds are not reopened here.
4. **Phase 3, the remaining 13 consumers in small batches:**
   - **3a, single group, plain:** RealmRoles, Credentials, Recovery action history, Platform
     providers (conditional fields).
   - **3b, Overview + `DetailTechnicalGroup`:** Policy sets, Recovery app policies, Clean
     room (1 field), Snapshot policies.
   - **3c, node values and states:** Recovery applications (badge + mono secondary), Clients
     (loaded and loading skeleton; the error state stays an alert).
   - **3d, multi-group:** Users, Recovery groups, VM, built as decided at Checkpoint 0
     (titled blocks or one flat grid, D3).
5. **Phase 4, cleanup and final audit after all consumers are migrated.**
   - Remove the now-ignored `wide` from plain-text Overview fields.
   - Update the `DetailFieldGroup` doc comment to say it is for non-Overview sections.
     `DetailFieldGroup` itself stays (§1 finding 2).
   - Run the final audit (§6): an explicit list of the 14 files, grep counts against the
     expected table, and the consumer focused tests. No source-parsing test is added.
   - The prototype directory stays until the user decides (Q3).

Each phase leaves the app working. Unmigrated Overviews keep today's look until their batch.

## 6. Test strategy

Focused runs only (CLAUDE.md §5): `npm exec vitest run <files>`, plus `npx eslint <changed files>`.
`npm run typecheck` runs after the shared task (new export) and once at the end.

**Internal helper (`overviewLayout.test.ts`, imports `./overviewLayout` directly):**
- Table test at the approved thresholds:
  - `NORMAL_MAX` characters → normal
  - `NORMAL_MAX + 1` and `WIDE_MAX` characters → wide
  - `WIDE_MAX + 1` characters → full
- Empty, null or blank → normal, even with `wide`.
- Node without `wide` → normal; node with `wide` → full.
- String with `wide` → measured (the flag is ignored).
- The public barrel does not expose it: `Object.keys(await import('./index'))` has no
  `getOverviewFootprint`.

**Shared component (`DetailContent.test.tsx`, jsdom):**
- `DetailOverview` renders a `dl` whose class includes the auto-fill track. No `grid-cols-1|2|3`
  and no `@min-[…]:grid-cols-*` classes.
- Each field cell has the bottom-rule class and no `border-l`, `border-r` or `border-t`. The
  `dl` has the last-row clip class. There is no background or ring class on the `dl` or the
  cells.
- Footprint classes on cells: normal → none; wide → the container-gated `col-span-2`; full →
  `col-span-full`.
- Overview typography: the label has the medium 11.5px classes and no `uppercase`; mono
  values use `text-text-primary`, not `text-text-secondary`.
- Behaviour is kept inside an Overview: Not set, secondary line, copy button with its accessible
  name, `DetailFieldLink` external attributes, badge node, `dt`/`dd` pairing.
- Only if Checkpoint 0 = grouped: `title` renders an `h4`; no title renders no heading.
- Regression: the same `DetailField` inside `DetailFieldGroup`, `DetailTechnicalGroup` and
  `DetailStatusBlock` keeps its current classes (existing tests stay green, plus one
  explicit assertion).

**Consumers:** for each migrated file run its own test file and its page test (map in the
todo). Those tests query by role and text, so they must pass unchanged. A required test change
other than the flat-only Recovery groups heading assertion means a regression.

**Final audit (Phase 4).** This is a documented command, not a test: no JSX parser and no
source-scanning test. Over the explicit list of the 14 consumer files:
- `rg -c "<DetailFieldGroup"` must match the expected table. The remaining usages are all
  non-Overview sections:

  | File | Expected `<DetailFieldGroup` | Sections |
  |---|---|---|
  | `ClientsSection.tsx` | 1 | roles |
  | `RealmRolesSection.tsx` | 2 | permissions, users |
  | `UsersSection.tsx` | 1 | roles |
  | `PlatformProvidersTable.tsx` | 1 | connection |
  | `ProvidersCatalogueTable.tsx` | 2 | connection, relationships |
  | the other 9 files | 0 (and no `DetailFieldGroup` import) | – |

- `rg -n "<DetailOverview"` lists the Overview blocks:
  - 15 if flat, or 19 if grouped (VM 3, Users 2, Recovery groups 2).
  - Clients counts twice (loading + loaded); its error state has none.
- Each remaining `<DetailFieldGroup` hit is confirmed by eye to be outside `id="overview"`.
- The consumer focused tests from Tasks 7–15 are re-run.

**Not run by default:** the full suite and `npm run build` (CLAUDE.md §5). Run them once at
the final checkpoint only if the user asks.

## 7. Browser verification

Real app on the Vite dev server (`http://localhost:5173`) in an own Edge tab over CDP
`127.0.0.1:9333`. The user logs in to Keycloak once. Dark mode = `.dark` on `<html>`.

For the pilot and each batch, open each migrated detail (e.g. `/providers-connectors/providers`,
`/platform-administration/identity-access`, `/recovery-plans/policy-sets`,
`/recovery-plans/recovery-groups`, `/discovery-inventory/resources`) and check:
1. **Widths:**
   - viewport 1440 × 900 at the consumer's own size (md, or xl for VM and Recovery groups)
   - viewport 1024 (dialog capped)
   - 375 × 800 narrow (navigation above the content, one column)
2. **Measured with a script, not by eye:**
   - `scrollWidth <= clientWidth` for the content region and the `dl` (no overflow)
   - every cell's right edge is inside the `dl`
   - computed `border-left-width` / `border-right-width` = 0 on cells
   - the last row's bottom rule is not visible: rows are grouped by `offsetTop`, and the `dl`'s
     clip covers the last group's border
3. **Screenshots** in light and dark mode, compared with prototype A4 for rhythm: label → value
   ≈ 2 px, continuous row rules, no vertical lines, no surface.
4. **Interactions:** the copy button copies and confirms, the external link opens in a new
   tab, Tab focus rings stay visible (not clipped) on the first and last row.
5. **Unchanged sections:** Connection, Relationships, Roles and Technical look exactly as
   before.

Long values: use real records with long descriptions or URLs where they exist. Otherwise
check long values with prototype A4 only, so no data is edited.

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hidden layout dependency on `DetailFieldGroup` classes in a consumer or test | Med | Audit found none outside `DetailContent.test.tsx`. Each batch runs its own and page tests. |
| A4 typography leaks into `DetailStatusBlock`, Connection or other groups | High | Context default `'grid'`; explicit regression test; browser check of untouched sections. |
| `clip-path` hides focus rings or future popovers in the last row | Med | Clip only the bottom 1 px, with -0.5rem on the other sides; cells have `py-2` so the bottom ring stays above the rule; no popovers in Overviews today; Tab check in the browser. |
| No `dense` flow leaves empty tracks when a wide field wraps | Low | Field order and DOM order (a11y) win. The row rule spans the empty tracks (shadow rule, D5; verified in Task 1). How much whitespace remains depends on the thresholds, judged at Checkpoint 0. |
| Length-based span misjudges (e.g. a 36-character email spans two tracks) | Low | Threshold-probe dataset in Phase 0; values approved at Checkpoint 0; one internal module to change. |
| Prototype footprint differs from production (the prototype measured link text; production cannot measure nodes) | Med | Phase 0 switches the prototype to the production rule (links, badges, tags only via `wide`) before anything is approved. |
| Foreign uncommitted change in `detail-view/index.ts` (§0) | Med | Resolved in `90d66d79`. Task 6 re-checks `git diff` right before editing and stops on a new foreign hunk; foreign hunks are never staged or overwritten. |
| Internal helper becomes de facto public | Low | Not exported from the barrel; a test asserts the barrel does not expose it. |
| Node values (badges, tag lists, links) cannot be measured | Low | Explicit `wide` remains for nodes, documented on the prop. |
| Grouped vs flat decided late or by the pilot | Med | Decided at Checkpoint 0 on a real multi-group dataset; Checkpoint 2 only checks fidelity. |
| Parallel sessions edit the same consumer files or stage foreign hunks | Med | Before each task: `git diff` of the task's files must be empty or ours. Commit with `git commit --only -- <paths>`. |
| jsdom cannot prove layout (column count, last-row clip) | Med | Class-level tests in jsdom plus measured CDP checks in §7. |

## 9. Rollback strategy
- One atomic commit per task, so any batch can be undone with `git revert <sha>` without
  touching the others.
- **Consumer batch rollback** is fully reversible because `DetailFieldGroup` is not changed or
  removed. Reverting a batch restores the old Overview.
- **Shared rollback:** revert the Phase 1 commit only after reverting all consumer commits, or
  as one `git revert <first>..<last>` range.
- Phase 4 cleanup (removing ignored `wide` flags) comes last and in its own commit, so a
  rollback before it never has to put flags back.

## 10. Acceptance criteria
- [ ] All 14 `id="overview"` consumers are migrated. All field-based Overview render paths (15
  of 16) use the one shared
  `DetailOverview` layout. The Clients error Overview stays `FetchErrorAlert` by design. No
  `DetailFieldGroup` remains inside an Overview (final audit counts match §6).
- [ ] The same vertical rhythm (cell padding, label → value 2 px, row rule) at 1 field, 3
  fields and 15+ fields.
- [ ] No hardcoded column count: no `grid-cols-N` and no viewport breakpoint in the Overview
  layout. The track count follows the DetailView content width (auto-fill and `@container`
  only).
- [ ] No per-feature Overview CSS: consumers pass no layout classes, gaps or wrappers to the
  Overview.
- [ ] Narrow/mobile (375 px viewport) without horizontal overflow (measured).
- [ ] Long values (descriptions, URLs, IDs, paths) wrap inside their cell or take a measured
  span. The grid never overflows and never gets wider than the content.
- [ ] The row separator is horizontal only: no vertical rules, no outer border, no surface, no
  per-field boxes. It stays continuous across wide and full spans.
- [ ] The last grid row has no separator, whatever the number of fields in it.
- [ ] Field order, labels, values, links, badges, copy actions, secondary values and Not set
  are unchanged in every consumer (their existing tests pass unchanged, except the flat-only
  Recovery groups heading assertion).
- [ ] Sections outside Overview (Technical, Connection, Relationships, Roles, Orchestration,
  Inventory…) and `DetailTechnicalGroup` inside Overviews are unchanged.
- [ ] No business-logic, data or API changes. Translation changes only if Checkpoint 0 = flat
  (removal of the 7 group-title keys).
- [ ] The public barrel exports `DetailOverview` and nothing else new; the footprint helper
  stays internal.
- [ ] Production uses exactly the Checkpoint 0 values from §2.0.
- [ ] Focused tests and lint for the changed files pass. Light, dark and narrow browser checks
  are recorded in the todo.

## 11. Open questions
- **Q1 (closed at Checkpoint 0):** grouped vs flat for VM, Users and Recovery groups (D3).
  - Flat removes more whitespace, but it drops 7 headings, changes 1 test assertion and
    removes 7 locale keys × 3 languages.
  - The decision is recorded in §2.0.
- **Q2:** should FlashSystem (`placement`) and IBM Power (`summary`) adopt `DetailOverview`
  for their first section later? Not part of this plan.
- **Q3:** keep or delete `prototypes/detail-overview-design/` after Phase 4?
