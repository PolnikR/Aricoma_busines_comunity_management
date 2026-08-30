# Implementačný plán v2: izolovaný scroll pre Recovery builder panely

## Prehľad

Na desktopoch (`lg+`) má byť scrollbar pri Recovery builderoch vlastníctvom
vnorených panelov, nie celého `AppShell` obsahu:

- zoznam dostupných Resources/VMs,
- zoznam vybraných položiek v selected/drag-and-drop zóne.

`PageHeader`, wizard navigácia a action bar majú zostať stabilné. Na mobile sa
zachová prirodzený page scroll. Plán sa týka create/edit builder routes pre
Recovery Group aj Recovery Application, pretože obe používajú rovnaký shell a
vnorené resource/drop komponenty; tabuľkové/list routes zostanú v existujúcom
globálnom režime.

Tento dokument je plán. Implementácia sa začne až po jeho schválení.

## Aktuálny stav a potvrdený root cause

- `src/layouts/app-shell/AppShell.tsx` má na `main` `lg:overflow-auto` a na
  Outlet wrapperi `lg:min-h-min`. Tým môže min-content výška dlhého buildera
  preniknúť až do hlavného scroll kontajnera.
- `RecoveryGroupBuilderPage` a `RecoveryGroupEditorPage` už po commite
  `d35ed22` obsahujú body wrapper `flex flex-1 flex-col lg:min-h-0`, ale samotný
  wrapper nedokáže vypnúť overflow nadradeného `main`.
- `RecoveryGroupBuilder` už pri Resources kroku používa `overflow-hidden` na
  builder content a `RecoveryGroupResourcesStep` má `h-full min-h-0`.
- `ResourceSidebar` má interný `min-h-0 flex-1 overflow-y-auto` scroll region.
- `ResourceSelectionCard` má interný `min-h-0 flex-1 overflow-y-auto` zoznam;
  jeho selected/drop panel však potrebuje definitívnu výšku od rodičovského
  builder layoutu.
- `RecoveryAppBuilder` má rovnaký shell kontrakt; v tiers kroku treba osobitne
  overiť min-height grid položiek, aby scroll vlastnil available-groups panel a
  tier canvas, nie celý page.
- Predchádzajúca oprava iba s page-root `lg:overflow-hidden` bola screenshotom
  vyvrátená. Tento plán ju neopakuje.

## Rozsah a explicitné hranice

### V rozsahu

- route-scoped shell režim pre štyri create/edit builder routes:
  - `/recovery-plans/recovery-groups/create`,
  - `/recovery-plans/recovery-groups/:id/edit`,
  - `/recovery-plans/recovery-applications/create`,
  - `/recovery-plans/recovery-applications/:id/edit`,
- desktopové prepnutie `main` na `overflow-hidden` iba v tomto režime,
- desktopové prepnutie Outlet wrappera na `min-h-0` iba v tomto režime,
- zachovanie existujúcich interných scroll oblastí a doplnenie iba chýbajúcich
  `min-h-0`/flex väzieb potvrdených testom alebo browser diagnostikou,
- testy route metadata, shell tried a resource/drop scroll kontraktu,
- browser overenie normálneho, krátkeho desktopu a mobilu.

### Mimo rozsahu

- globálny návrat `AppShell` na `lg:overflow-hidden` pre všetky obrazovky,
- odstránenie `lg:overflow-auto`/`lg:min-h-min` z defaultného režimu ostatných
  routes,
- zmena API, fetchovania, cache, skeletonov alebo drag-and-drop eventov,
- pevné viewportové `max-height` hacky,
- zmena verejného API `ResourceSidebar` alebo `ResourceSelectionCard`, pokiaľ
  browser/test nepotvrdí skutočný deficit ich markup kontraktu.

## Architektonické rozhodnutie

### Odporúčaný variant: route handle `contentScroll: 'contained'`

Označiť builder routes metadátom v `AppRoutes.tsx`. `AppShell` ho prečíta cez
`useMatches()` a podľa neho zvolí triedy:

```text
default route:
  main          lg:overflow-auto
  Outlet parent lg:min-h-min

contained builder route:
  main          lg:overflow-hidden
  Outlet parent lg:min-h-0
```

