# Implementačný plán: Zjednotenie page layoutov podľa Resources reference

**Revízia:** 2026-09-02 — Resources/Resources ISE sú canonical visual/layout reference.

## Prehľad

Cieľom je zjednotiť vizuálnu geometriu frontend pages bez zmeny business logiky, API kontraktov, query lifecycle, filtrov, dátových stĺpcov alebo feature-specific správania.

Nový smer je zámerne **reference-driven**: nebudeme najprv navrhovať nový abstraktný layout systém a až potom doň prerábať existujúce pages. Aktuálne `Resources` má najzrelší kombinovaný pattern pre full-height containment, header/actions, tabs, filter modal, stabilný table viewport a pagination. Preto sa najprv `Resources` + `Resources ISE` stabilizujú a browserovo schvália ako **canonical visual/layout reference**. Až potom sa ich overený geometry contract extrahuje do minimálnych shared primitives a aplikuje na ostatné pages.

Resources sa nesmie kopírovať slepo. Pred vyhlásením za canonical reference sa musia odstrániť dve dnes známe nekonzistencie:

1. `no-provider` vetva nesmie obchádzať `InventoryShell`/primary surface boundary,
2. `ResourceInventoryPanel` nesmie používať odlišný primary/table surface radius (`rounded-2xl`) oproti canonical `Card` radiusu (`rounded-[20px]`).

Implementácia je rozdelená na malé S/M tasky s explicitným browser checkpointom každé 2–3 implementačné tasky. Žiadny task nemá byť XL a žiadny shared abstraction sa nevytvorí skôr, než je pattern dokázaný na Resources reference.

Tento dokument je plán. Pri jeho úprave sa produkčný source kód nemení.

---

# 1. Canonical Resources reference

## 1.1 Existujúce komponenty, ktoré tvoria baseline

Canonical contract je odvodený z existujúcich komponentov, nie z nového dizajnu:

- `AppShell` — outer content X/Y a route-level contained/default scroll,
- `ResourceViewportFrame` — full-height contained chain pre Resources,
- `TableToolbar` + `PageHeader` — page title/description/actions/refresh,
- `InventoryShell` + `Card` — primary surface, optional metrics/notice, title/description/tabs,
- `Tabs` — surface tabs,
- `DataTableToolbar` — search, density, filter button a filter modal,
- `ResourceInventoryPanel` — `toolbar / minmax(0,1fr) data viewport / pagination`,
- `DataTablePagination` — fixed footer,
- `DataTable` — horizontal table scroll.

## 1.2 Canonical geometry contract

Po stabilizácii Resources musí reference vyzerať logicky takto:

```text
AppShell main content
│
├─ TableToolbar / PageHeader
│  ├─ eyebrow + title + description
│  └─ right actions
│     ├─ updating indicator (iba pri fetchi)
│     ├─ feature action: Add / Create / Back / iná akcia
│     └─ Refresh
│
└─ InventoryShell
   ├─ optional metrics
   ├─ optional notice
   └─ canonical primary Card
      ├─ optional surface header
      │  ├─ title + description
      │  └─ tabs
      └─ content inset
         └─ DataTableSurface (extracted from ResourceInventoryPanel)
            ├─ DataTableToolbar
            │  ├─ Search
            │  ├─ optional quick segments
            │  ├─ optional density
            │  └─ Filters -> shared Modal
            ├─ scrollable data viewport
            └─ fixed pagination/footer
```

### Outer X/Y

- `AppShell` ostáva vlastníkom outer main paddingu; feature pages nesmú pridávať druhý náhodný outer inset.
- `PageHeader`/`TableToolbar` ostáva na rovnakom left/right content boundary.
- Primary surface používa rovnaký left/right boundary ako Resources.
- Medzi `PageHeader` a ďalším funkčným slotom zostáva existujúci `PageHeader` spacing (`mb-5`).
- Page nesmie vytvoriť accidental hierarchy typu `outer p-3 -> InventoryShell -> inner p-3`, ak Resources reference používa iba inner content inset.

### Header actions

- Page-level actions sú v pravom `TableToolbar/PageHeader` action slote.
- Feature action (`Add`, `Create`, `Back`, ...) je pred `Refresh`.
- `Refresh` používa spoločný `TableToolbar` placement a loading/update indikáciu.
- Default pre bežné Add/Create/Refresh controls je existujúci small button pattern; feature-specific destructive/primary semantics sa nesmú prepisovať iba kvôli unifikácii.
- Žiadne duplicity refresh/add tlačidiel vo vnútri primary surface, ak ide o page-level action.

### Tabs

- Table/inventory tabs patria do primary surface headeru, nie do náhodného wrappera nad surface.
- Reference štýl je Resources pattern: compact tabs, inset selected indicator a horizontal overflow/scroll controls, keď je to potrebné.
- Tabs sa pridávajú iba pages, ktoré ich významovo majú; nevytvára sa prázdny tab slot.

### Filter modal

- Table filtre používajú `DataTableToolbar` filter trigger a shared `Modal` pattern, ak ich semantics zodpovedajú table filtrom.
- Search ostáva vľavo, density/filter controls vpravo.
- Modal footer používa existujúci `Cancel / Clear all / Apply` contract.
- Každá feature dodáva iba svoje filter fields a existujúcu filter logiku; filter semantics sa nemenia.
- Workspace/configuration forms sa nesmú nasilu meniť na table filter modal.

### Table viewport a pagination

Canonical table panel používa:

```text
grid-rows-[auto_minmax(0,1fr)_auto]
```

