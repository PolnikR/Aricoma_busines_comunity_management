# Implementačný plán: Zjednotenie page layoutov a geometry contractu

## Prehľad

Cieľom je systematicky zjednotiť geometriu všetkých frontend pages bez zmeny ich business logiky, API kontraktov, filtrov, query lifecycle, typografie, farebnosti alebo feature-specific správania. Audit potvrdil, že problém nie je lokálna odchýlka jednej tabuľky, ale kombinácia viacerých layout kontraktov: rozdielny page/body inset, nested `InventoryShell`, odlišný table-height contract, rôzny scroll owner, stavovo závislá geometria a odlišné loading fallbacks.

Zmena je zámerne rozdelená na malé S/M tasky. Žiadny implementačný task nemá byť XL. Po každej 2–4 taskovej skupine nasleduje checkpoint a browser overenie. Implementácia sa nesmie robiť ako jeden veľký refactor commit.

Tento dokument je plán. Pri jeho vytvorení sa produkčný source kód nemení.

## Východiskový stav potvrdený auditom

### Route-level scope

Audit pokrýva 26 route-level feature pages:

1. `InfrastructurePage`
2. `ResourcesPage`
3. `ResourcesIsePage`
4. `ModuleWorkQueuePage`
5. `ConfigurationPage`
6. `IdentityAccessPage`
7. `PlatformProvidersPage`
8. `CredentialsPage`
9. `DiscoverySettingsPage`
10. `ProviderDetailPage`
11. `ProvidersPage`
12. `RecoveryActionsExecutePage`
13. `RecoveryActionsHistoryPage`
14. `RecoveryActionsSchedulePage`
15. `RecoveryActionsValidatePage`
16. `PolicySetsPage`
17. `RecoveryApplicationBuilderPage`
18. `RecoveryApplicationEditorPage`
19. `RecoveryApplicationsListPage`
20. `RecoveryGroupBuilderPage`
21. `RecoveryGroupEditorPage`
22. `RecoveryGroupsListPage`
23. `RecoveryAppPoliciesPage`
24. `CleanRoomPoliciesPage`
25. `SnapshotPoliciesPage`
26. `RecoveryRunsPage`

Audit navyše zahŕňa nested Resources provider views a Identity Access sections.

### Hlavné potvrdené nekonzistencie

- `AppShell` má route-dependent `contentScroll: 'contained'`, ale contained režim používa iba časť pages, hoci mnoho ďalších pages už interne používa `h-full`, `min-h-0` a `overflow-hidden`.
- Page body používa viac hierarchií: priamy `p-3 -> table`, `p-3 -> InventoryShell -> p-3 -> table`, alebo `InventoryShell` bez outer `p-3`.
- Hlavné surfaces používajú `rounded-lg`, `rounded-xl`, `rounded-2xl` aj `rounded-[20px]`.
- Table roots majú tri rozdielne height contracty:
  - content-driven `flex flex-col`,
  - čiastočný `flex-1`,
  - stabilný `toolbar -> minmax(0,1fr) viewport -> pagination`.
- `RecoveryGroupsListPage` a `RecoveryApplicationsListPage` pri empty stave odstránia celý table surface a nahradia ho samostatným `EmptyState`.
- `ProviderDetailPage`, builder edit pages a ďalšie routes majú error/not-found wrappery s iným paddingom alebo bez normálneho page frame.
- `RouteLoadingSkeleton` predstiera table page aj pre builder/workspace/settings routes.
- `Identity Access` má ďalšiu vnútornú vrstvu nekonzistencie medzi jednotlivými sections.
- `RecoveryGroupBuilder` používa `240px` wizard sidebar, `RecoveryAppBuilder` `280px`.

### Existujúce dobré patterns, ktoré sa majú zachovať

- `ResourceInventoryPanel` a `DiscoveryHistoryCard` už používajú stabilný `auto / minmax(0,1fr) / auto` layout.
- `PolicySetsTable` a `RecoveryRunsTable` už majú samostatný flex-fill scrollable data region.
- `RecoveryActionsPageShell` už správne centralizuje outer workspace geometry pre štyri routes.
- `ResourceViewportFrame` a existujúci route-level contained režim už dokazujú, že desktop containment je možné zaviesť bez globálneho prepnutia všetkých routes.
- `DataTable` má zostať vlastníkom horizontálneho scrollu; vertikálny scroll má patriť nadriadenému content viewportu.

## Scope

### V rozsahu

- spoločný route/page geometry contract,
- primary page surface contract,
- table height/scroll/pagination contract,
- jednotné desktopové contained správanie pre pages, ktoré majú fixný workspace/table surface,
- stabilné loading/error/empty state boundaries,
- zjednotenie table/list pages,
- zjednotenie Resources shellu bez straty metrics/tabs/filter summary/filtering/drawer functionality,
- zjednotenie Workspace/Settings pages,
- zjednotenie Identity Access outer frame a table-like sections,
- zjednotenie builder outer geometry a state boundaries,
- route-loading skeletony podľa archetypu,
- focused tests, typecheck/lint/diff checks a povinná browser verifikácia.

### Mimo rozsahu

- API, OpenAPI alebo generated-client zmeny,
- zmena business logiky, query keys, cache policy alebo polling,
- zmena tabuliek z pohľadu stĺpcov, dát alebo row density defaults,
- redizajn typografie, farieb, buttonov, badges alebo formulárov,
- zmena filters/search semantics,
- zmena Resources provider selection alebo VM provider-filter semantics,
- zmena Recovery builder DnD/business flow,
- server-side pagination redesign,
- zavedenie nového visual-regression frameworku,
- pevné `calc(100vh - ...)`, JS viewport matematika, CSS zoom alebo fixné `max-height` hacky.

## Architektonické rozhodnutia

### A1. Page archetypes

Použiť malé množstvo explicitných archetypov, nie jeden gigantický univerzálny komponent:

```text
Contained Table Page
Contained Inventory Page
Contained Workspace/Settings Page
Contained Builder Page
Document/Detail Page
```

Rovnaký archetyp musí používať rovnaké outer geometry pravidlá. Feature-specific slots môžu byť voliteľné; prázdne miesto sa nebude umelo rezervovať len preto, aby page s metrics mala rovnaký Y ako page bez metrics.

### A2. `PageFrame`

Nový shared primitive bude vlastniť route-level flex chain, nie feature obsah:

```text
flex min-h-full min-w-0 flex-col
lg:h-full lg:min-h-0
```

`PageHeader` zostáva existujúci komponent a jeho `mb-5` sa nemení.

### A3. `PageBody`

Contained pages budú používať jednotný body boundary:

```text
flex min-w-0 flex-1 flex-col p-3
lg:min-h-0 lg:overflow-hidden
```