Mobilné triedy sa nemenia. Ostatné obrazovky si ponechajú short-window fallback
scroll, ktorý bol zavedený predchádzajúcim shell fixom.

### Zvážené a odmietnuté varianty

1. **Globálne prepnúť AppShell na `overflow-hidden`/`min-h-0`:** jednoduché,
   ale reintrodukuje problém s nedostupným obsahom tabuliek v krátkych oknách.
2. **Rozhodovať podľa URL stringu v AppShell:** funguje, ale shell by poznal
   konkrétne feature cesty a pri ďalšom route refaktore by sa ľahko rozbil.
3. **CSS `:has()` alebo side-effect trieda na `body`:** obchádza route model,
   no zhoršuje testovateľnosť a vytvára implicitnú väzbu medzi DOM a shellom.

Route handle je odporúčaný, lebo zachováva defaultné správanie, nepoužíva
hardcoded URL matching a explicitne dokumentuje vlastníka scroll režimu v route
definícii.

## Závislostný graf

```text
Task 1: route-handle + shell kontrakt testy
                 │
                 v
Task 2: AppShell contained režim + metadata v AppRoutes
                 │
       ┌─────────┴─────────┐
       v                   v
Task 3: Recovery Group  Task 4: Recovery Application
        panel kontrakt       panel kontrakt
       └─────────┬─────────┘
                 v
Task 5: browser matrix desktop/short desktop/mobile
                 │
                 v
Task 6: focused verification, cleanup, atomic commit
```

## Implementačné úlohy

### Task 1: Zakotviť route a scroll-mode kontrakt testami

**Popis:** Pridať testy pred produkčnou zmenou, ktoré rozlíšia contained builder
routes od defaultných routes. Test nesmie predstierať meranie layoutu v jsdom;
má overiť route metadata a výsledné triedy na shell prvkoch.

**Acceptance criteria:**

- [ ] Všetky štyri create/edit builder routes majú explicitné handle metadáta.
- [ ] Recovery list route a reprezentatívna ne-builder route handle nemajú.
- [ ] Testovací helper vie vytvoriť data router s contained aj default matchom.
- [ ] Contained režim očakáva `lg:overflow-hidden` na `main` a `lg:min-h-0` na
      Outlet wrapperi; default očakáva existujúce `lg:overflow-auto` a
      `lg:min-h-min`.

**Verification:**

- [ ] Nové testy najprv zlyhajú na chýbajúcom handle alebo shell prepnutí.
- [ ] Existujúce router/page behavior testy sa nemenia.

**Dependencies:** None

**Files likely touched:**

- `src/layouts/app-shell/AppShell.test.tsx` (nový test)
- `src/app/router.test.tsx`

**Estimated scope:** M, 2 test files

### Task 2: Implementovať route-scoped AppShell containment

**Popis:** AppShell prečíta route handle cez `useMatches()` a podmienečne prepne
desktopový overflow/min-height režim. Do `AppRoutes.tsx` sa pridá handle na štyri
builder routes. Defaultný režim pre všetky ostatné obrazovky ostane nezmenený.

**Acceptance criteria:**

- [ ] `main` je pri contained route `lg:overflow-hidden` a pri default route
      `lg:overflow-auto`.
- [ ] Outlet parent je pri contained route `lg:min-h-0` a pri default route
      `lg:min-h-min`.
- [ ] `AppHeader`, mobilný overflow a globálny layout spacing sa nemenia.
- [ ] Shell neobsahuje hardcoded Recovery URL string matching.

**Verification:**

- [ ] AppShell route-mode test prejde pre contained aj default match.
- [ ] Router test overí handle na create aj edit route Recovery Group/Application.
- [ ] `git diff` neobsahuje zmeny feature fetchovania ani tabuliek.

**Dependencies:** Task 1

**Files likely touched:**

