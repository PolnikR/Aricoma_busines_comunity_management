# Todo: Discovery settings pagination + contained table scrolling

Patrí k `tasks/discovery-settings-table-scroll-plan.md`. Stav: pripravené na implementáciu po schválení.

## Phase 1 — Resources scrollbar

- [ ] Restore `custom-scrollbar` + vertical `overflow-y-auto` do table data regionu `ResourceInventoryPanel`.
- [ ] Zachovať `ResourceViewportFrame` page-level containment.
- [ ] Upraviť regression test z commitu `a3510ab`.

### Checkpoint A
- [ ] Toolbar mimo scroll regionu.
- [ ] Pagination mimo scroll regionu.
- [ ] Data region scrollovateľný.
- [ ] Page-level vertical scroll sa nevrátil.

## Phase 2 — Discovery Configuration

- [ ] Skryť `DiscoveryScheduleCard` z Configuration tabu.
- [ ] Nemazať schedule component/model/mock source files.
- [ ] Odstrániť iba page-local unused schedule wiring.
- [ ] Cache configuration full width.
- [ ] Aktualizovať `DiscoverySettingsPage.test.tsx`.

## Phase 3 — Discovery History

- [ ] Odstrániť horný Limit selector.
- [ ] Backend history query používa `limit:100`.
- [ ] Client state `page` + `pageSize`, default 25.
- [ ] Reuse `DataTablePagination` s 10/25/50.
- [ ] Client-side slice rows.
- [ ] Provider/page-size change resetne page na 1.
- [ ] Clamp page po zmene total.
- [ ] Filters/refresh fixné hore.
- [ ] Table data region vertical-scrollable.
- [ ] Pagination fixná dole.
- [ ] History tab bez table-driven page scrollu.
- [ ] Aktualizovať focused tests.

### Checkpoint B
- [ ] Page click nevolá backend.
- [ ] Rows change nevolá backend.
- [ ] Provider filter volá backend s `limit=100`.
- [ ] Table zobrazuje správny client slice.

## Phase 4 — Automated verification

- [ ] Focused Vitest pre ResourceInventoryPanel + Discovery History/Page/SearchParams.
- [ ] Focused ESLint.
- [ ] `npm run typecheck`.
- [ ] `git diff --check`.
- [ ] Review task-owned diff.

## Phase 5 — Mandatory browser verification

- [ ] Spustiť `npm run dev` ako persistent process.
- [ ] Browser viewport 1542×765.
- [ ] `/discovery-inventory/resources`: inner vertical scrollbar, page bez vertical scrollu, toolbar/pagination fixné, sticky header, screenshot.
- [ ] `/providers-connectors/discovery-settings`: schedule skrytý, cache full width.
- [ ] `/providers-connectors/discovery-settings?tab=history`: no Limit, pagination dole, inner vertical scroll, page 1→2 a Rows change bez backend requestu, Provider change s requestom `limit=100`, screenshot.
- [ ] Critical scroll check zopakovať na 1366×768.
- [ ] Browser console check.
- [ ] Browser network check.

## Definition of Done

- [ ] Resources a Discovery History scrollujú iba data region tabuľky.
- [ ] Toolbar + pagination zostávajú viditeľné.
- [ ] Discovery History používa client-side shared pagination.
- [ ] Discovery Schedule iba skrytý, nie zmazaný.
- [ ] Cache configuration full width.
- [ ] Focused automatické kontroly prešli.
- [ ] Browser test na oboch viewportoch prešiel.
- [ ] Console/network bez novej regresie.
- [ ] Commit obsahuje iba task-owned files.
