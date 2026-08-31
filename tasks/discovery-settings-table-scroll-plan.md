# Implementation Plan: Discovery settings pagination + contained table scrolling

## Overview

Upraviť Discovery settings a Resources tak, aby sa vertikálne scrollovala iba dátová časť tabuľky, nie celá page. Toolbar a pagination musia zostať stále viditeľné. V Discovery settings zároveň dočasne skryť `Discovery schedule`, ponechať iba full-width `Cache configuration` a v `History` nahradiť horný serverový `Limit` klientskou pagination rovnakého typu ako v Resources.

Produkčný kód sa v planning fáze nemení. Stav: pripravené na implementáciu po schválení.

## Overený aktuálny stav

- Configuration tab renderuje `DiscoveryScheduleCard` + `Cache configuration` v 2-stĺpcovom gride.
- `DiscoveryHistoryCard` dnes posiela backendu `limit` 25/50/100 a renderuje všetky vrátené `runs` bez pagination.
- `Resources` používa `ResourceInventoryPanel`, ale commit `a3510ab fix(resources): contain viewport without page scrollbar` zmenil dátový region z `custom-scrollbar ... overflow-y-auto` na `min-h-0 overflow-hidden`, čím odstránil vnútorný vertical scrollbar.
- `ResourceViewportFrame` zavedený tým istým commitom zostáva, pretože správne bráni page-level scrollu.

## Architecture Decisions

1. `ResourceViewportFrame` a page-level `overflow-hidden` zostávajú.
2. Resources dostane späť vertical scroll iba do stredného table data regionu.
3. History layout bude: **filters/refresh → scrollable table → fixed pagination**.
4. Horný History `Limit` selector sa odstráni; backend request zatiaľ používa fixný `limit: 100`.
5. History pagination bude client-side nad načítanými `runs`, cez shared `DataTablePagination`, default 25 a options 10/25/50.
6. Provider alebo page-size change resetne page na 1; page sa clampne po zmenšení výsledkov.
7. `Discovery schedule` sa iba skryje. Komponent/model/mock implementácia sa nemaže.
8. `Cache configuration` bude jediný full-width obsah Configuration tabu.
9. Browser verification je povinná súčasť Definition of Done.

## Dependency Graph

```text
Task 1 Resources internal scroll
        ↓
Task 2 Configuration simplification
        ↓
Task 3 History client pagination + internal scroll
        ↓
Task 4 Focused automated verification
        ↓
Task 5 Browser verification
```

## Task 1: Restore Resources internal vertical scrollbar

**Description:** Vrátiť scrollbar iba do dátovej oblasti `ResourceInventoryPanel`, bez návratu page scrollbar-u.

**Acceptance criteria:**
- [ ] `ResourceViewportFrame` zostáva desktop page-level `overflow-hidden`.
- [ ] Middle data region používa `custom-scrollbar min-h-0 overflow-y-auto` alebo ekvivalent.
- [ ] Toolbar a `DataTablePagination` sú mimo vertical scroll regionu.

**Verification:**
- [ ] Aktualizovať regression test v `ResourceInventoryPanel.test.tsx`, ktorý dnes očakáva absenciu `.overflow-y-auto`.
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`

**Dependencies:** None.

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`

**Estimated scope:** Small — 2 files.

## Task 2: Hide Discovery schedule and expand Cache configuration

**Description:** Skryť schedule card z Configuration tabu bez mazania schedule feature source files. Cache configuration nech využíva celú dostupnú šírku.

**Acceptance criteria:**
- [ ] `Discovery schedule` sa v UI nerenderuje.
- [ ] `Cache configuration` je jediný/full-width Configuration obsah.
- [ ] Schedule komponent/model/mock source files zostanú zachované; odstráni sa iba page-local wiring, ktoré po skrytí ostane nepoužité.

**Verification:**
- [ ] Aktualizovať `DiscoverySettingsPage.test.tsx`.
- [ ] Zachovať cache load/save/cancel testy.
- [ ] `npm exec vitest run src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`

**Dependencies:** None.

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`

**Estimated scope:** Small — 2 files.

## Checkpoint A

- [ ] Resources page stále nemá page-level vertical scrollbar.
- [ ] Resources table data region má vlastný vertical scrollbar.
- [ ] Cache configuration je full width.
- [ ] Schedule source files neboli zmazané.

## Task 3: Add client-side pagination and contained scroll to Discovery History

**Description:** Odstrániť horný `Limit`, načítať backendom fixne max 100 history records a deliť ich klientsky cez `DataTablePagination`. Filters a pagination ostávajú fixné; scrolluje iba table data region.

**Acceptance criteria:**
- [ ] Horný `Limit` selector sa nezobrazuje.
- [ ] `useDiscoveryCacheHistory` dostáva `limit: 100` + voliteľný provider.
- [ ] Shared `DataTablePagination` používa default 25 a options `[10, 25, 50]`.
- [ ] `DataTable` dostáva iba client-side slice; `total = runs.length`.
- [ ] Provider/page-size change resetuje page na 1; page je clampnutá po zmene total.
- [ ] Table data region má `custom-scrollbar` + `overflow-y-auto`; filters/pagination sú mimo neho.
- [ ] History tab kvôli tabuľke nescrolluje celú page na desktop viewporte.

**Verification:**
- [ ] `DiscoveryHistoryCard.test.tsx`: request `limit:100`, no Limit selector, prvých 25 rows, page 2 slice, page-size reset, provider reset, pagination mimo scroll regionu.
- [ ] Ak sa zmení search-param contract, upraviť iba relevantné `useDiscoverySettingsSearchParams` testy.
- [ ] Focused Vitest pre History/Page/SearchParams.

**Dependencies:** Task 2.

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.test.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoverySettingsSearchParams.ts` iba ak bude nutné upraviť URL state
- relevantný search-param test iba ak sa contract zmení

