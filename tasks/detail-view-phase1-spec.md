# Spec: DetailView — phase 1 (shared system + Recovery Group pilot)

Replaces the shared `DetailDrawer` system with a universal `DetailView` based on the approved
prototype Variant D (`prototypes/detail-drawer-redesign/`, concept `d`). Phase 1 builds the shared
system, fixes the monospace token and migrates **only Recovery Group**. All other consumers keep
`DetailDrawer` until later phases.

## Objective

A user opening a detail sees one calm workspace: identity and status in a compact header, a
vertical list of sections, exactly one section's content, and pinned actions. They can switch the
same detail into a compact right-side panel and back without losing the object or the section.

Success = the Recovery Group detail runs on `DetailView` in production with the Variant D look,
and the shared API demonstrably fits every current `DetailDrawer` consumer (mapping below).

## Scope

In:
- New shared folder `src/shared/components/detail-view/` with the primitives below.
- `--font-mono` theme token in `src/index.css`.
- New generic i18n keys (`detailView.*`) in en / cs / sk.
- Recovery Group detail (`RecoveryGroupsTable.tsx`) migrated to `DetailView`.

Out (later phases):
- Migrating any other consumer; deleting `DetailDrawer`, `DetailDrawerSection`, `DetailRow`, `DetailStat`.
- Restyling `RecoveryGroupInventory` (it is hosted as-is in a flush section).
- A table primitive (no pilot need; evaluate `DataTable` reuse with VMware Disks in phase 2).
- Non-modal compact mode, remembering the last mode, abbreviated compact content.
- Backend, API, orchestration, inventory, navigation or Delete/Edit behaviour changes.

## Production API (compositional React, no data-driven renderer)

```tsx
<DetailView
  open={selected !== null}
  onClose={close}
  entityLabel={t('drawer.entity.recoveryGroup')}
  title={selected?.name}
  statuses={[<Badge …>Active</Badge>, unresolved && <Badge …/>]}   // falsy skipped
  meta={orchestrationMetaText(state, t)}                          // one short line, optional
  headerActions={<KeyedHelpPopover … />}
  footerStart={<Button variant="danger">Delete</Button>}
  footer={<Button>Edit</Button>}
  ariaLabel={t('drawer.recoveryGroupDetail')}
  closeLabel={t('drawer.closeRecoveryGroup')}
>
  <DetailViewSection id="overview" title="Overview" icon={GridIcon} description="…">
    <DetailFieldGroup title="General">
      <DetailField label="Description" value={group.description} wide />
      <DetailField label="Policy set" value={policySetName} emphasis />
    </DetailFieldGroup>
  </DetailViewSection>
  <DetailViewSection id="orchestration" title="Orchestration" icon={ExecutionIcon}>
    <DetailStatusBlock title="Latest run" tone="success" status="success" timestamp="…"
      reference={{ label: 'Airflow run ID', value: <AirflowDagLink …/>, copyValue: runId }}
      action={<Button …>View recovery runs</Button>}>
      <DetailField label="Duration" value="10 s" />
    </DetailStatusBlock>
  </DetailViewSection>
  <DetailViewSection id="inventory" title="Inventory" icon={ServerIcon} count={4} flush>
    <RecoveryGroupInventory runId={…} active />
  </DetailViewSection>
  <DetailViewSection id="technical" title="Technical" icon={ApiIcon} secondary>
    <DetailFieldGroup variant="technical">
      <DetailField label="Group ID" value={group.id} copyValue={group.id} />
    </DetailFieldGroup>
  </DetailViewSection>
</DetailView>
```

### `DetailView`
- Props: `open`, `onClose`, `title`, `entityLabel?`, `statuses?: readonly ReactNode[]`, `meta?`,
  `headerActions?`, `footerStart?`, `footer?`, `ariaLabel`, `closeLabel`, `children`.
- Reads its `DetailViewSection` children (falsy children skipped; sections must be direct
  children) to build the navigation. Renders **only the active section's children** (keeps the
  current lazy behaviour: inventory fetches only when its section is shown).