- toolbar je `shrink-0`/fixed top slot,
- iba data region je vertical scroll owner,
- pagination/footer je fixed bottom slot,
- `DataTable` si ponechá horizontal scroll,
- 0/1/5/10/25/many rows nesmú meniť outer surface height ani pagination Y,
- rows sa nestretchujú do blank space.

### Request states

`loading`, `fatal error`, `empty`, cached-data refresh error a mutation alert nesmú nahradiť outer page/surface contract.

Canonical pravidlo:

```text
same page header
same primary surface boundary
same toolbar/header slots, ak sú funkčne dostupné
state sa mení vo vnútri content boundary
```

`no-provider` je explicitne súčasť tohto pravidla. Resources/Resources ISE nesmú mať early-return layout, ktorý vynechá canonical primary surface.

### Radius

Canonical bordered surface radius pre page/table visual contract je odvodený z shared `Card`:

```text
rounded-[20px]
```

Po stabilizácii baseline nesmie `ResourceInventoryPanel`/extracted `DataTableSurface` ponechať `rounded-2xl`, ak predstavuje rovnaký bordered table surface contract. Nested semantic cards mimo primary/table layout contractu môžu mať vlastný radius.

### Scroll ownership

Na desktop contained route je jeden hlavný vertical scroll owner pre danú obsahovú vetvu:

- inventory/table: data viewport,
- workspace/settings: workspace content body,
- builder: step-specific inner panel,
- topology: canvas/panel podľa feature,
- detail/document: AppShell/main natural scroll môže zostať.

Nesmie existovať page scroll + table scroll pre ten istý obsah.

### Optional slots

Metrics/notice/tabs sú funkčné optional slots. Ak semanticky neexistujú, nevytvára sa neviditeľný spacer iba kvôli identickému absolútnemu Y medzi odlišnými slot topológiami. Pri rovnakej slot topológii však loading/error/empty/data musia zachovať rovnakú geometriu.

---

# 2. Scope a route traceability

## 2.1 V rozsahu

- stabilizácia Resources/Resources ISE ako canonical reference,
- page header X/Y a actions placement,
- primary surface X/Y/W/H a radius contract,
- tabs placement/style pre table/inventory pages,
- table search/density/filter modal pattern,
- table height/scroll/pagination contract,
- loading/error/empty/no-provider state containment,
- contained route ownership,
- table/list pages,
- workspace/settings pages,
- Identity Access outer layout + table-like sections,
- builders/detail/topology outer geometry,
- `ModuleWorkQueuePage`, ktorá v pôvodnom pláne nemala vlastný migračný task,
- archetype-aware route loading fallback,
- browser geometry measurements a final 26-route signoff.

## 2.2 Mimo rozsahu

- API/OpenAPI/generated-client zmeny,
- backend zmeny,
- query keys, cache policy, polling alebo request semantics,
- table columns/data semantics/server pagination redesign,
- filter/search semantics,
- provider selection a Resources provider-filter semantics,
- Recovery builder DnD/business flow,
- redizajn typografie/farieb/badges/form controls,
- zavedenie nového visual-regression frameworku,
- `calc(100vh - ...)`, JS viewport matematika, CSS zoom alebo page-specific max-height hacky.

## 2.3 Route -> archetype -> task matrix

Táto tabuľka je autoritatívna traceability mapa. Final DoD sa nesmie označiť za hotové, kým každá z 26 routes nemá dokončený svoj task + final browser signoff.

| # | Route-level page | Archetype | Target scroll owner | Route mode | Primary task |
|---|---|---|---|---|---|
| 1 | `InfrastructurePage` | Topology workspace | topology/canvas panel | contained | 37–38 |
| 2 | `ResourcesPage` | Canonical inventory | resource data viewport | contained | 1–7 |
| 3 | `ResourcesIsePage` | Canonical inventory | resource data viewport | contained | 1–7 |
| 4 | `ModuleWorkQueuePage` | Document/workspace | AppShell natural scroll | default | 35 |
| 5 | `ConfigurationPage` | Workspace/settings | configuration body | contained | 19 |
| 6 | `IdentityAccessPage` | Workspace | identity content panel | contained | 24–30 |
| 7 | `PlatformProvidersPage` | Table/list | table data viewport | contained | 9 |
| 8 | `CredentialsPage` | Table/list | table data viewport | contained | 10 |
| 9 | `DiscoverySettingsPage` | Workspace/settings | active tab body | contained | 20–21 |
| 10 | `ProviderDetailPage` | Detail/document | AppShell natural scroll | default | 36 |
| 11 | `ProvidersPage` | Table/list | table data viewport | contained | 8 |
| 12 | `RecoveryActionsExecutePage` | Workspace | action panel | contained | 22 |
| 13 | `RecoveryActionsHistoryPage` | Workspace + table | history data viewport | contained | 22–23 |
| 14 | `RecoveryActionsSchedulePage` | Workspace | action panel | contained | 22 |
| 15 | `RecoveryActionsValidatePage` | Workspace | action panel | contained | 22 |
| 16 | `PolicySetsPage` | Table/list | table data viewport | contained | 12 |
| 17 | `RecoveryApplicationBuilderPage` | Builder | step-specific panel | contained | 32–34 |
| 18 | `RecoveryApplicationEditorPage` | Builder | step-specific panel | contained | 32–34 |
| 19 | `RecoveryApplicationsListPage` | Table/list | table data viewport | contained | 11 |
| 20 | `RecoveryGroupBuilderPage` | Builder | step-specific panel | contained | 32–34 |
| 21 | `RecoveryGroupEditorPage` | Builder | step-specific panel | contained | 32–34 |
| 22 | `RecoveryGroupsListPage` | Table/list | table data viewport | contained | 13 |
| 23 | `RecoveryAppPoliciesPage` | Table + surface tabs | table data viewport | contained | 14–15 |
| 24 | `CleanRoomPoliciesPage` | Table + surface tabs | table data viewport | contained | 14–15 |
| 25 | `SnapshotPoliciesPage` | Table + surface tabs | table data viewport | contained | 14 |
| 26 | `RecoveryRunsPage` | Table + tabs/context | table data viewport | contained | 16 |