**Estimated scope:** Medium — 3–5 files.

## Task 4: Focused automated verification

**Acceptance criteria:**
- [ ] Dotknuté Vitest súbory prejdú.
- [ ] Focused ESLint nad zmenenými TS/TSX súbormi prejde bez warningov.
- [ ] `npm run typecheck` prejde.
- [ ] `git diff --check` prejde.

**Verification:**

```text
npm exec vitest run \
  src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx \
  src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.test.tsx \
  src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx \
  src/features/providers-connectors/discovery-settings/hooks/useDiscoverySettingsSearchParams.test.tsx

npm exec -- eslint <changed-ts-tsx-files> --max-warnings=0
npm run typecheck
git diff --check
```

**Dependencies:** Tasks 1–3.

**Files likely touched:** None beyond direct regression fixes.

**Estimated scope:** Small.

## Task 5: Mandatory browser verification

**Description:** Po implementácii spustiť lokálnu app a výsledok reálne otestovať v browseri. Nestačí screenshot; treba overiť scroll, console aj network správanie.

### Setup

```text
npm run dev
```

Browser viewporty:
- primárny `1542 × 765`,
- sekundárny `1366 × 768`.

### Scenario A — Resources

Route: `/discovery-inventory/resources`

- [ ] page nemá inventory-driven vertical scrollbar,
- [ ] toolbar zostáva viditeľný,
- [ ] pagination zostáva viditeľná,
- [ ] vertical scrollbar je iba vo vnútri table data regionu,
- [ ] scroll hýbe rows, nie toolbar/pagination,
- [ ] sticky header funguje,
- [ ] horizontálny DataTable scroll ostáva funkčný,
- [ ] console bez nových React chýb/warningov.

### Scenario B — Discovery Settings / Configuration

Route: `/providers-connectors/discovery-settings`

- [ ] Discovery schedule nie je viditeľný,
- [ ] Cache configuration je full width,
- [ ] cache inputs/footer sú stále dostupné.

### Scenario C — Discovery Settings / History

Route: `/providers-connectors/discovery-settings?tab=history`

- [ ] horný Limit selector nie je prítomný,
- [ ] pagination je pod tabuľkou a zodpovedá Resources,
- [ ] default Rows = 25,
- [ ] page click mení iba client-side slice,
- [ ] Rows 25 → 50 mení client-side slice a resetne page,
- [ ] provider change resetne page a refetchne backend,
- [ ] scrollbar je iba v table data regione,
- [ ] filters + pagination zostávajú fixné,
- [ ] page kvôli tabuľke nescrolluje,
- [ ] console bez novej chyby.

### Network assertions

- [ ] Page 1 → 2 nevytvorí nový `/discovery/cache/history` request.
- [ ] Rows 25 → 50 nevytvorí nový history request.
- [ ] Provider change vytvorí nový history request s providerom a `limit=100`.

### Browser evidence

- [ ] Screenshot Resources po scrollnutí vnútorného table regionu.
- [ ] Screenshot Discovery History s viditeľnou pagination + vnútorným scrollbarom.
- [ ] Console check.
- [ ] Network check.

**Dependencies:** Task 4 musí byť zelený.

**Files likely touched:** None; browser test je verification krok.

**Estimated scope:** Small.

## Final Definition of Done

- [ ] Discovery Schedule je skrytý, nie zmazaný.
- [ ] Cache configuration je full width.
- [ ] Resources aj Discovery History scrollujú iba dátovú časť tabuľky.
- [ ] Toolbar/pagination ostávajú viditeľné počas vertical scrollu.
- [ ] Resources/History page nemajú table-driven vertical page scrollbar na desktop viewporte.
- [ ] History používa client-side `DataTablePagination`, backend fixed `limit=100`.
- [ ] Pagination/page-size v History nevytvára backend requesty; provider filter áno.
- [ ] Focused testy, ESLint, typecheck, diff check prešli.
- [ ] Browser test prešiel na 1542×765 aj 1366×768.
- [ ] Browser console/network boli skontrolované.
- [ ] Zmena je commitnutá atomicky iba s task-owned files.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Obnovenie Resources scrollu vráti page scroll | High | Zachovať `ResourceViewportFrame`; browser overiť page vs inner scroll samostatne |
| Sticky header pri nested overflow prestane fungovať | Medium | Browser scroll test + screenshot |
| `SettingsSectionCard` body nevie fillnúť výšku History | Medium | Ak treba, pridať minimálny explicitný content-layout prop; nehackovať globálnymi child-selectormi |
| Client pagination pokrýva iba prvých 100 backend records | Medium | Explicitne dočasný limit; server-side pagination je out of scope |
| Provider/filter change nechá neplatnú page | Medium | Reset page 1 + clamp + unit test |
| Skrytie schedule nechá dead page-local wiring | Low | Odstrániť iba page-local unused state/importy, nie feature source files |

## Out of Scope

- Server-side History pagination.
- Zmena OpenAPI history kontraktu.
- Limit nad 100.
- Mazanie schedule feature source files.
- Redizajn Resources toolbar/pagination.
- Nesúvisiaci DataTable refaktor.

## Open Questions

Žiadne blokujúce otázky.