- Modes: `expanded` (default, centred dialog ~960 px wide, fixed height `min(46rem, 94vh)`) and
  `compact` (right drawer, 420 px default, resizable from `lg` via `useResizablePanel`).
  One DOM tree switches frame classes, so content state, focus and section survive a switch.
  The built-in header toggle ("Compact view" / "Expand") switches modes; focus moves to the
  counterpart toggle.
- Navigation: vertical list in expanded (≥ 640 px container), horizontal scrolling strip in compact
  and on narrow screens. `aria-current="true"` on the active item; Arrow keys move focus between
  items; Enter/Space select. Optional `count` per item; `secondary` sections sit at the end.
- State resets to `expanded` + first section whenever `open` becomes false. Section changes reset
  the content scroll to the top.
- Dialog contract carried over from `DetailDrawer`: `role="dialog"`, `aria-modal`, `aria-label`,
  focus moves to Close on open, Tab trap (skips CSS-hidden and `tabIndex < 0`), Escape closes the
  whole detail, focus returns to the opener, backdrop click closes. `HelpPopover` keeps working
  because it renders in place (inside the dialog subtree) and stops its own Escape.

### `DetailViewSection`
- Props: `id`, `title`, `icon`, `navLabel?` (shorter nav text), `description?`, `count?`,
  `aside?: ReactNode` (e.g. a warning badge next to the title), `secondary?`, `flush?`, `children`.
- Renders the section header (title, description, aside) and a padded content column; `flush`
  removes the padding for content that brings its own (inventory, edge-to-edge tables).

### `DetailFieldGroup`
- Props: `title?`, `description?`, `variant?: 'default' | 'technical'`, `children` (`DetailField`s).
- Default: responsive grid of fields — 1 column, 2 from 520 px, 3 from 860 px of content width
  (container queries). Consecutive default groups are separated by spacing + a hairline. No cards.
- Technical: recessed list on `surface-muted`, one row per field: label | mono value | actions;
  stacks below 560 px.

### `DetailField`
- Props: `label`, `value?: ReactNode`, `secondary?`, `mono?`, `emphasis?`, `wide?`, `copyValue?`.
- Label above value. Empty value (`null`, `undefined`, `''`) renders a muted "Not set".
- `copyValue` adds a copy button (feedback "Copied"). `wide` spans the full grid row.
- Links, badges and tags are passed as `value` ReactNodes (existing `Badge`, `AirflowDagLink`, …).
- Inside a technical group the field renders as a row with a mono value.

### `DetailStatusBlock`
- Props: `title`, `status: ReactNode`, `tone: 'success' | 'warning' | 'error' | 'info' | 'neutral'`,
  `timestamp?`, `reference?: { label, value: ReactNode, copyValue? }`, `action?`, `children`
  (facts as `DetailField`s, laid out 2–3 per row).
- The only bordered surface in the system. Order: status → timestamp → facts → reference → action.

### `DetailCode`
- Props: `label`, `meta?`, `value: string`, `emptyLabel?`, `language?: 'json' | 'text'`.
- Caption with label/meta and Copy; scrolling mono body (max height); JSON keys/literals tinted
  with existing tokens; empty state text.
- Not used by the pilot; built and unit-tested now because Access Log needs it next.

### Copy action (internal)
- `DetailCopyButton` used by `DetailField`, `DetailStatusBlock`, `DetailCode`; uses
  `common.copy` / `common.copied`.

### Theme
- `src/index.css` `@theme`: `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas,
  "Liberation Mono", monospace;` — makes the existing `font-mono` class work app-wide.

## Recovery Group pilot mapping