---

# 3. Architektonické rozhodnutia

## A1. Resources je reference, nie exception

Resources sa najprv opraví a browserovo schváli. Až po Checkpoint A sa jeho geometry contract môže použiť ako baseline pre ostatné pages.

## A2. Existing shared components first

Pred vytvorením nového komponentu sa musí preveriť, či požadovaný contract už poskytuje `TableToolbar`, `InventoryShell`, `Card`, `Tabs`, `DataTableToolbar`, `DataTablePagination` alebo `AppShell`.

## A3. Shared extraction iba z proven Resources patternu

Povolené nové primitives sú len extrakcie existujúceho Resources správania:

- generic contained frame z `ResourceViewportFrame`, ak ho potrebuje druhá feature,
- generic table surface z `ResourceInventoryPanel`, po canonical approval.

Nesmie sa vytvoriť nový všeobecný `PageFrame/PageSurface/TableSurface` API len podľa teoretického návrhu.

## A4. No outer double inset

Resources reference rozhoduje, kde je outer page inset a kde inner surface/table inset. Migrácia nesmie kopírovať `p-3` vrstvy mechanicky.

## A5. Same archetype, same visual placement

Pri rovnakom viewporte a rovnakej slot topológii sa porovnáva s Resources reference:

- header left/right,
- actions right edge,
- primary surface left/right,
- primary surface top pri rovnakej slot topológii,
- table toolbar top,
- pagination top/bottom anchor.

## A6. Feature semantics zostávajú feature-specific

Resources metrics, provider tabs, VM filters, provider summary a detail drawer sa nekopírujú na pages, ktoré ich nemajú. Kopíruje sa ich **layout slot contract**, nie business obsah.

## A7. Contained mode až po pripravenom inner chain

`contentScroll: 'contained'` sa pridá až keď page vlastní svoj vnútorný scroll. Žiadny global `overflow-hidden` switch.

## A8. Mobile natural scroll

Desktop môže byť contained; mobilný layout musí zostať prirodzene scrollovateľný a ovládateľný.

---

# 4. Dependency graph

```text
Phase 0: Stabilize Resources + Resources ISE
        |
        v
Canonical Resources browser approval
        |
        v
Extract only proven shared geometry
        |
        +----------------------------+
        |                            |
        v                            v
Phase 1: table/list pages       Phase 2: workspaces/settings
        |                            |
        +-------------+--------------+
                      v
          Phase 3: builders/detail/topology/document
                      |
                      v
          Phase 4: fallbacks/cleanup/final matrix
```

---

# Phase 0 — Stabilize and lock Resources reference

## Task 1: Add Resources reference contract tests and measurement targets

**Description:** Zachytiť aktuálny intended Resources contract bez pixelových tvrdení v JSDOM. Testy majú chrániť DOM ownership a sloty, browser measurement protocol bude merať reálne X/Y/W/H.

**Acceptance criteria:**
- [ ] Tests pokrývajú `ResourceViewportFrame`, `TableToolbar`, `InventoryShell`, `ResourceInventoryPanel` a `DataTableToolbar` ownership.
- [ ] Explicitne sa testuje top/data/footer separation a filter modal trigger/footer.
- [ ] Measurement checklist definuje header, primary surface, table viewport a pagination boundaries.

**Verification:** focused Resources component tests + `git diff --check`.

**Dependencies:** None.

**Files likely touched:** existing Resources/shared test files only, max 5.

**Estimated scope:** M.

## Task 2: Normalize no-provider state in Resources and Resources ISE

**Description:** Odstrániť early-return geometry, ktorá pri žiadnom providerovi obchádza canonical `InventoryShell`/primary surface.

**Acceptance criteria:**
- [ ] `ResourcesPage` no-provider state ostáva v rovnakom primary surface boundary ako loaded route.
- [ ] `ResourcesIsePage` používa rovnaký state boundary.
- [ ] `TableToolbar` ostáva dostupný; provider/query semantics sa nemenia.

**Verification:** focused `ResourcesPage` + `ResourcesIsePage` tests pre no-provider/loading/error.

**Dependencies:** Task 1.

**Files likely touched:** 4 page source/test files.

**Estimated scope:** M.

## Task 3: Normalize Resources surface radius and request-state geometry

**Description:** Odstrániť mixed primary/table radius a potvrdiť, že loading/error/empty/data nemenia canonical surface contract.

**Acceptance criteria:**
- [ ] Canonical bordered table surface používa `rounded-[20px]`; `rounded-2xl` sa z `ResourceInventoryPanel` contractu odstráni.
- [ ] Toolbar/data/pagination ownership ostáva zachovaný.
- [ ] Fatal error/empty/loading nemenia outer primary surface X/W a pri rovnakej slot topológii ani Y/H.

**Verification:** `ResourceInventoryPanel.test.tsx`, `ResourceInventoryStates.test.tsx`, provider page state tests.

**Dependencies:** Tasks 1–2.

**Files likely touched:** max 4 Resources source/test files.

**Estimated scope:** M.

### Checkpoint A0 — Resources source baseline