Mobil ostáva prirodzene scrollovateľný; desktop containment sa opiera o existujúci route handle `contentScroll: 'contained'`.

### A4. `PageSurface`

Primary page surface bude mať jeden visual contract odvodený z existujúceho shared `Card`:

```text
flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden
rounded-[20px] border border-border bg-surface
shared Card shadow
```

Primary surface nesmie byť v rovnakom archetype raz `rounded-lg`, inokedy `rounded-2xl`.

Nested semantic cards vnútri settings/forms/previews zostávajú feature-specific a nemusia používať rovnaký radius ako primary surface.

### A5. `TableSurface`

`TableSurface` bude layout primitive, nie data abstraction. Nebude obsahovať fetchovanie, filtering, pagination state ani columns.

Contract:

```text
PageSurface
├ optional surface header/tabs/context
└ TableSurface
   ├ top slot: toolbar + optional notice
   ├ content viewport: minmax(0,1fr), vertical scroll owner
   └ pagination/footer
```

Stredný viewport:

```text
custom-scrollbar min-h-0 overflow-y-auto
[scrollbar-gutter:stable]
```

`DataTable` si ponechá existujúci horizontálny `overflow-x-auto`.

### A6. Number-of-rows invariant

Pri `0`, `1`, `5`, `10`, `25` alebo veľkom počte riadkov sa primary surface nesmie meniť podľa výšky dát.

- rows zostávajú prirodzene vysoké podľa density,
- pri krátkom zozname ostáva blank space v content viewporte,
- pagination zostáva na rovnakom spodnom Y,
- pri dlhom zozname scrolluje iba content viewport.

### A7. Request-state invariant

Loading/error/empty nesmú nahrádzať outer page frame alebo primary surface.

Správne:

```text
PageHeader
PageBody
PageSurface
  TableSurface / Workspace body
    loading | error | empty | data
```

Nesprávne:

```text
if error -> return <div className="p-6">...</div>
```

Mutation alerts sa majú renderovať vo vnútri fixnej surface/top oblasti, aby nemenili outer X/Y/W/H.

### A8. Scroll ownership

Na desktop contained page musí byť presne jeden hlavný vertical scroll owner v každej obsahovej vetve:

- table page: table content viewport,
- workspace/settings: workspace body,
- builder: step-specific inner panel,
- Resources: resource table viewport,
- document/detail: default AppShell/page scroll môže zostať.

Nesmie vzniknúť kombinácia page scroll + table scroll pre ten istý obsah.

### A9. Route containment

Existujúci `contentScroll: 'contained'` mechanizmus v `AppShell` sa zachová. Nebude sa nahrádzať URL matchingom ani globálnym `overflow-hidden` pre všetky routes.

Routes sa budú prepínať na contained režim po migračných dávkach, nie všetky naraz predtým, než ich vnútorný flex chain bude pripravený.

### A10. Compatibility wrappers

Existujúce `InventoryShell`, `ResourceViewportFrame` a `ResourceInventoryPanel` sa nebudú odstraňovať na začiatku.

- nový contract sa najprv dokáže na pilotoch,
- compatibility wrappers sa migrujú alebo odstránia až keď ich referencie klesnú na nulu,
- žiadny shared wrapper sa nesmie globálne zmeniť tak, že neprejdené pages dostanú nový layout pred svojím migračným taskom.

## Dependency graph

```text
Phase 1: shared geometry primitives
        |
        v
Phase 2: pilot (Groups + Policies + Resources)
        |
        v
Pilot browser approval
        |
        +---------------------------+
        |                           |
        v                           v
Phase 3: remaining table pages   Phase 4: workspaces/settings
        |                           |
        +-------------+-------------+
                      v
              Phase 5: builders/details/topology
                      |
                      v
              Phase 6: loading fallbacks + cleanup
                      |
                      v
              Final cross-cutting verification
```

---

# Phase 1 — Shared geometry foundation

## Task 1: Add RED contract tests for shared layout primitives

**Description:** Vytvoriť focused tests, ktoré definujú očakávaný class/DOM contract pre `PageFrame`, `PageSurface` a `TableSurface`. Testy nemajú predstierať reálne pixelové layout meranie v JSDOM; majú chrániť ownership, flex/grid chain a scroll boundary.

**Acceptance criteria:**
- [ ] `PageFrame` test vyžaduje full-height desktop flex contract a `min-w-0`.
- [ ] `PageSurface` test vyžaduje `flex-1`, `min-h-0`, `overflow-hidden` a primary radius `rounded-[20px]`.
- [ ] `TableSurface` test vyžaduje oddelený top/content/footer contract a vertical scroll iba na content viewporte.

**Verification:**
- [ ] RED failure je iba z neexistujúceho/nezavedeného contractu, nie zo setup chyby.
- [ ] Žiadny existujúci source component sa v tomto taske nemení.

**Dependencies:** None.

**Files likely touched:**
- `src/shared/components/page/PageFrame.test.tsx`
- `src/shared/components/page/PageSurface.test.tsx`
- `src/shared/components/data-table/TableSurface.test.tsx`

**Estimated scope:** M — 3 files.

## Task 2: Implement `PageFrame` and `PageBody`

**Description:** Zaviesť minimálny shared route/page primitive. Bez title/actions API; `PageHeader` sa compose-uje zvonka.

**Acceptance criteria:**
- [ ] `PageFrame` nevlastní feature props ani route navigation.
- [ ] `PageBody` implementuje jednotný `p-3` contained body contract.
- [ ] Mobilný layout nemá nútený fixed-height scroll.

**Verification:**
- [ ] `PageFrame.test.tsx` prejde.
- [ ] focused ESLint pre nový source/test prejde.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/shared/components/page/PageFrame.tsx`
- `src/shared/components/page/PageFrame.test.tsx`

**Estimated scope:** S — 2 files.

## Task 3: Implement `PageSurface`

**Description:** Zaviesť primary visual surface s jednotným radius/border/shadow contractom a voliteľným header slotom. Nepridávať feature-specific props.

**Acceptance criteria:**
- [ ] Surface je `flex-1 min-h-0 min-w-0 overflow-hidden`.
- [ ] Visual contract používa shared Card radius/shadow hodnoty.
- [ ] Optional header je `shrink-0`; bez headeru nevzniká prázdny rezervovaný pás.

**Verification:**
- [ ] `PageSurface.test.tsx` prejde.
- [ ] `Card` source sa nemusí meniť, ak sa dá existujúci contract compose-nuť.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/shared/components/page/PageSurface.tsx`
- `src/shared/components/page/PageSurface.test.tsx`

**Estimated scope:** S — 2 files.

## Task 4: Implement `TableSurface`

**Description:** Zaviesť layout-only primitive pre toolbar/notice, scrollable data viewport a pagination. Table state zostáva v feature komponentoch.

