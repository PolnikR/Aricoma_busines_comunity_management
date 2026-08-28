# Implementačný plán: scroll containment pre Recovery Application a Recovery Group

## 1. Cieľ

Zabezpečiť jednotný full-height flex kontrakt na create aj edit obrazovkách dvoch
wizardov:

- Recovery Application,
- Recovery Group.

Dlhý zoznam dostupných Recovery Groups alebo virtuálnych strojov musí scrollovať
vo vlastnom resource paneli. Nesmie zväčšovať celý wizard podľa obsahu ani prenášať
scroll na AppShell `main`. Mobilný layout má naďalej používať prirodzený page scroll.

Tento dokument je iba plán. Produkčný kód sa v tejto fáze nemení.

## 2. Revidovaný root cause

### Čo bolo nesprávne v prvej oprave

Commit `4346efe` pridal `lg:overflow-hidden` na page root Recovery Group create/edit
stránok a testoval iba prítomnosť tejto triedy. Browser screenshot po oprave
potvrdil, že výsledný layout sa nezmenil.

`overflow-hidden` určuje správanie už existujúceho overflow, ale samo nevytvorí
definitívnu zvyšnú výšku pre builder. Recovery Group builder preto stále rastie
podľa min-content výšky dlhého resource zoznamu.

### Fungujúci referenčný tok

Recovery Application create aj edit stránka už medzi `PageHeader` a
`RecoveryAppBuilder` obsahuje:

```tsx
<div className="flex flex-1 flex-col lg:min-h-0">
```

Konkrétne:

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`,
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`.

Tento kontajner je flex item page rootu, zoberie zostávajúcu výšku pod headerom a
`lg:min-h-0` mu dovolí zmenšiť sa pod min-content výšku vnoreného zoznamu. Až potom
má `overflow-y-auto` v `ResourceSidebar` definovaný priestor, ktorý môže pretekať.

### Chýbajúci článok v Recovery Group

Recovery Group create aj edit stránka renderuje `RecoveryGroupBuilder` priamo pod
header/error obsah bez rovnakého `flex-1 lg:min-h-0` body kontajnera. Samotný builder
začína `fieldset.contents`; jeho vnorené `flex-1` vrstvy preto nedostanú spoľahlivo
obmedzenú zvyšnú výšku.

Výškový kontrakt má byť:

```text
AppShell main / Outlet wrapper
└── page root: flex column, desktop full height
    ├── PageHeader: prirodzená výška
    └── builder body: flex-1 + lg:min-h-0
        └── Recovery App/Group builder
            └── resource step
                └── ResourceSidebar overflow-y-auto
```

## 3. Rozhodnutia a hranice

1. **Recovery Application je referenčná implementácia.** Produkčné create/edit
   stránky sa nemenia, pokiaľ test alebo browser neodhalí reálnu odchýlku.
2. **Recovery Group prevezme rovnaký body wrapper.** Create aj edit použijú presne
   `flex flex-1 flex-col lg:min-h-0` okolo alert/load-error/builder oblasti.
3. **Neúčinná prvá oprava sa odstráni.** `lg:overflow-hidden` sa odstráni z oboch
   Recovery Group page rootov a pôvodné root-class testy sa nahradia testami
   skutočného builder body rodiča.
4. **Bez novej shared abstrakcie.** Štyri page komponenty sú malé a existujúci
   Recovery Application pattern je zrozumiteľný. Nový PageShell komponent by bol
   nad rámec opravy.
5. **Globálne vrstvy sú mimo scope.** Nemenia sa `AppShell`, Outlet
   `lg:min-h-min`, `ResourceSidebar`, oba builder komponenty ani resource fetch.
6. **Desktop a mobil majú odlišný kontrakt.** `lg:min-h-0` obmedzuje desktop;
   mobil si ponechá prirodzenú výšku a page scroll.
7. **jsdom netestuje layout engine.** Unit testy chránia štruktúru flex reťazca;
   skutočný scrollbar musí potvrdiť browser na všetkých štyroch routes.
8. **Recovery Application `min-h-[480px]` ostáva.** Je to existujúca minimálna
   použiteľná výška tiers kroku, nie príčina chýbajúceho Group resource scrollbaru.

## 4. Závislostný graf

```text
Task 1: kontrakt testy App + Group
                 │
         ┌───────┴───────┐
         v               v
Task 2: Group create   Task 3: Group edit
         └───────┬───────┘
                 v
Task 4: browser matica všetkých 4 routes
                 │
                 v
Task 5: focused verification + cleanup + commit
```