- [ ] Tasks 1–3 focused tests green.
- [ ] No-provider už neobchádza primary surface.
- [ ] Canonical Resources table/surface radius je jednotný.
- [ ] No API/query/filter behavior diff.

## Task 4: Browser-verify canonical Resources matrix

**Routes/data:** Resources + Resources ISE; VMware, FlashSystem, IBM Power; no-provider, loading, error, empty, 1 row, page-full rows, overflow rows.

**Viewporty:** `1542x765`, `1366x768`, `1920x1080`, `390x844` smoke.

**Acceptance criteria:**
- [ ] Zaznamenané header/action/surface/table/pagination X/Y/W/H measurements.
- [ ] 1 row nemení pagination Y; overflow scrolluje iba data viewport.
- [ ] Filter modal, tabs, detail drawer a horizontal table scroll fungujú.

**Verification:** real browser; console bez nových warnings/errors.

**Dependencies:** Checkpoint A0.

**Files likely touched:** ideally none; measurement evidence môže ísť do `tasks/page-layout-reference-measurements.md`.

**Estimated scope:** M verification.

## Task 5: Extract generic contained frame from `ResourceViewportFrame`

**Description:** Až po browser approval extrahovať presný proven full-height contained chain do generic shared primitive. `ResourceViewportFrame` zostane compatibility wrapper alebo alias.

**Acceptance criteria:**
- [ ] Generic primitive má rovnaké classes/behavior ako schválený Resources frame.
- [ ] Resources call sites nepotrebujú business rewrite.
- [ ] Žiadne title/actions/feature props sa do frame API nepridávajú.

**Verification:** frame tests + Resources page tests.

**Dependencies:** Task 4.

**Files likely touched:** generic source/test + ResourceViewportFrame source/test, max 4.

**Estimated scope:** M.

## Task 6: Extract shared `DataTableSurface` from `ResourceInventoryPanel`

**Description:** Extrahovať presný schválený `auto / minmax(0,1fr) / auto` Resources contract do shared data-table primitive. `ResourceInventoryPanel` zostane thin compatibility wrapper pre Resources error typing/wiring.

**Acceptance criteria:**
- [ ] Shared surface vlastní iba layout slots, nie fetch/filter/pagination state.
- [ ] Toolbar a footer sú mimo vertical data scrollbar.
- [ ] Radius/scroll contract je identický s canonical Resources baseline.

**Verification:** shared surface tests + `ResourceInventoryPanel.test.tsx`.

**Dependencies:** Task 4.

**Files likely touched:** shared source/test + ResourceInventoryPanel source/test, max 4.

**Estimated scope:** M.

### Checkpoint A1 — Proven shared extraction

- [ ] Tasks 5–6 green.
- [ ] Shared APIs sú minimálne a priamo odvodené z Resources.
- [ ] Žiadna feature import závislosť v shared primitives.

## Task 7: Re-verify Resources/Resources ISE after extraction

**Acceptance criteria:**
- [ ] Browser measurements ostávajú v baseline tolerancii bez geometry driftu.
- [ ] VMware/FlashSystem/IBM Power + target Resources ISE fungujú.
- [ ] Filter modal/tabs/pagination/detail drawer behavior bez regresie.

**Dependencies:** Tasks 5–6.

**Estimated scope:** S–M verification.

## Checkpoint A — Canonical Resources reference locked

- [ ] Resources baseline je schválený a autoritatívny pre ďalšie phases.
- [ ] No-provider + radius inconsistencies sú odstránené.
- [ ] Measurement evidence existuje pre desktop baseline.
- [ ] Až teraz sa smú migrovať ostatné pages.

---

# Phase 1 — Table/list pages follow Resources

Každá table/list migrácia musí porovnať svoju geometriu s canonical Resources pri rovnakom viewporte. Feature-specific obsah zostáva zachovaný.

## Task 8: Providers

**Acceptance criteria:**
- [ ] Header/actions/Refresh používajú Resources `TableToolbar` placement.
- [ ] Odstráni sa accidental outer `p-3 -> InventoryShell -> inner p-3`; primary surface má Resources X/W contract.
- [ ] Table používa shared `DataTableSurface`; filters/detail/create semantics sa nemenia.

**Verification:** `ProvidersPage.test.tsx`, `ProvidersCatalogueTable.test.tsx`, browser `1366x768`.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 9: Platform Providers

**Acceptance criteria:**
- [ ] `Add Platform Provider` je v Resources-compatible page action slote pred Refresh.
- [ ] Primary surface/table viewport/pagination kopíruje canonical Resources geometry.
- [ ] AIRFLOW/SMTP/BACKEND/KEYCLOAK type-specific Create/Edit/Detail contract sa nemení.

**Verification:** Platform Providers page/table/modal focused tests + browser geometry check.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 10: Credentials

**Acceptance criteria:**
- [ ] Header/action placement podľa Resources.
- [ ] Table panel používa canonical toolbar/data/footer contract.
- [ ] Create/edit/delete/error behavior zostáva rovnaký.

**Verification:** Credentials focused page/table tests + browser short-list check.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

### Checkpoint B1 — Providers administration tables

- [ ] Providers / Platform Providers / Credentials X/Y/W table contract zodpovedá Resources.
- [ ] Add/Create + Refresh placement je konzistentný.
- [ ] No nested vertical scroll.

## Task 11: Recovery Applications list

**Acceptance criteria:**
- [ ] Create + Refresh placement podľa Resources.
- [ ] Empty state zostáva v canonical surface/data viewport.
- [ ] Orchestrator/edit/delete/detail semantics sa nemenia.

**Verification:** page/table focused tests + 0/1/many browser check.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 12: Policy Sets