- `src/layouts/app-shell/AppShell.tsx`
- `src/layouts/app-shell/AppShell.test.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** M, 4 files

### Task 3: Uzavrieť Recovery Group Resources a selected/drop panely

**Popis:** Po shell prepnutí overiť a podľa computed DOM kontraktu doplniť iba
chýbajúce `min-h-0`, `flex-1` alebo `overflow-hidden` väzby v Group builderi.
Existing `ResourceSidebar` a `ResourceSelectionCard` scroll regions zostávajú
vnútornými vlastníkmi scrollu.

**Acceptance criteria:**

- [ ] Builder body, grid, desktop columns a content region tvoria súvislý
      `flex-1`/`min-h-0` reťazec.
- [ ] Available VM/volume sidebar má vlastnú obmedzenú výšku a
      `overflow-y-auto`.
- [ ] Selected/drag-and-drop panel má obmedzenú výšku a jeho item list má
      `overflow-y-auto`; drop event a remove akcie sa nemenia.
- [ ] Create aj edit používajú rovnaký kontrakt; alert, loading a action bar
      ostávajú v pôvodnom poradí.

**Verification:**

- [ ] Aktualizovať alebo doplniť triedové testy v Group builder/resource testoch.
- [ ] Focused Group page, builder, resources-step a shared resource-selection
      testy prejdú.
- [ ] Browser diagnostika potvrdí, že pri dlhom zozname má sidebar aj selected
      list `scrollHeight > clientHeight`.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`
- `src/shared/components/resource-selection/ResourceSelectionCard.test.tsx`

**Estimated scope:** M, up to 5 files

### Task 4: Zachovať interný scroll v Recovery Application tiers/drop flow

**Popis:** Aplikačný builder musí mať rovnaký contained shell, ale jeho resource
layout je odlišný: available recovery groups sú v `ResourceSidebar` a pravý
panel obsahuje `TierCanvas` a `ResourceSelectionCard`. Overiť grid item
min-height a doplniť len nevyhnutné triedy.

**Acceptance criteria:**

- [ ] Available groups sidebar má vlastný interný scroll.
- [ ] Pravý tier canvas/selected VM list scrolluje v pravom paneli, nie na
      AppShell main.
- [ ] Tier add/edit/delete/reorder a drag-and-drop správanie ostáva nezmenené.
- [ ] Recovery Application create aj edit majú rovnaký výsledný shell kontrakt.

**Verification:**

- [ ] Existing Application page body contract testy prejdú bez produkčnej zmeny
      wrappera, ak nie je potrebná.
- [ ] Doplniť targeted builder test pre pravý grid panel a interný overflow.
- [ ] Focused Application page/builder/TierCard testy prejdú.

**Dependencies:** Task 2; môže bežať paralelne s Task 3 po schválení shell kontraktu

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Estimated scope:** M, up to 5 files

### Checkpoint A: Shell a feature panely

- [ ] Contained shell platí iba pre štyri builder routes.
- [ ] Ostatné routes zachovávajú defaultný AppShell overflow.
- [ ] Group aj Application page-to-builder flex kontrakty sú zelené.
- [ ] Shared ResourceSidebar/ResourceSelectionCard API a fetch logika sa nezmenili.
- [ ] Nie je použitý pevný viewportový `max-height`.

### Task 5: Browser verification matrix

**Popis:** jsdom nevie vypočítať reálny overflow. Použiť browser/DevTools alebo
Playwright podľa dostupnosti prostredia; bez tohto checkpointu sa interný
scrollbar nesmie označiť za potvrdene opravený.

**Routes:**

- Recovery Group create/edit,
- Recovery Application create/edit.

**Viewporty:**

- normálny desktop: `1440×900`,
- krátky desktop: `1440×700`,
- mobil: `390×844`.

**Acceptance criteria:**

- [ ] Na normálnom desktope `AppShell main` nemá dlhý resource overflow.
- [ ] Resources/available panel má pri dlhom zozname
      `scrollHeight > clientHeight` a posledná položka je dostupná.
- [ ] Selected/drag-and-drop list má pri dostatočnom počte položiek vlastný
      `scrollHeight > clientHeight`.
- [ ] Scrollovanie vnoreného zoznamu neposúva PageHeader, wizard steps ani action
      bar.
- [ ] Short desktop neoreže action bar; vnorené panely ostanú použiteľné.
- [ ] Mobil používa prirodzený page scroll a `lg:` režim sa naň neaplikuje.
- [ ] Konzola nemá nové error/warning z tejto zmeny.

**Verification evidence:**

- [ ] Screenshot každého buildera v normálnom desktope.
- [ ] DevTools záznam pre `main`, Outlet wrapper, builder body, available panel a
      selected list: `height`, `min-height`, `overflow-y`, `clientHeight`,
      `scrollHeight`.