Tasks 2 a 3 sú implementačne nezávislé po definovaní testov, ale vzhľadom na malý
scope sa majú vykonať sekvenčne, aby každý red/green krok zostal jednoznačný.

## 5. Implementačné úlohy

### Task 1: Zakotviť page-to-builder containment kontrakt testami

**Popis:** Nahradiť neúčinné Recovery Group page-root assertions testami rodiča
buildera a doplniť rovnaké charakterizačné assertions pre existujúce Recovery
Application create/edit stránky.

**Acceptance criteria:**

- [ ] Recovery Application create/edit testy potvrdia, že priamy rodič mocknutého
  buildera má `flex`, `flex-1`, `flex-col` a `lg:min-h-0`.
- [ ] Recovery Group create/edit testy požadujú rovnaký kontrakt a pred produkčnou
  zmenou zlyhajú iba na jeho absencii.
- [ ] Pôvodné assertions na page-root `lg:overflow-hidden` sú odstránené.

**Verification:**

- [ ] Spustiť štyri page testy a zaznamenať očakávaný stav: Application testy green,
  Group nové containment testy red.
- [ ] Overiť, že sa nemenia existujúce submit, loading, error a navigation assertions.

**Dependencies:** žiadne

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Estimated scope:** M, 4 test files

### Task 2: Opraviť Recovery Group create page

**Popis:** Obaliť create page alert/load-error/builder oblasť rovnakým body
kontajnerom ako v Recovery Application create page a odstrániť neúčinný
page-root overflow workaround.

**Acceptance criteria:**

- [ ] Pod `PageHeader` existuje `flex flex-1 flex-col lg:min-h-0` body kontajner.
- [ ] Lokálny submit error, load-error retry stav aj `RecoveryGroupBuilder` zostanú
  vo vizuálne rovnakom poradí a builder dostane zostávajúcu výšku.
- [ ] Page root už neobsahuje neúčinné `lg:overflow-hidden`.

**Verification:**

- [ ] Recovery Group create page test prejde z red do green.
- [ ] Všetky existujúce create page testy zostanú zelené.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`

**Estimated scope:** S, 2 files

### Task 3: Opraviť Recovery Group edit page

**Popis:** Použiť rovnaký builder body kontajner na edit stránke a odstrániť
neúčinný page-root overflow workaround.

**Acceptance criteria:**

- [ ] Edit error alert aj `RecoveryGroupBuilder` sú vo
  `flex flex-1 flex-col lg:min-h-0` kontajneri.
- [ ] Loading, not-found, submit a orchestration modal správanie sa nemení.
- [ ] Create a edit stránky majú rovnaký page-to-builder flex kontrakt.

**Verification:**

- [ ] Recovery Group edit page test prejde z red do green.
- [ ] Všetky existujúce edit page testy zostanú zelené.

**Dependencies:** Task 1; vykonať po Task 2 pre jednoduchší review

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Estimated scope:** S, 2 files

### Checkpoint A: Jednotný štrukturálny kontrakt

- [ ] Všetky štyri page testy prešli.
- [ ] Recovery Application produkčné súbory nemajú diff.
- [ ] Recovery Group create/edit majú rovnaký body wrapper ako Application stránky.
- [ ] `AppShell`, builder komponenty a `ResourceSidebar` nemajú diff.
- [ ] Nezostal test ani produkčná trieda z neúčinného page-root overflow pokusu.

### Task 4: Browser verification na všetkých štyroch routes

**Popis:** Overiť reálny layout, pretože jsdom nevie preukázať vznik scrollbaru.
Použiť dlhé dátové zoznamy a porovnať vlastníka scrollu pred/po.

**Acceptance criteria:**

- [ ] Recovery Application create aj edit: dlhý available Recovery Groups zoznam
  scrolluje interne a tiers canvas ostáva výškovo zarovnaný.
- [ ] Recovery Group create aj edit: dlhý available VMs zoznam scrolluje interne a
  selected resources panel ostáva výškovo zarovnaný.
- [ ] Scrollovanie vnoreného zoznamu neposúva PageHeader, wizard steps ani action bar.

**Verification:**

- [ ] Normálny desktop viewport, napríklad 1440×900, pre všetky štyri routes.
- [ ] Krátky desktop viewport, napríklad 1440×700, na kontrolu AppShell fallback
  scrollu a dostupnosti action baru.
- [ ] Mobilný viewport, napríklad 390×844, na potvrdenie prirodzeného page scrollu.
- [ ] DevTools: vnorená scroll oblasť má `scrollHeight > clientHeight`, rodič builder
  body má obmedzenú computed výšku a AppShell nie je vlastníkom dlhého resource
  scrollu pri normálnom desktop viewport-e.
- [ ] Screenshot create/edit oboch domén a konzola bez nových errorov/warningov.

**Dependencies:** Tasks 2–3

**Files likely touched:** žiadne

**Estimated scope:** S, manuálne/browser overenie

### Task 5: Cleanup, focused verification a atomický commit

**Popis:** Overiť priamo dotknutý scope, skontrolovať nulový globálny diff a
commitnúť korekciu prvej neúčinnej opravy spolu s regresnými testami.

**Acceptance criteria:**

- [ ] Focused testy, lint, typecheck a diff check prejdú.
- [ ] Stage obsahuje iba štyri page testy a dve Recovery Group produkčné stránky.
- [ ] Výsledný commit explicitne popisuje opravu chýbajúceho builder containment.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`
- [ ] Focused ESLint nad šiestimi zmenenými `.tsx` súbormi.
- [ ] `npm run typecheck`.
- [ ] `git diff --check`.
- [ ] `git diff -- src/layouts/app-shell/AppShell.tsx src/shared/components/resource-sidebar/ResourceSidebar.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` je prázdny.
- [ ] Plný suite/build sa nespúšťa, pokiaľ focused kontroly neodhalia širší dopad;
  ide o izolovaný page-layout kontrakt.