**Acceptance criteria:**
- [ ] Top a footer sú mimo vertical scroll regionu.
- [ ] Content region je `min-h-0` a jediný vertical table scroll owner.
- [ ] `scrollbar-gutter: stable` alebo ekvivalent zabraňuje horizontálnemu poskoku pri objavení scrollbaru.
- [ ] `DataTable` horizontálny scroll sa nemení.

**Verification:**
- [ ] `TableSurface.test.tsx` prejde.
- [ ] `DataTable.test.tsx`, `DataTableToolbar.test.tsx`, `DataTablePagination.test.tsx` zostanú zelené bez source zmeny.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/shared/components/data-table/TableSurface.tsx`
- `src/shared/components/data-table/TableSurface.test.tsx`
- shared data-table export file iba ak je potrebný export

**Estimated scope:** M — 2–3 files.

## Checkpoint A — Foundation

- [ ] Tasks 1–4 focused tests sú zelené.
- [ ] Nové primitives nemajú feature imports.
- [ ] Žiadny existujúci route/page ešte nebol migrovaný.
- [ ] `npm run typecheck` prejde.
- [ ] `git diff --check` prejde.
- [ ] Review potvrdí, že API nových primitives je malé a bez optional-prop explosion.

---

# Phase 2 — Pilot: Recovery Groups, Recovery Policies, Resources

## Task 5: Add contained route metadata for pilot pages

**Description:** Pilot routes prepnúť do existing `contentScroll: 'contained'` režimu až po pripravených primitives.

**Pilot routes:**
- Recovery Groups list,
- Snapshot Policies,
- Application Recovery Policies,
- Clean Room Policies,
- Resources a Resources ISE už contained režim majú a nemenia sa.

**Acceptance criteria:**
- [ ] Pilot list/policy routes majú explicitný contained handle.
- [ ] Default document route zostáva bez handle.
- [ ] `AppShell` implementácia sa nemení, ak existujúci mechanism stačí.

**Verification:**
- [ ] Router/AppShell tests odlíšia contained a default route.

**Dependencies:** Checkpoint A.

**Files likely touched:**
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`
- `src/layouts/app-shell/AppShell.test.tsx` iba ak existujúce assertions nepokrývajú nový route set

**Estimated scope:** M — 2–3 files.

## Task 6: Migrate Recovery Groups list to the new contract

**Description:** `RecoveryGroupsListPage` bude pilot jednoduchého TablePage archetypu. Empty, loading, fetch error a mutation error zostanú vo fixnom primary surface.

**Acceptance criteria:**
- [ ] Page používa `PageFrame -> PageHeader -> PageBody -> PageSurface -> TableSurface`.
- [ ] `RecoveryGroupsTable` už nemá content-driven root `flex flex-col` ako jediný height contract.
- [ ] Empty state sa renderuje v table content viewporte; primary surface zostáva prítomný.
- [ ] Pagination zostáva na spodnom Y pri 0/1/many rows.
- [ ] Mutation error nezväčší outer page height ani neposunie primary surface.

**Verification:**
- [ ] Page test: surface zostáva pri empty stave.
- [ ] Table test: toolbar/content/pagination ownership.
- [ ] Existing edit/delete/rollback/detail interactions zostanú zelené.

**Dependencies:** Task 5.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`

**Estimated scope:** M — 4 files.

## Task 7: Migrate Recovery Policy shell + Snapshot Policies

**Description:** Presunúť shared `RecoveryPolicyPageShell` na nový PageFrame/PageSurface contract a Snapshot table na TableSurface. Tabs ostávajú surface-header slotom.

**Acceptance criteria:**
- [ ] Policy tabs ostávajú na rovnakom mieste vo všetkých policy routes.
- [ ] Snapshot table používa fixed toolbar/content/pagination contract.
- [ ] Delete/load errors sú vo vnútri primary surface.
- [ ] Žiadny nested primary `rounded-lg` table card nie je potrebný.

**Verification:**
- [ ] `RecoveryPolicyPageShell.test.tsx`.
- [ ] `SnapshotPoliciesTable.test.tsx`.
- [ ] `SnapshotPoliciesPage.test.tsx`.

**Dependencies:** Task 5.

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.tsx`
- `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`

**Estimated scope:** M — 4 files.

## Task 8: Migrate Application Recovery + Clean Room policy tables

**Description:** Dokončiť oba zostávajúce policy table variants na rovnaký TableSurface contract bez ďalšej zmeny shellu.

**Acceptance criteria:**
- [ ] Oba table roots používajú rovnaký height/scroll/pagination contract ako Snapshot.
- [ ] Page-specific filters/forms/actions sa nemenia.
- [ ] Error/empty state neodstraňuje primary PageSurface.

**Verification:**
- [ ] Focused component tests pre oba tables.
- [ ] Existujúce page tests zostanú zelené.

**Dependencies:** Task 7.

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`

**Estimated scope:** M — 4 files.

## Task 9: Migrate Resources compatibility shell to shared primitives

**Description:** Zachovať Resources feature API, ale previesť `ResourceInventoryShell` a `ResourceInventoryPanel` na nový shared PageSurface/TableSurface contract. Nezasahovať do provider queries, tabs, metrics, filter summary ani drawer.

**Acceptance criteria:**
- [ ] VMware, FlashSystem a IBM Power call sites nepotrebujú business-logic rewrite.
- [ ] Metrics/notice ostávajú pred primary surface.
- [ ] Inventory title/description/provider tabs ostávajú surface header.
- [ ] Toolbar/content/pagination používa shared TableSurface.
- [ ] Resource detail drawer ostáva overlay a nemení frame geometry.

**Verification:**
- [ ] `ResourceInventoryPanel.test.tsx` prejde s novým shared contractom.
- [ ] `ResourceViewportFrame.test.tsx` zostane zelený.
- [ ] `VmwareResourcesPage.test.tsx`, `FlashSystemInventoryView.test.tsx`, `PowerInventoryView.test.tsx` prejdú.

**Dependencies:** Checkpoint A.

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`
- nový `ResourceInventoryShell.test.tsx` iba ak je potrebný explicitný compatibility test

**Estimated scope:** M — 3–4 files.

## Task 10: Align Resources request-state containment

**Description:** Overiť, že loaded/background-loading/empty/fatal-error branches používajú rovnaký primary surface boundary. Nezavádzať umelé blank metrics sloty; optional metrics/notice môžu legitímne meniť vertical slot topology, ale samotná surface nesmie byť nahradená iným wrapperom.

**Acceptance criteria:**
- [ ] `ResourceInventoryLoading`, fatal error a empty state sa zmestia do rovnakého surface/content boundary.
- [ ] Table-specific loading nemení toolbar/footer ownership.
- [ ] Surface width/X zostáva rovnaký medzi loaded/empty/error.