**Description:** Zachovať existujúci dobrý inner scroll behavior, zmeniť iba surrounding geometry na Resources baseline.

**Acceptance criteria:**
- [ ] Existujúci fixed pagination/scroll behavior sa neregresuje.
- [ ] Add + Refresh a primary surface placement zodpovedajú Resources.
- [ ] Žiadny nový outer/double inset.

**Verification:** Policy Sets page/table tests + browser `1366x768`.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 13: Recovery Groups list

**Acceptance criteria:**
- [ ] Create + Refresh placement podľa Resources.
- [ ] Empty/load/mutation error zostávajú v canonical surface boundary.
- [ ] 0/1/many rows nemenia pagination anchor.

**Verification:** page/table interaction tests + browser state matrix.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

### Checkpoint B2 — Recovery core tables

- [ ] Tasks 11–13 green.
- [ ] Empty/mutation states nemenia outer surface.
- [ ] Pagination anchor matches Resources behavior.

## Task 14: Recovery Policies shell + Snapshot Policies

**Acceptance criteria:**
- [ ] Policy tabs sú v primary surface headeri v Resources-style compact/inset placement.
- [ ] Add + Refresh sú v page header action slote.
- [ ] Snapshot table používa canonical table surface.

**Verification:** policy shell + Snapshot page/table tests + tab browser check.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 15: Application Recovery + Clean Room policy tables

**Acceptance criteria:**
- [ ] Obe variants používajú rovnaký table contract ako Snapshot.
- [ ] Filters/actions/modal semantics sa nemenia.
- [ ] Tab switch nemení outer surface X/W/H.

**Verification:** focused table/page tests + browser tab switching.

**Dependencies:** Task 14.

**Estimated scope:** M.

## Task 16: Recovery Runs

**Acceptance criteria:**
- [ ] Page header/action/refresh placement podľa Resources.
- [ ] Tabs/context slots sú v canonical surface hierarchy.
- [ ] History drawer ostáva overlay; table viewport/pagination stabilný.

**Verification:** Recovery Runs page/table/history drawer tests + browser check.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

### Checkpoint B3 — Tabbed table pages

- [ ] Recovery Policies + Runs use Resources-style surface tabs where applicable.
- [ ] Switching tabs nemení accidental outer geometry.
- [ ] Fixed data viewport + pagination preserved.

## Task 17: Enable contained route metadata for migrated table routes

**Description:** Route handles sa upravia až po tom, čo všetky table pages bezpečne vlastnia inner scroll.

**Acceptance criteria:**
- [ ] Providers, Platform Providers, Credentials, Recovery Applications, Policy Sets, Recovery Groups, Recovery Policies a Recovery Runs sú contained.
- [ ] Default document/detail routes ostávajú default.
- [ ] Route metadata je jediný mechanism; žiadne URL matching overflow hacks.

**Verification:** `router.test.tsx` + `AppShell.test.tsx`.

**Dependencies:** Tasks 8–16.

**Estimated scope:** M.

## Task 18: Table-page canonical browser matrix

**Routes:** všetky Phase 1 table/list pages.

**Acceptance criteria:**
- [ ] Header/action/surface left/right boundaries sa porovnajú s Resources baseline.
- [ ] 0/1/many rows, loading/error/empty nemajú pagination/surface jump.
- [ ] Filter modal pattern je konzistentný tam, kde table filters existujú.

**Dependencies:** Task 17.

**Estimated scope:** M verification.

## Checkpoint B — Table archetype complete

- [ ] Všetky table/list routes používajú canonical Resources-derived geometry.
- [ ] No accidental double inset.
- [ ] No double vertical scroll.
- [ ] Table browser matrix green.

---

# Phase 2 — Settings and workspace pages

Workspace pages preberajú z Resources najmä outer header X/Y, page actions placement, Card visual contract a explicitný scroll ownership. Table-specific filter/pagination pattern sa používa iba v embedded tables.

## Task 19: Configuration

**Acceptance criteria:**
- [ ] PageHeader X/Y a primary Card left/right/radius zodpovedajú canonical baseline.
- [ ] RuntimeConfigurationPanel body/footer scroll behavior sa zachová.
- [ ] Route je contained iba s explicitným panel scroll ownerom.

**Verification:** Configuration page/panel tests + browser `1366x768`.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 20: Discovery Settings outer workspace

**Acceptance criteria:**
- [ ] Page header + primary surface placement podľa baseline.
- [ ] Configuration/History/Notifications tabs majú explicitný surface slot.
- [ ] Active tab owns one vertical scroll path.

**Verification:** Discovery Settings page/search-param tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 21: Discovery History embedded table

**Acceptance criteria:**
- [ ] Existing filters/refresh -> data scroll -> pagination sa mapuje na shared `DataTableSurface` bez semantic zmeny.
- [ ] Filter UX používa `DataTableToolbar` pattern tam, kde zodpovedá existujúcej logike.
- [ ] Client-side pagination semantics sa nemenia.

**Verification:** `DiscoveryHistoryCard.test.tsx` + browser history tab.

**Dependencies:** Task 20.

**Estimated scope:** S–M.

### Checkpoint C1 — Settings

- [ ] Configuration + Discovery Settings geometry stable.
- [ ] Embedded history table follows canonical table contract.
- [ ] No clipping at `1366x768`.

## Task 22: Recovery Actions shared shell

**Acceptance criteria:**
- [ ] Execute/History/Schedule/Validate zdieľajú jeden outer header + Card geometry contract.
- [ ] Refresh ostáva v canonical page action slot.
- [ ] Všetky štyri routes sú contained iba cez shared shell scroll ownership.