- [ ] Záznam, že defaultná tabuľková route si zachováva svoj shell fallback.

**Dependencies:** Tasks 3–4

**Files likely touched:** žiadne; iba diagnostika/screenshots mimo produkčného diffu

**Estimated scope:** M, manuálne/browser overenie

### Task 6: Cleanup, focused verification a atomic commit

**Popis:** Dokončiť izolovanú zmenu, skontrolovať scope a commitnúť ju bez zásahu
do rozpracovaných cudzích dokumentov.

**Acceptance criteria:**

- [ ] Focused tests, lint, typecheck a diff check prejdú.
- [ ] Ak zmena zasiahne AppShell a štyri builder vetvy, spustí sa aj kompletná
      suite vzhľadom na cross-cutting shell dopad.
- [ ] Stage obsahuje iba súbory z Taskov 1–4; existujúce zmeny v
      `tasks/resources-skeleton-fit-plan.md` a nové `tasks/api-contract-hardening-force-refresh-*`
      zostanú mimo stage.
- [ ] Commit správa jasne popisuje route-scoped scroll containment.

**Verification:**

- [ ] Focused Vitest pre AppShell/router, štyri page testy, Group resources,
      Application tiers a shared selection card.
- [ ] Focused ESLint nad zmenenými TS/TSX súbormi.
- [ ] `npm run typecheck`.
- [ ] `git diff --check`.
- [ ] Staged diff review a `git status --short` po commite.

**Dependencies:** Task 5

**Files likely touched:** žiadne ďalšie

**Estimated scope:** S

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Globálne vypnutie AppShell scrollu znefunkční tabuľky v krátkom okne | vysoký | Route handle; default režim ostane `overflow-auto`/`min-h-min`. |
| Shell triedy prejdú v jsdom, ale browser scrollbar nevznikne | vysoký | Povinné DevTools meranie `scrollHeight`/`clientHeight` v Task 5. |
| `useMatches()` nebude dostupné mimo data routera | vysoký | Router test cez `createAppRouter()`/`RouterProvider` pred implementáciou. |
| Group oprava nepokryje Application tiers grid | stredný | Samostatný Task 4 a browser matrix pre všetky štyri routes. |
| Selected panel sa roztiahne podľa min-content | vysoký | Zachovať `min-h-0` na každej flex/grid vrstve; nepridávať pevný viewportový height. |
| Mobilný layout sa oreže | stredný | Containment používa iba `lg:` triedy a explicitný mobilný checkpoint. |
| Neúmyselné zahrnutie cudzích dokumentov do commitu | vysoký | Stage-nuť explicitné cesty a pred commitom kontrolovať `git diff --cached --name-status`. |

## Finálne acceptance criteria

- AppShell scrolluje v contained režime iba builder routes, nie podľa dlhého
  Resources obsahu.
- Recovery Group available Resources a selected/drop list majú vlastný interný
  scrollbar na create aj edit.
- Recovery Application available groups a tiers/selected VM panely majú rovnaký
  containment kontrakt.
- Header, wizard navigácia a action bar sa pri vnorenom scrollovaní nehýbu.
- Ostatné obrazovky si zachovajú doterajší short-window fallback.
- Mobilný page scroll zostane prirodzený.
- Fetch, cache, skeletony a drag-and-drop eventy sa nemenia.
- Focused automatické testy, lint, typecheck, diff check a browser matrix prejdú.
- Zmena je v jednom atomickom commite bez nesúvisiacich súborov.

## Odhad

**Stredná náročnosť: približne 3–6 hodín.** Samotné triedy sú malé, ale zmena
zasahuje route metadata, AppShell a dva odlišné builder layouty; najväčší čas
zaberie reálne browser meranie na štyroch routes a troch viewportoch.

## Poznámka k pracovnej kópii

Pri tvorbe plánu sú v pracovnej kópii nezávislé zmeny, ktoré sa nesmú prepísať ani
commitnúť:

- `tasks/resources-skeleton-fit-plan.md` (modified),
- `tasks/api-contract-hardening-force-refresh-plan.md` (untracked),
- `tasks/api-contract-hardening-force-refresh-todo.md` (untracked).