**Verification:**
- [ ] `ResourceInventoryStates.test.tsx`.
- [ ] `VmwareResourcesPage.test.tsx` loading/error/empty branches.

**Dependencies:** Task 9.

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx` iba ak state wiring potrebuje layout-only zmenu
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`

**Estimated scope:** M — 2–4 files.

## Task 11: Pilot browser verification and decision gate

**Description:** Pred ďalšou migráciou overiť tri odlišné archetypy v reálnom browseri. Ak pilot nevyrieši poskakovanie alebo vytvorí nested scroll, zvyšok migrácie sa nezačne.

**Routes:**
- Recovery Groups,
- Snapshot Policies + preklik na ďalšie policy tabs,
- Resources VMware/FlashSystem/IBM Power,
- Resources ISE aspoň jeden provider type.

**Viewporty:**
- `1542x765` primárny desktop,
- `1366x768` krátky desktop,
- `1920x1080` široký desktop,
- `390x844` mobilný smoke check.

**Acceptance criteria:**
- [ ] Primary surface má rovnaký outer X/inset na pilot pages.
- [ ] 1-row table nepresunie pagination nahor.
- [ ] Dlhý table list scrolluje iba content viewport.
- [ ] Sticky table header funguje.
- [ ] Horizontal DataTable scroll ostáva funkčný.
- [ ] Switching policy tabs nemení outer surface X/W/H.
- [ ] Resources detail drawer nemení surface geometry.
- [ ] Console bez nových React/layout warningov.

**Dependencies:** Tasks 6–10.

**Files likely touched:** None; verification only.

**Estimated scope:** M — browser verification.

## Checkpoint B — Pilot approval

- [ ] Pilot browser matrix je zelená.
- [ ] Review potvrdí shared primitives bez API expansion.
- [ ] Žiadny business/API diff.
- [ ] Až potom pokračovať na remaining table pages.

---

# Phase 3 — Remaining table/list pages

Nasledujúce tasky môžu po Checkpoint B bežať paralelne po feature oblastiach, pretože nebudú meniť shared primitives. Route contained handles sa pridajú až po migrácii celej dávky v samostatnom taske.

## Task 12: Migrate Providers list

**Acceptance criteria:**
- [ ] Odstráni sa accidental `p-3 -> InventoryShell -> p-3 -> nested table card` hierarchy.
- [ ] Providers používa rovnaký primary surface + TableSurface ako pilot.
- [ ] role filter, connection test, detail drawer, create modal a pagination sa nemenia.

**Verification:**
- [ ] `ProvidersPage.test.tsx`.
- [ ] `ProvidersCatalogueTable.test.tsx`.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`
- `src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`

**Estimated scope:** M — 4 files.

## Task 13: Migrate Platform Providers list

**Acceptance criteria:**
- [ ] Rovnaký PageSurface/TableSurface contract ako Providers.
- [ ] SMTP dialog, edit/delete, create modal a credential indicators sa nemenia.

**Verification:**
- [ ] `PlatformProvidersPage.test.tsx`.
- [ ] `PlatformProvidersTable.test.tsx`.

**Dependencies:** Checkpoint B.

**Files likely touched:** 4 page/table source+test files.

**Estimated scope:** M.

## Task 14: Migrate Credentials list

**Acceptance criteria:**
- [ ] Existing partial flex contract sa nahradí plným TableSurface contractom.
- [ ] Create/edit/delete/load error flows zostanú funkčné.
- [ ] Pagination je fixed footer.

**Verification:**
- [ ] `CredentialsTable.test.tsx`.
- [ ] Add focused page structure test, ak dnes chýba.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/providers-connectors/credentials/pages/CredentialsPage.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx`
- nový page test iba ak je potrebný

**Estimated scope:** M — 3–4 files.

## Task 15: Migrate Recovery Applications list

**Acceptance criteria:**
- [ ] Empty state zostáva vo fixnej primary surface.
- [ ] Table root už nie je content-driven.
- [ ] Orchestrator run columns, edit/delete/detail behavior sa nemenia.

**Verification:**
- [ ] `RecoveryApplicationsListPage.test.tsx`.
- [ ] `RecoveryApplicationsTable.test.tsx`.

**Dependencies:** Checkpoint B.

**Files likely touched:** 4 page/table source+test files.

**Estimated scope:** M.

## Task 16: Migrate Policy Sets without regressing existing scroll fix

**Description:** Policy Sets už má dobrý inner scroll contract. Zmena má odstrániť nested shell inconsistency, nie znovu riešiť scroll od nuly.

**Acceptance criteria:**
- [ ] Existujúci fixed toolbar/pagination behavior zostáva.
- [ ] Existing `min-h-0/min-w-0` chain sa zachová alebo zjednoduší iba ak nový primitive poskytuje rovnaký contract.
- [ ] Žiadny návrat page-driven table scrollu.

**Verification:**
- [ ] `PolicySetsPage.test.tsx`.
- [ ] `PolicySetsTable.test.tsx`.
- [ ] Browser smoke pri `1366x768`.

**Dependencies:** Checkpoint B.

**Files likely touched:** 4 page/table source+test files.

**Estimated scope:** M.

## Task 17: Migrate Recovery Runs

**Acceptance criteria:**
- [ ] Scope note ostáva feature slot, ale nevyhadzuje primary surface z frame.
- [ ] Tabs zostávajú surface header.
- [ ] Existing fixed table body/pagination behavior zostáva.
- [ ] History drawer ostáva overlay.

**Verification:**
- [ ] `RecoveryRunsPage.test.tsx`.
- [ ] `RecoveryRunsTable.test.tsx`.
- [ ] `RecoveryRunHistoryDrawer.test.tsx` musí zostať zelený bez layout rewrite.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`
- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`

**Estimated scope:** M.

## Task 18: Enable contained mode for migrated table routes

**Description:** Po dokončení Tasks 12–17 označiť migrated table/list routes ako contained. Tým sa zabráni stavu, kde route je contained predtým, než jej vnútorný flex chain vie bezpečne vlastniť scroll.

**Acceptance criteria:**
- [ ] Providers, Platform Providers, Credentials, Recovery Applications, Policy Sets a Recovery Runs routes sú contained.
- [ ] Document/placeholder/detail routes zostávajú default scroll.

**Verification:**
- [ ] `router.test.tsx`.
- [ ] `AppShell.test.tsx` contained/default regression.

**Dependencies:** Tasks 12–17.