**Verification:** shell/navigation/router focused tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 23: Recovery Actions History table

**Acceptance criteria:**
- [ ] History table používa shared data surface bez accidental nested Card.
- [ ] Filter/selection/drawer semantics sa nemenia.
- [ ] Workspace shell ostáva jediným outer geometry ownerom.

**Verification:** History focused tests + browser.

**Dependencies:** Task 22.

**Estimated scope:** S–M.

## Task 24: Identity Access outer frame

**Acceptance criteria:**
- [ ] `IdentityAccessPage` header/actions X/Y a primary surface boundary sú aligned s baseline.
- [ ] Identity navigation je shrink-0; `IdentityContentPanel` explicitne vlastní fill/scroll chain.
- [ ] Route je contained; žiadny extra root gap/padding layer.

**Verification:** IdentityAccessPage + IdentityResourceLayout + navigation tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

### Checkpoint C2 — Workspace shells

- [ ] Recovery Actions + Identity outer geometry stable.
- [ ] Jeden vertical scroll owner per workspace branch.
- [ ] Header action placement matches canonical baseline.

## Task 25: Identity Users + Realm Roles

**Acceptance criteria:** table-like lists používajú shared data surface; detail behavior a actions unchanged; pagination/toolbar ownership explicit.

**Verification:** `UsersSection.test.tsx`, `RealmRolesSection.test.tsx`.

**Dependencies:** Task 24.

**Estimated scope:** M.

## Task 26: Identity Clients + Client Scopes

**Acceptance criteria:** bounded content region; Resources-derived toolbar/filter pattern len kde existujú table filters; detail subviews unchanged.

**Verification:** section tests.

**Dependencies:** Task 24.

**Estimated scope:** M.

## Task 27: Identity Organizations + User Federation

**Acceptance criteria:** rovnaký table geometry contract; integration placeholders/business behavior unchanged; no fake pagination.

**Verification:** section tests.

**Dependencies:** Task 24.

**Estimated scope:** M.

### Checkpoint C3 — Identity lists I

- [ ] Tasks 25–27 use same table geometry contract.
- [ ] No feature behavior redesign.

## Task 28: Identity Sessions + Permissions

**Acceptance criteria:** Sessions má explicitný data viewport; Permissions odstráni accidental extra outer inset; semantics unchanged.

**Verification:** section tests.

**Dependencies:** Task 24.

**Estimated scope:** M.

## Task 29: Identity Events + Authentication

**Acceptance criteria:** Events table/tabs explicit fill/scroll; required-actions table bounded; non-table policy content ostáva natural workspace content.

**Verification:** section tests.

**Dependencies:** Task 24.

**Estimated scope:** M.

## Task 30: Identity non-table regression pass

**Routes/sections:** Groups, Realm Settings, Identity Providers.

**Acceptance criteria:** hierarchy/forms/cards accessible; no clipping; source meniť iba pri potvrdenej geometry regresii.

**Verification:** existing tests + browser smoke.

**Dependencies:** Tasks 25–29.

**Estimated scope:** S verification.

### Checkpoint C4 — Identity complete

- [ ] Table sections share Resources-derived contract.
- [ ] Non-table sections bez regressie.

## Task 31: Workspace browser matrix

**Routes:** Configuration, Discovery Settings all tabs, Recovery Actions all tabs, Identity Access representative sections.

**Acceptance criteria:** header/surface X/Y aligned; no scrollbar-induced horizontal jump; one vertical scroll owner; `1366x768` no clipping.

**Dependencies:** Tasks 19–30.

**Estimated scope:** M verification.

## Checkpoint C — Workspace archetype complete

---

# Phase 3 — Builders, detail, topology and document page

## Task 32: Recovery Group create/edit outer geometry

**Acceptance criteria:** create/edit share same outer frame; load/error/mutation states preserve header + builder boundary; DnD/business flow unchanged.

**Verification:** builder/editor page tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 33: Recovery Application create/edit outer geometry

**Acceptance criteria:** same as Group builder; unsaved guard/file-name/orchestrator semantics unchanged.

**Verification:** builder/editor page tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

## Task 34: Builder surface + common wizard sidebar width

**Description:** Primary Card visual contract sa zarovná s canonical Card. Sidebar width sa nepreberá z Resources; vyberie sa podľa browser evidence oboch builders.

**Acceptance criteria:**
- [ ] Group/App builder primary bordered surface radius/shadow aligned with canonical Card.
- [ ] Jedna sidebar width podľa longest SK/EN labels.
- [ ] Step-specific scroll ownership unchanged.

**Verification:** builder component tests + SK/EN browser measurement.

**Dependencies:** Tasks 32–33.

**Estimated scope:** M.

### Checkpoint D1 — Builders

- [ ] Create/edit states stable.
- [ ] Sidebar decision backed by browser evidence.

## Task 35: ModuleWorkQueuePage

**Description:** Explicitne pokryť page, ktorá bola v pôvodnom 26-route audite, ale nemala vlastný task.

**Acceptance criteria:**
- [ ] PageHeader left/right boundary zodpovedá baseline.
- [ ] Main/aside Card radius/shadow používajú shared Card contract bez accidental outer insetu.
- [ ] Page ostáva Document/workspace s natural AppShell scrollom; netlačí sa do table/contained patternu.

**Verification:** `ModuleWorkQueuePage.test.tsx` + browser desktop/mobile smoke.

**Dependencies:** Checkpoint A.

**Estimated scope:** S–M.

## Task 36: Provider Detail success/error/not-found

**Acceptance criteria:** všetky states majú rovnaký header/body inset; special `p-6` geometry shift odstránený; default natural scroll zachovaný.