- [ ] Commit napríklad `fix: constrain recovery builder scroll regions`.

**Dependencies:** Task 4

**Files likely touched:** žiadne ďalšie

**Estimated scope:** S

## 6. Cleanup scope

Odstrániť:

- `lg:overflow-hidden` pridané commitom `4346efe` z Recovery Group create/edit rootov,
- dva testy, ktoré overujú iba túto neúčinnú page-root triedu.

Zachovať bez zmien:

- AppShell `lg:overflow-auto` a Outlet `lg:min-h-min`,
- `ResourceSidebar` interné `overflow-y-auto`,
- Recovery Application body wrappers a `min-h-[480px]` tiers krok,
- oba builder komponenty, loading skeletony, fetch, drag-and-drop a action bary.

## 7. Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Wrapper test prejde, ale browser scrollbar nevznikne | vysoký | Task 4 je povinný acceptance gate; bez browser merania sa zmena nehlási ako dokončená. |
| Alert alebo load-error zaberie nesprávnu výšku | stredný | Umiestniť ich do body wrappera podľa Recovery Application patternu a zachovať existujúce behavior testy. |
| Recovery Application sa nechtiac zmení | vysoký | Produkčné Application files majú mať nulový diff; pridávajú sa iba contract testy. |
| Krátky viewport potrebuje AppShell scroll | stredný | Overiť samostatne 1440×700; globálny AppShell fix sa nemení. |
| Mobilný obsah sa oreže | stredný | Použiť iba `lg:min-h-0`; mobilná browser kontrola je povinná. |
| Nová shared abstrakcia skryje jednoduchý kontrakt | nízky | Nevytvárať nový komponent; použiť existujúci explicitný pattern. |

## 8. Finálne acceptance criteria

- Recovery Application create/edit explicitne testujú a zachovávajú existujúci
  builder body containment.
- Recovery Group create/edit používajú rovnaký `flex flex-1 flex-col lg:min-h-0`
  kontrakt.
- Dlhé available resource zoznamy scrollujú interne na všetkých štyroch routes pri
  normálnom desktop viewport-e.
- PageHeader, wizard navigation, selected panel a action bar zostanú stabilné.
- Krátky desktop a mobilný layout ostanú použiteľné podľa svojho scroll kontraktu.
- Neúčinný `lg:overflow-hidden` workaround a jeho testy sú odstránené.
- AppShell, ResourceSidebar, builder komponenty, dátové toky a skeletony sa nemenia.
- Focused testy, lint, typecheck, diff check a browser matica prejdú.
- Korekcia je v jednom atomickom commite bez nesúvisiacich zmien.

## 9. Odhad

**Nízka až stredná náročnosť: 3–5 hodín.** Produkčná zmena je malá; väčšina práce je
TDD kontrakt pre štyri stránky a povinné browser overenie create/edit v oboch
doménach a troch viewport režimoch.