| Today | DetailView |
|---|---|
| Header: name, "Recovery group", Active/Draft, provider unavailable, orchestration meta, help | Same data: `entityLabel`, `title`, `statuses`, `meta`, `headerActions` |
| Overview `DetailRow`s (8) | Overview → **General** (Description wide, Policy set emphasis) and **Workload** (Source category, Workload type, Resource type as plain "VM"/"Volume", Resources). Status row removed (in header). Provider ID moves to Technical |
| Orchestration rows + "Orchestration: Yes" + button | One `DetailStatusBlock` per orchestration state A–E (table below); no "Orchestration: Yes" |
| Inventory section (flush) | Inventory section, `flush`, `count={resourceCount}`, unchanged `RecoveryGroupInventory` |
| — | **Technical**: Group ID, resource provider ID, volume provider ID, orchestration provider ID, Airflow run ID — mono + copy |
| Footer Delete / Edit (+ unresolved hint) | Unchanged semantics |

Orchestration state → status block (`getRecoveryGroupOrchestrationState`, unchanged):

| State | tone / status | facts / reference / action |
|---|---|---|
| notOrchestrated | neutral / "Not configured" | — |
| incomplete | warning / "Orchestration incomplete" | — |
| providersPending, runPending | neutral / "Loading…" | orchestrator if known |
| providersFailed, runFailed | warning / "Latest run unavailable" (new key) | orchestrator if known |
| orchestratorUnavailable | warning / "Orchestrator unavailable" | — |
| noRunId | neutral / "No run ID yet" | orchestrator |
| noRuns | neutral / "No runs yet" | orchestrator, run ID reference, action |
| lastRun | `runStatusBadgeColor` / run status, timestamp | duration, orchestrator, run ID reference, action |

The action ("View recovery runs") keeps today's condition and route.

## Fit with the other consumers (later phases)

| Consumer | Fits with |
|---|---|
| Policy sets, Snapshot / App / Clean-room policies, Credentials, Providers catalogue, Platform providers | Overview / Connection field groups, Technical group, footer Delete/Edit; credential state as `DetailStatusBlock`; password as `DetailField value="Hidden"` |
| Recovery applications | Same as Recovery Group (overview, orchestration status block, inventory flush, technical) |
| VMware VM, IBM Power, FlashSystem volume | Field groups per section, tags via `value`, Disks/Storage tables in flush sections (`DataTable` reuse decided in phase 2), `BackingStorageInfo` restyled to field groups |
| Access log | Request status block (HTTP status), Target field group (path/query `wide mono`), bodies via `DetailCode`, Client in Technical |
| Users, Clients, Realm roles | Field groups (profile/account), roles as tag `value`, timestamps, "Not set" empties |
| Recovery actions history | Field groups |
| Recovery run history (custom list + pagination), Metro Mirror help (prose) | Single-section `DetailView` with custom children — decision in their phase |

## Commands

- Focused tests: `npm exec vitest run <files>`
- Lint changed files: `npm exec eslint <files>`
- Type check: `npm exec tsc -- -b --noEmit` only if the focused scope requires it (shared API)

## Code style

Match `DetailDrawer.tsx`: function components, props interfaces above, explanatory comment above
each export, `cn()` for classes, tokens only (`text-text-muted`, `bg-surface-muted`, …), Tailwind v4
container queries (`@container/…`, `@min-[520px]/…:`), translations via `useTranslation`.

## Testing strategy

- Unit tests per primitive (`detail-view/*.test.tsx`): dialog contract, navigation, single active
  section, lazy mount, modes, reset on close, field empty/copy/wide/technical, status block, code.
- `RecoveryGroupsTable.test.tsx`: rewrite the "Model C drawer" block for the new navigation
  (`aria-current` instead of `aria-expanded`), keep every behavioural assertion (states A–E,
  footer, help Escape, links, navigate, unresolved edit).
- Translation parity test for `detailView.*` keys.
- Browser: real app via Edge CDP (own tab) — light/dark, expanded/compact, every RG section,
  narrow viewport, keyboard, help, Delete/Edit dialogs (cancelled).

## Boundaries

- Always: touch only listed files; keep `DetailDrawer` working for other consumers; atomic commits
  with explicit paths; run focused tests before each commit.
- Ask first: deleting/renaming existing shared exports, changing `getRecoveryGroupOrchestrationState`,
  any API/backend change, migrating another consumer.
- Never: stage unrelated dirty files (OpenAPI/Zod/Metro Mirror, timezone tasks), skip hooks.