**Verification:** ProviderDetailPage tests pre success/error/not-found.

**Dependencies:** Checkpoint A.

**Estimated scope:** S.

## Task 37: Infrastructure outer topology workspace

**Acceptance criteria:** header/action placement podľa baseline; source selector ostáva feature slot; topology primary Card aligned; route contained s explicitným canvas/panel scroll ownerom.

**Verification:** Infrastructure page/workspace/router tests.

**Dependencies:** Checkpoint A.

**Estimated scope:** M.

### Checkpoint D2 — Document/detail/topology outer geometry

- [ ] ModuleWorkQueue + Provider Detail + Infrastructure consciously mapped to their archetypes.
- [ ] Resources table contract sa na ne neaplikuje nasilu.

## Task 38: Infrastructure loading skeleton

**Acceptance criteria:** loading uses same outer topology surface; hardcoded min-heights only with browser evidence; loading->loaded no major outer jump.

**Verification:** skeleton test + browser transition.

**Dependencies:** Task 37.

**Estimated scope:** S.

## Task 39: Builder/detail/topology/document browser matrix

**Routes:** Group/App create/edit, ModuleWorkQueue, Provider Detail, Infrastructure.

**Acceptance criteria:** outer header/Card boundaries stable; inner canvas/list scroll owners correct; error/loading transitions preserve geometry; mobile smoke usable.

**Dependencies:** Tasks 32–38.

**Estimated scope:** M verification.

## Checkpoint D — Non-table archetypes complete

---

# Phase 4 — Route fallbacks, cleanup and final verification

## Task 40: Archetype-aware `RouteLoadingSkeleton`

**Variants:** `table`, `workspace`, `builder`, optional `detail/document`.

**Acceptance criteria:**
- [ ] Table skeleton proportions follow canonical Resources header/surface/toolbar/data/footer geometry.
- [ ] Workspace/builder skeletons represent their real archetype, nie fake table.
- [ ] Infrastructure keeps topology-specific skeleton.

**Verification:** RouteLoadingSkeleton tests per variant.

**Dependencies:** Checkpoints B–D.

**Estimated scope:** M.

## Task 41: Wire route fallbacks to route matrix

**Acceptance criteria:** every lazy route uses correct archetype fallback; route matrix and router tests agree; no fallback changes business routing.

**Verification:** router/fallback tests.

**Dependencies:** Task 40.

**Estimated scope:** S–M.

## Task 42: Reference-check and remove obsolete wrappers only when safe

**Description:** Po migrácii preveriť references pre `ResourceViewportFrame`, compatibility `ResourceInventoryPanel`, local duplicate table wrappers a obsolete geometry helpers.

**Acceptance criteria:**
- [ ] Delete iba pri 0 production references alebo explicitnom compatibility replacement.
- [ ] `InventoryShell`/other shared component sa nemaže len preto, že vznikla nová extrakcia.
- [ ] Každý cleanup nad 5 files sa rozdelí na samostatný follow-up task.

**Verification:** symbol/reference search + focused tests.

**Dependencies:** Tasks 7–41.

**Estimated scope:** S–M.

### Checkpoint E1 — Fallback/cleanup

- [ ] Route fallbacks match archetypes.
- [ ] Compatibility wrappers cleaned only from evidence.

## Task 43: Final cross-cutting automated verification