**Files likely touched:**
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`
- `src/layouts/app-shell/AppShell.test.tsx` iba ak treba

**Estimated scope:** M.

## Task 19: Table-page browser matrix

**Routes:** Providers, Platform Providers, Credentials, Recovery Groups, Recovery Applications, Policy Sets, Recovery Policies, Recovery Runs.

**Acceptance criteria:**
- [ ] Same archetype => same PageHeader-to-surface inset.
- [ ] Short list a long list nemenia surface H/pagination Y.
- [ ] Empty/error/loading zachovajú primary surface.
- [ ] Žiadny double vertical scrollbar.
- [ ] Horizontal table scroll stále funguje.

**Dependencies:** Task 18.

**Files likely touched:** None.

**Estimated scope:** M.

## Checkpoint C — Table archetype complete

- [ ] Všetky table/list pages používajú shared primitives.
- [ ] `InventoryShell` už nie je potrebný pre simple table pages.
- [ ] Table browser matrix je zelená.

---

# Phase 4 — Settings and workspace pages

## Task 20: Migrate Configuration to PageFrame/PageSurface

**Acceptance criteria:**
- [ ] Existing `RuntimeConfigurationPanel` fixed body/footer behavior sa zachová.
- [ ] Primary surface geometry sa zjednotí bez zmeny fields/save/reset logiky.
- [ ] Route sa po migrácii prepne na contained.

**Verification:**
- [ ] `ConfigurationPage.test.tsx`.
- [ ] Add/extend `RuntimeConfigurationPanel` structure test iba ak potrebné.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/platform-administration/configuration/pages/ConfigurationPage.tsx`
- `src/features/platform-administration/configuration/pages/ConfigurationPage.test.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** M.

## Task 21: Migrate Discovery Settings outer workspace

**Acceptance criteria:**
- [ ] PageHeader/body/primary surface používajú shared contract.
- [ ] Configuration/History/Notifications tab behavior sa nemení.
- [ ] Existing contained route zostáva.
- [ ] Scroll owner sa deklaruje per tab content, nie náhodným parent overflowom.

**Verification:**
- [ ] `DiscoverySettingsPage.test.tsx`.
- [ ] Search-param tests zostanú zelené bez source zmeny, ak route state ostáva rovnaký.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`

**Estimated scope:** S–M.

## Task 22: Replace Discovery History local table geometry with shared TableSurface

**Acceptance criteria:**
- [ ] Existing `filters/refresh -> scroll table -> fixed pagination` behavior zostáva.
- [ ] Client-side history pagination semantics sa nemenia.
- [ ] Shared TableSurface nahradí duplicate grid layout bez regressie.

**Verification:**
- [ ] `DiscoveryHistoryCard.test.tsx`.
- [ ] Network/query tests nie sú potrebné meniť, ak request semantics ostanú.

**Dependencies:** Task 21.

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.test.tsx`

**Estimated scope:** S.

## Task 23: Migrate Recovery Actions shared shell

**Acceptance criteria:**
- [ ] `RecoveryActionsPageShell` používa shared PageFrame/PageSurface.
- [ ] `WorkspaceTabs`, panel scroll a feature child contents sa nemenia.
- [ ] Všetky štyri routes sa prepínajú spolu, nie po jednom divergentne.
- [ ] Routes sa označia contained.

**Verification:**
- [ ] `RecoveryActionsPageShell.test.tsx`.
- [ ] navigation model tests zostanú zelené.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/recovery-actions/components/RecoveryActionsPageShell.tsx`
- `src/features/recovery-actions/components/RecoveryActionsPageShell.test.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** M.

## Task 24: Normalize Recovery Actions History embedded table

**Acceptance criteria:**
- [ ] History table využíva dostupnú workspace šírku/výšku bez vlastného accidental Card contractu.
- [ ] Workspace page stále scrolluje iba na definovanom paneli.
- [ ] History filters a drawer/selection behavior sa nemenia.

**Verification:**
- [ ] Focused render/navigation test pre History page alebo rozšírenie shell testu.

**Dependencies:** Task 23.

**Files likely touched:**
- `src/features/recovery-actions/pages/RecoveryActionsHistoryPage.tsx`
- príslušný nový/rozšírený test file

**Estimated scope:** S.

## Task 25: Migrate Identity Access outer frame and resource panel contract

**Description:** Identity Access je workspace archetype. Najprv zjednotiť iba outer page, navigation a `IdentityContentPanel`; jednotlivé sections sa migrujú až ďalšími taskami.

**Acceptance criteria:**
- [ ] `IdentityAccessPage` používa PageFrame/PageBody/PageSurface bez extra root `gap-4` nad PageHeader marginom.
- [ ] `IdentityContentPanel` má explicitný `min-h-0/min-w-0/flex-1` contract.
- [ ] Identity navigation ostáva shrink-0.
- [ ] Route sa prepne na contained.

**Verification:**
- [ ] `IdentityAccessPage.test.tsx`.
- [ ] `IdentityResourceLayout.test.tsx`.
- [ ] `IdentityAccessNavigation.test.tsx` zostane zelený.

**Dependencies:** Checkpoint B.

**Files likely touched:**
- `src/features/platform-administration/identity-access/pages/IdentityAccessPage.tsx`
- `src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx`
- `src/features/platform-administration/identity-access/components/IdentityResourceLayout.tsx`
- `src/features/platform-administration/identity-access/components/IdentityResourceLayout.test.tsx`

**Estimated scope:** M.

## Task 26: Identity Users + Realm Roles table contract

**Acceptance criteria:**
- [ ] Oba sections používajú shared TableSurface bez zmeny data/actions/details behavior.
- [ ] Existing toolbar/content/pagination ownership sa zachová.
- [ ] Detail subpages/tabs ostávajú feature-specific.

**Verification:**
- [ ] `UsersSection.test.tsx`.
- [ ] `RealmRolesSection.test.tsx`.

**Dependencies:** Task 25.

**Files likely touched:** 4 source+test files.

**Estimated scope:** M.

## Task 27: Identity Clients + Client Scopes table contract

**Acceptance criteria:**
- [ ] Table-like list views získajú bounded content region.
- [ ] Detail forms/roles subviews sa nemenia.
- [ ] Ak list nemá pagination, TableSurface footer slot ostáva prázdny bez fake pagination.

**Verification:**
- [ ] `ClientsSection.test.tsx`.
- [ ] `ClientScopesSection.test.tsx`.

**Dependencies:** Task 25.

**Files likely touched:** 4 source+test files.

**Estimated scope:** M.

## Task 28: Identity Organizations + User Federation table contract

**Acceptance criteria/verification:** rovnaký pattern ako Task 27; feature-specific integration placeholders ostávajú.

**Dependencies:** Task 25.

**Files likely touched:** 4 source+test files.

**Estimated scope:** M.

## Task 29: Identity Sessions + Permissions table contract

**Acceptance criteria:**
- [ ] Sessions už nie je bare table bez explicitného viewport boundary.
- [ ] Permissions odstráni accidental extra outer `p-4`, ak nie je semanticky potrebný.
- [ ] Data/content semantics sa nemenia.

**Verification:**
- [ ] `SessionsSection.test.tsx`.
- [ ] `PermissionsSection.test.tsx`.

**Dependencies:** Task 25.

**Files likely touched:** 4 source+test files.

**Estimated scope:** M.

## Task 30: Identity Events + Authentication content contract

**Acceptance criteria:**
- [ ] Events tabs + toolbar + table majú explicitný fill/scroll ownership.
- [ ] Authentication required-actions table a tab content nepoužívajú accidental content-height wrapper.
- [ ] Non-table Authentication policies placeholder ostáva prirodzený content.

**Verification:**
- [ ] `EventsSection.test.tsx`.
- [ ] `AuthenticationSection.test.tsx`.

**Dependencies:** Task 25.

**Files likely touched:** 4 source+test files.

**Estimated scope:** M.

## Task 31: Identity non-table workspace regression pass

**Description:** Overiť Groups, Realm Settings a Identity Providers po outer migration. Produkčný source meniť iba ak browser/test preukáže clipping alebo broken min-height chain.

**Acceptance criteria:**
- [ ] Groups 260px hierarchy workspace zostáva funkčný.
- [ ] Realm Settings forms/tabs sú dostupné cez definovaný workspace scroll.
- [ ] Identity Providers cards sa neorežú.

**Verification:**
- [ ] Existing tests pre Groups/RealmSettings/IdentityProviders.
- [ ] Browser smoke.

**Dependencies:** Tasks 25–30.

**Files likely touched:** ideally none; max 3 focused source/test pairs iba pri potvrdenej regresii a rozdelené do samostatného follow-up tasku.

**Estimated scope:** S verification.

## Task 32: Workspace browser checkpoint

**Routes:** Configuration, Discovery Settings všetky tabs, Recovery Actions všetky tabs, Identity Access hlavné sections.

**Acceptance criteria:**
- [ ] Jeden vertical scroll owner na contained workspaces.
- [ ] PageHeader a primary surface outer X/Y sú stabilné.
- [ ] Switching tabs/sections nevytvára horizontálne poskočenie z browser scrollbar width.
- [ ] No clipping pri `1366x768`.

**Dependencies:** Tasks 20–31.

**Estimated scope:** M.

## Checkpoint D — Workspace archetype complete

- [ ] Settings/Workspace routes používajú shared outer contract.
- [ ] Identity list sections majú rovnaký table geometry contract.
- [ ] Non-table Identity sections sú bez regresie.

---

# Phase 5 — Builders, details and topology

## Task 33: Normalize Recovery Group create/edit page state boundaries

**Acceptance criteria:**
- [ ] Create aj edit používajú rovnaký PageFrame/PageBody boundary.
- [ ] Load error/not-found neodstráni PageHeader ani primary builder surface boundary.
- [ ] Mutation alert sa renderuje vnútri builder workspace boundary.
- [ ] Existing contained route metadata zostáva.

**Verification:**
- [ ] `RecoveryGroupBuilderPage.test.tsx`.
- [ ] `RecoveryGroupEditorPage.test.tsx`.

**Dependencies:** Checkpoint B.

**Files likely touched:** 4 page source+test files.

**Estimated scope:** M.

## Task 34: Normalize Recovery Application create/edit page state boundaries

**Acceptance criteria:** rovnaký contract ako Task 33; file-name disable, submit/orchestrator success a unsaved guard sa nemenia.

**Verification:**
- [ ] `RecoveryApplicationBuilderPage.test.tsx`.
- [ ] `RecoveryApplicationEditorPage.test.tsx`.

**Dependencies:** Checkpoint B.

**Files likely touched:** 4 page source+test files.

**Estimated scope:** M.

## Task 35: Standardize builder primary surface and wizard sidebar width

**Description:** Obe builder implementations majú rovnaký shell koncept, ale 240px vs 280px wizard width. Pred zmenou zmerať najdlhšie lokalizované step labels a zvoliť najmenšiu spoločnú šírku, ktorá neclipuje ani jeden builder. Nevyberať nový rozmer náhodne.

**Acceptance criteria:**
- [ ] Group aj Application builder používajú rovnaký primary surface radius/border/shadow.
- [ ] Wizard sidebar desktop width je rovnaký a zdokumentovaný testom/class contractom.
- [ ] Width voľba je odvodená z browser overenia oboch builders, nie z kompromisného čísla bez dôkazu.
- [ ] Step-specific inner scroll ownership zostáva zachovaný.

**Verification:**
- [ ] `RecoveryGroupBuilder.test.tsx`.
- [ ] `RecoveryAppBuilder.test.tsx`.
- [ ] Browser check v SK/EN, ak step labels majú rôznu dĺžku.

**Dependencies:** Tasks 33–34.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** M.

## Task 36: Normalize Provider Detail success/error/not-found geometry

**Acceptance criteria:**
- [ ] Success/error/not-found používajú rovnaký PageHeader/PageBody outer contract.
- [ ] `p-6` special-state shift sa odstráni.
- [ ] Detail môže zostať Document/Detail archetype s prirodzeným content scrollom; nemusí sa nútene prepnúť na contained.

**Verification:**
- [ ] `ProviderDetailPage.test.tsx` pre všetky tri states.

**Dependencies:** Foundation.

**Files likely touched:**
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx`

**Estimated scope:** S.

## Task 37: Normalize Infrastructure outer page/workspace boundary

**Acceptance criteria:**
- [ ] PageHeader + source selector + topology surface používajú explicitný contained workspace chain.
- [ ] Source selector zostáva feature-specific pre-surface control.
- [ ] Topology canvas/toolbar/legend semantics sa nemenia.
- [ ] Route sa prepne na contained po potvrdení flex chainu.

**Verification:**
- [ ] `InfrastructurePage.test.tsx`.
- [ ] `InfrastructureTopologyWorkspace.test.tsx` zostane zelený.
- [ ] router contained assertion.

**Dependencies:** Foundation.

**Files likely touched:**
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.test.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** M.

## Task 38: Align Infrastructure loading skeleton with final workspace geometry

**Acceptance criteria:**
- [ ] Skeleton používa rovnaký primary surface boundary ako loaded topology.
- [ ] Hardcoded `min-h-[620px]`/`min-h-[430px]` sa zachová iba ak browser dôkaz ukáže, že je to semantický minimum; inak sa nahradí flex-fill contractom.
- [ ] Toolbar/legend skeleton positions zodpovedajú loaded workspace slots.

**Verification:**
- [ ] `InfrastructureTopologySkeleton.test.tsx`.
- [ ] Browser loading-to-loaded transition bez výrazného geometry jumpu.