**Acceptance criteria:** complete Vitest run, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` green.

**Dependencies:** Task 42.

**Estimated scope:** M verification.

## Task 44: Final browser regression matrix

**Viewporty:** `1542x765`, `1366x768`, `1920x1080`, `390x844` smoke.

**Representative routes:** canonical Resources/ISE; all table routes; Configuration/Discovery/Recovery Actions/Identity; both builders; ModuleWorkQueue; Provider Detail; Infrastructure.

**Acceptance criteria:**
- [ ] Same archetype + same slot topology => same canonical outer geometry.
- [ ] Header actions/tabs/filter modal/table pagination follow reference contracts.
- [ ] No nested desktop vertical scrollbar, clipping alebo console regressions.

**Dependencies:** Task 43.

**Estimated scope:** L verification only; každá nájdená regresia je samostatný S/M fix task.

## Task 45: Final 26-route traceability signoff

**Description:** Prejsť autoritatívnu matrix z §2.3 riadok po riadku.

**Acceptance criteria:**
- [ ] Všetkých 26 route-level pages má completed migration/verification task.
- [ ] Každá page má vedome určený archetype, route mode a scroll owner.
- [ ] Žiadna page nie je iba uvedená v audite bez implementačného/verifikačného tasku.

**Dependencies:** Task 44.

**Estimated scope:** S verification/documentation.

## Checkpoint E — Complete

- [ ] Resources + Resources ISE sú canonical reference a ich známe baseline inconsistencies sú odstránené.
- [ ] Table/list pages match Resources-derived X/Y/actions/tabs/filter/table/pagination contract.
- [ ] Workspace/builder/detail/topology/document pages preberajú iba relevantné baseline rules, nie table semantics.
- [ ] Všetkých 26 routes je traceable a browserovo sign-offnutých.

---

# 5. Browser measurement protocol

Pri canonical baseline a každom checkpointu zaznamenať:

- viewport size,
- page header `left/top/width/height`,
- action group `left/right/top/height`,
- primary surface `left/top/width/height`,
- surface header/tabs bounds,
- data toolbar bounds,
- data viewport `clientHeight/scrollHeight/overflow-y`,
- table `clientWidth/scrollWidth/overflow-x`,
- pagination `top/height/bottom`,
- AppShell/main/page/table scrollbar presence.

Porovnanie sa robí s Resources baseline pri rovnakom viewporte. Absolútne Y nemusí byť rovnaké medzi pages s odlišnými funkčnými slots (napr. metrics), ale rovnaká slot topology nesmie mať accidental wrapper/padding drift.

# 6. Required data/state scenarios

Pre table/inventory pages:

- loading,
- fatal load error bez cached data,
- cached-data refresh error,
- no-provider, ak feature pozná provider boundary,
- empty success,
- 1 row,
- page-size/full page,
- overflowing rows,
- mutation alert, ak feature podporuje mutation,
- open filter modal,
- active tabs, ak feature má tabs.

# 7. Verification strategy

Per implementation task:

```text
npm exec vitest run <affected-test-files>
npm exec -- eslint <changed-ts-tsx-files> --max-warnings=0
git diff --check
```

`npm run typecheck` pri shared extraction, route contract alebo type-level zmene.

Browser checkpoints sú povinné; JSDOM class assertions nie sú dôkaz reálneho X/Y/overflow behavioru.

Final checkpoint je cross-cutting a preto zahŕňa complete tests + typecheck + lint + build.

# 8. Rollback strategy

1. Každý task/feature slice má atomic commit.
2. Pri browser gate failure sa opravuje/revertuje posledný slice, nie celý program.
3. Canonical Resources contract sa nemení kvôli jednej page-specific výnimke bez dôkazu, že problém reprodukujú minimálne dve nezávislé pages.
4. Žiadne page-specific max-height/viewport hacks na obídenie canonical contractu.

# 9. Parallelization

## Sekvenčné

- Tasks 1–7: Resources stabilization -> browser approval -> shared extraction.
- Route contained switch až po inner table migrations.
- Identity outer frame pred Identity sections.
- Loading fallback/cleanup až po archetype stabilization.

## Bezpečne paralelizovateľné po Checkpoint A

- jednotlivé table pages 8–16, ak nemenia rovnaký shared component,
- Configuration/Discovery/Recovery Actions slices,
- Provider Detail a ModuleWorkQueue,
- Identity section pairs po Task 24.

## Coordination hazard

`src/app/AppRoutes.tsx` je hot file. Route metadata a fallback wiring má mať jedného vlastníka alebo sa musí vykonať sekvenčne.

# 10. Risks and mitigations

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Resources sa skopíruje aj s dnešnými chybami | High | Tasks 1–4 odstránia no-provider/radius inconsistency pred canonical approval |
| Nový shared abstraction zopakuje predošlý neúspešný smer | High | Shared extraction až po browser-approved Resources; API musí kopírovať proven DOM/classes |
| Double outer inset | High | Resources X/W baseline + explicit removal accidental outer `p-3` |
| Pagination sa hýbe podľa rows | High | `auto/minmax(0,1fr)/auto` shared surface + browser 0/1/many datasets |
| Nested vertical scroll | High | Jeden explicitný scroll owner + computed overflow measurement |
| Tabs budú na rôznych miestach | Medium | Table/inventory tabs v canonical primary surface header |
| Filter UX sa rozíde | Medium | `DataTableToolbar` + shared Modal pre table filters; feature dodá iba fields/semantics |
| No-provider/error zmení layout | High | State invariant vo vnútri canonical surface |
| Identity refactor sa zmení na redesign | High | Outer first; table sections po dvojiciach; non-table verification-only |
| Builders budú nasilu kopírovať table layout | High | Route archetype matrix jasne oddeľuje relevantné baseline rules |
| Unrelated worktree changes sa dostanú do commitov | High | explicit path staging + staged diff review |

# 11. Current working-tree safety note

Pri tejto revízii plánu sú v worktree nezávislé zmeny:

- `tasks/access-logs-audit-plan.md`
- `tasks/access-logs-audit-todo.md`

Nie sú súčasťou page-layout programu a nesmú byť stage-nuté, resetnuté ani zahrnuté do jeho commitov. Rovnaké pravidlo platí pre akékoľvek budúce unrelated OpenAPI/generated alebo iné pre-existing changes.

# 12. Definition of Done

- [ ] Resources/Resources ISE no-provider state neobchádza canonical primary surface.
- [ ] Canonical primary/table bordered surface nepoužíva mixed `rounded-2xl` vs `rounded-[20px]` contract.
- [ ] Resources baseline bol browserovo schválený pred migráciou ostatných pages.
- [ ] Shared contained/table primitives sú iba extrakcie proven Resources patternu.
- [ ] Same table archetype používa rovnaké header/action/surface/tab/filter/table/pagination placement pravidlá.
- [ ] Add/Create/Refresh actions sú v canonical page action slote.
- [ ] Table filters používajú shared `DataTableToolbar` modal pattern, kde významovo patria.
- [ ] 0/1/many rows nemenia primary table surface H ani pagination Y.
- [ ] Loading/error/empty/no-provider nemenia accidental outer surface boundary.
- [ ] Desktop contained pages majú jedného explicitného vertical scroll ownera.
- [ ] Mobile natural scroll ostáva použiteľný.
- [ ] Všetkých 26 route-level pages je priamo mapovaných na archetype + task + route mode + scroll owner.
- [ ] `ModuleWorkQueuePage` a `ResourcesIsePage` majú explicitné pokrytie, nie iba audit mention/smoke.
- [ ] Typografia, farby, business logic, API calls, query/filter semantics zostali zachované okrem explicitnej layout unifikácie.
- [ ] Final complete tests, lint, typecheck, build, `git diff --check` a browser matrix sú zelené.
- [ ] Každý implementation commit je atomic a neobsahuje unrelated pre-existing changes.