**Dependencies:** Task 37.

**Files likely touched:**
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton.test.tsx`

**Estimated scope:** S.

## Task 39: Builder/detail/topology browser checkpoint

**Routes:** Group create/edit, Application create/edit, Provider Detail success/error if reproducible, Infrastructure all provider types.

**Viewporty:** `1542x765`, `1366x768`, `1920x1080`, mobile smoke.

**Acceptance criteria:**
- [ ] Builder action footer ostáva dostupný.
- [ ] Inner lists/canvas vlastnia scroll, nie AppShell main.
- [ ] Error/loading transitions nemenia outer frame.
- [ ] Infrastructure loading->loaded nepreskočí na iný outer surface size.

**Dependencies:** Tasks 33–38.

**Estimated scope:** M.

---

# Phase 6 — Loading fallbacks, compatibility cleanup and final verification

## Task 40: Introduce archetype-aware `RouteLoadingSkeleton`

**Description:** Nahradiť one-size-fits-all table fallback variantami bez vytvorenia separátneho skeleton komponentu pre každú page.

**Minimálne varianty:**
- `table`,
- `workspace`,
- `builder`,
- `detail/document` iba ak je skutočne potrebný.

**Acceptance criteria:**
- [ ] Varianty používajú PageFrame/PageBody/PageSurface geometry.
- [ ] Table fallback obsahuje toolbar/content/footer proportions.
- [ ] Builder fallback obsahuje wizard/sidebar + content + footer proportions.
- [ ] Workspace fallback nereprezentuje neexistujúcu tabuľku.

**Verification:**
- [ ] `RouteLoadingSkeleton.test.tsx` pre každý variant.

**Dependencies:** Checkpoints C–D a builder migration.

**Files likely touched:**
- `src/shared/components/page/RouteLoadingSkeleton.tsx`
- `src/shared/components/page/RouteLoadingSkeleton.test.tsx`

**Estimated scope:** M.

## Task 41: Wire route fallbacks to correct archetype

**Acceptance criteria:**
- [ ] Table routes používajú table fallback.
- [ ] Settings/Identity/Recovery Actions používajú workspace fallback.
- [ ] Group/Application create/edit používajú builder fallback.
- [ ] Infrastructure si ponechá vlastný topology skeleton.

**Verification:**
- [ ] `router.test.tsx` alebo dedicated route-fallback assertions.
- [ ] Browser slow-load smoke aspoň pre table/workspace/builder.

**Dependencies:** Task 40.

**Files likely touched:**
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** S–M.

## Task 42: Remove or reduce obsolete layout wrappers only after reference check

**Description:** Po migrácii spraviť impact/reference check pre `InventoryShell`, `ResourceViewportFrame` a lokálne duplicate table wrappers. Odstrániť iba skutočne nepoužívané abstractions.

**Acceptance criteria:**
- [ ] Žiadny wrapper sa nemaže len preto, že nový primitive existuje.
- [ ] Delete iba pri 0 produkčných references alebo po explicitnej compatibility replacement.
- [ ] Žiadna feature behavior zmena.

**Verification:**
- [ ] symbol/reference search pred delete.
- [ ] focused tests podľa dotknutých references.

**Dependencies:** Tasks 12–41.

**Files likely touched:** určia sa až reference checkom; task sa musí rozdeliť, ak by presiahol 5 files.

**Estimated scope:** S–M.

## Task 43: Final cross-cutting automated verification

**Description:** Keďže refactor zasiahne shared layout primitives a väčšinu route archetypov, finálny checkpoint je cross-cutting a oprávňuje širšiu verification než jednotlivé tasky.

**Acceptance criteria:**
- [ ] Všetky focused suites z migračných taskov sú zelené.
- [ ] Full `npm test` alebo ekvivalentný complete Vitest run prejde.
- [ ] `npm run typecheck` prejde.
- [ ] `npm run lint` prejde bez nových warningov/errors.
- [ ] `npm run build` prejde, pretože shared route/layout zmena je cross-cutting.
- [ ] `git diff --check` prejde.

**Dependencies:** Task 42.

**Files likely touched:** None; iba regression fixes, ktoré musia byť task-scoped a vysvetlené.

**Estimated scope:** M verification.

## Task 44: Final browser regression matrix

**Representative routes:**

Table:
- Providers,
- Recovery Groups,
- Recovery Policies,
- Recovery Runs.

Inventory:
- Resources,
- Resources ISE.

Workspace:
- Discovery Settings,
- Configuration,
- Recovery Actions,
- Identity Access.

Builder/detail/topology:
- Group Builder,
- Application Builder,
- Provider Detail,
- Infrastructure.

**Acceptance criteria:**
- [ ] Same archetype => same outer body/surface inset.
- [ ] No unexpected page horizontal shift pri vertical scrollbar appearance.
- [ ] Table pagination anchor stabilný.
- [ ] No nested desktop vertical scrollbar for same content path.
- [ ] Loading/error/empty preserve primary surface boundary.
- [ ] Mobile natural scroll remains usable.
- [ ] Browser console bez nových warnings/errors.

**Dependencies:** Task 43.

**Estimated scope:** L verification, ale bez source implementácie; ak odhalí regresiu, každá oprava sa otvorí ako samostatný S/M task.

## Checkpoint E — Complete

- [ ] Všetkých 26 route-level pages je klasifikovaných a vedome používa jeden archetype contract.
- [ ] Table/list pages používajú fixed primary surface + fixed pagination contract.
- [ ] Resources zachováva všetky feature-specific controls a používa shared geometry.
- [ ] Workspace pages majú jeden explicitný scroll owner.
- [ ] Builders majú zjednotenú outer geometry a rovnakú sidebar-width policy.
- [ ] Detail/error/loading states nemenia náhodne body inset.
- [ ] Route-loading fallback zodpovedá cieľovému archetypu.
- [ ] Shared wrappers sú vyčistené iba tam, kde sú skutočne obsolete.

---

# Verification strategy

## Per-task verification

Každý implementačný task musí použiť najmenší focused scope, ktorý dokazuje danú zmenu:

```text
npm exec vitest run <affected-test-files>
npm exec -- eslint <changed-ts-tsx-files> --max-warnings=0
git diff --check
```

`npm run typecheck` sa pridáva pri shared primitive, route contract alebo type-level zmene.

## Checkpoint verification

Po Pilot/Table/Workspace/Builder checkpointoch sa vykoná browser verification. JSDOM class assertions nie sú dôkaz reálneho overflowu.

## Final verification

Pretože výsledná zmena je cross-cutting, na konci sa vykoná full tests + typecheck + lint + build.

# Browser measurement protocol

Pri každom browser checku zaznamenať pre relevantné DOM boundaries:

- `clientWidth`, `scrollWidth`,
- `clientHeight`, `scrollHeight`,
- computed `overflow-x`, `overflow-y`,
- top/left/width/height primary PageSurface,
- top/left/width/height table viewport,
- top/height pagination,
- prítomnosť browser/main/table scrollbarov.

Dôležité nie je absolútne pixelové číslo medzi odlišnými archetypmi, ale invariant:

- rovnaký archetyp a rovnaká slot topology => rovnaký geometry contract,
- rozdiel smie vzniknúť iba z viditeľného funkčného slotu (metrics/tabs/notice), nie z accidental wrapper/padding.

# Test-data scenarios

Pre table components mať automated coverage minimálne pre:

- loading,
- fatal load error bez cached data,
- cached-data refresh error,
- empty success,
- 1 row,
- page-size/full page rows,
- overflowing rows,
- mutation alert, ak feature podporuje mutation.

Rows sa nesmú stretchovať do voľného priestoru; voľný priestor patrí content viewportu.

# Rollback strategy

Refactor sa musí implementovať po checkpointoch a atomických commits. Ak browser gate zlyhá:

1. nerevertovať celý program,
2. revertovať alebo opraviť iba posledný archetype slice,
3. shared primitive contract meniť iba ak problém reprodukujú minimálne dva nezávislé pilot pages,
4. nepoužiť page-specific `max-height` workaround na obídenie shared contractu.

# Parallelization

## Bezpečne paralelizovateľné po Checkpoint B

- Providers / Platform Providers / Credentials / Recovery Applications / Policy Sets / Recovery Runs migrations,
- Configuration / Discovery Settings / Recovery Actions migrations,
- Identity section pairs po dokončení Identity outer frame,
- Provider Detail môže bežať nezávisle od builder migration.

## Musí byť sekvenčné

- Foundation primitives pred pilotom,
- pilot pred masovou migráciou,
- route contained switch až po pripravenom vnútornom layout contracte danej dávky,
- Identity outer frame pred section migrations,
- loading fallback wiring až po stabilizovaní archetypov,
- cleanup wrappers až po reference checku.

## Coordination hazard

`src/app/AppRoutes.tsx` je shared hot file. Paralelné agents by ho nemali editovať súčasne. Route metadata/fallback wiring má mať jedného vlastníka alebo byť vykonané sekvenčne.

# Risks and mitigations

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Global layout primitive rozbije veľa pages naraz | High | Najprv nové primitives bez adopcie; pilot; compatibility wrappers; žiadny big-bang shared wrapper rewrite |
| Contained route začne clipovať obsah | High | Handle pridať až po feature flex-chain migrácii; browser gate na krátkom desktope |
| Pagination sa znovu odsekne | High | TableSurface fixed footer + `min-h-0` chain + browser overflow dataset |
| Nested vertical scroll | High | Jeden explicitný scroll owner; computed overflow meranie |
| Browser scrollbar spôsobí horizontal jump | Medium | `scrollbar-gutter: stable` na table/workspace viewportoch, kde je relevantný |
| Empty/error state zmení celý page layout | High | Request states renderovať v primary surface; regression tests |
| Resources stratí provider-specific controls | High | Nezasahovať do hooks/query/filter tabs/drawer; Resources compatibility task je layout-only |
| Identity refactor sa zmení na funkčný redesign | High | Outer frame first; table sections po dvojiciach; non-table sections verification-only |
| Builder inner scroll sa rozbije pri zjednotení sidebaru | High | Existujúci contained builder plan je baseline; browser test selected/available panes |
| Shared radius zmení nested semantic cards | Medium | `rounded-[20px]` iba primary PageSurface; nested cards out of scope |
| Route fallback wiring vytvorí veľký merge konflikt | Medium | Jeden route owner, samostatný late-phase task |
| Unrelated generated/OpenAPI zmeny sa dostanú do commitov | High | Explicit path staging; pred každým commitom `git diff --cached --name-status` |

# Current working-tree safety note

Pri vytvorení tohto plánu sú na vetve `test` už existujúce nezávislé modified files:

- `openapi/abco-api.json`
- `src/generated/api/models/orchestrationProvider.gen.ts`
- `src/generated/api/models/orchestrationProviderRecord.gen.ts`
- `src/generated/api/models/providerType.gen.ts`
- `src/generated/api/zod.gen.ts`

Tieto súbory nie sú súčasťou page-layout refaktoru. Žiadny task z tohto plánu ich nesmie stage-nuť, meniť, resetovať ani zahrnúť do commitu.

# Estimated program size

Toto je veľká cross-cutting zmena.

Odhad:

- približne 30–45 hodín focused implementation + verification práce,
- približne 12–20 atomických implementačných commitov,
- 5 hlavných browser/checkpoint gates,
- source scope potenciálne desiatky files, ale každý jednotlivý task ostáva S/M a typicky <= 5 files.

Odhad nezahŕňa nové produktové požiadavky ani API/backend zmeny odhalené počas implementácie.

# Open questions / decision gates

1. **Builder sidebar width:** nevyberať 240/260/280 bez browser evidence. Task 35 vyberie jednu spoločnú hodnotu podľa najdlhšieho reálneho step labelu.
2. **Metrics slot:** nepridávať neviditeľný spacer len kvôli identickému Y medzi stavmi, kde metrics semanticky neexistujú. Ak reviewer požaduje absolútne identický surface Y aj pri fatal provider error, je to samostatné produktové rozhodnutie.
3. **Primary surface flattening:** cieľový contract predpokladá jeden primary PageSurface a odstraňuje accidental nested primary cards. Nested semantic cards zostávajú. Pilot browser gate musí potvrdiť, že výsledok zodpovedá očakávanej vizuálnej hierarchii pred masovou migráciou.

# Definition of Done

- [ ] Každý implementačný task má focused acceptance criteria a verification.
- [ ] Žiadny task nie je XL; task s >5 nezávislými source files sa rozdelí.
- [ ] Pilot bol schválený pred masovou migráciou.
- [ ] Same-archetype pages používajú rovnaký PageFrame/PageBody/PageSurface contract.
- [ ] Table rows count nemení primary surface height ani pagination Y.
- [ ] Loading/error/empty nemenia outer primary surface boundary.
- [ ] Desktop contained pages majú jedného explicitného vertical scroll ownera.
- [ ] Mobilný natural scroll zostáva funkčný.
- [ ] Typografia, farby, feature logic, API calls, filters a query semantics zostali zachované.
- [ ] Focused tests + checkpoint browser verification prešli počas migrácie.
- [ ] Finálne full tests, lint, typecheck, build a `git diff --check` prešli.
- [ ] Každý commit je atomický a neobsahuje pre-existing OpenAPI/generated zmeny.
