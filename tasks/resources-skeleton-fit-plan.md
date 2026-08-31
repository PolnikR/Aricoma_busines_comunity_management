# Implementačný plán: Resources viewport-fit bez page scrollbaru

## Prehľad

Nanovo zaviesť Resources-specific layout kontrakt, ktorý udrží Resources aj
Resources ISE v dostupnej výške aplikácie bez vonkajšieho vertikálneho scrollbaru.
Rovnaký rozmerový kontrakt bude platiť pre loading skeleton, načítané údaje,
empty stav aj error stav.

Nejde o revert commitu `3eb0eba`. Globálny `AppShell` a jeho short-window scroll
správanie zostanú nedotknuté. Fit správanie sa implementuje dopredu ako lokálna
vlastnosť Resources feature.

Implementácia sa vykonáva podľa tohto plánu; nižšie uvedené checkboxy zachytávajú
stav jednotlivých krokov po overení.

## Potvrdená história a aktuálny stav

- V stave `fb38985`, tesne pred `3eb0eba`, mal `AppShell` na desktopoch
  `overflow-hidden` a Resources panel používal pružný `min-h-0` obsah.
- Commit `3eb0eba` z 27. augusta 2026 zmenil `AppShell` na `overflow-auto`, pridal
  Outlet wrapper s `min-h-min` a Resources table regiónu pridal
  `min-h-[120px]`. Tým vedome zaviedol page scrollbar pre krátke okná.
- Commit `62cbf31` neskôr zjednotil background-loading riadky s reálnou tabuľkou,
  ale nemenil vlastníka vertikálneho overflowu.
- Commit `d1f8b7f` opravil šírku a vnútorný overflow initial-loading skeletonu.
  Nemenil načítaný Resources layout ani `AppShell`, preto nemohol odstrániť
  page scrollbar z loaded stavu.
- VMware, FlashSystem a IBM Power používajú spoločný `InventoryShell` a
  `ResourceInventoryPanel`, ale každá resource page má vlastný opakovaný page-root
  class string.

## Rozhodnutia a hranice

1. **Bez revertu.** `3eb0eba` sa nerevertuje ani čiastočne neprepisuje v
   `AppShell.tsx`. Ostatné features si zachovajú globálne short-window scrollovanie.
2. **Nový Resources boundary.** Pridať malý `ResourceViewportFrame`, ktorý vlastní
   full-height containment Resources obrazoviek (`h-full`, `min-h-0`, desktopové
   `overflow-hidden`). Nahradí duplikované root wrappery vo VMware, FlashSystem a
   IBM Power stránkach aj terminal no-provider vetvách source/target routes.
3. **Panel ako trojriadkový grid.** `ResourceInventoryPanel` sa nanovo usporiada na
   `toolbar / minmax(0, 1fr) body / pagination`. Body nebude presadzovať pevnú
   minimálnu výšku ani posúvať min-content výšku smerom do `AppShell`.
4. **Bez vertikálneho scroll ownershipu v loaded paneli.** Resources panel nebude
   kresliť vlastný vertikálny scrollbar. Pri podporovaných desktopových viewportoch
   musia zostať viditeľné toolbar, všetky riadky aktuálnej strany a pagination.
5. **Existujúca horizontálna table politika ostáva.** Tento task nemení stĺpce,
   hodnoty, page size, filtrovanie ani detail drawers. `d1f8b7f` zostáva platný pre
   initial skeleton. Ak browser baseline odhalí samostatný horizontálny loaded-table
   overflow na podporovanej desktopovej šírke, implementácia sa zastaví a scope sa
   znovu odsúhlasí namiesto tichého redesignu stĺpcov.
6. **Mobil ostáva prirodzený.** Full-height containment sa aplikuje od desktopového
   breakpointu; mobilné skladanie a prirodzený page scroll zostanú zachované.
7. **Bez viewport matematiky v JavaScripte.** Nepridávať `ResizeObserver`, pevné
   `calc(100vh - ...)`, automatické zmeny page size ani CSS zoom.

## Závislostný tok

```text
Browser baseline + RED layout contract
                  |
                  v
Nový ResourceViewportFrame
                  |
                  v
ResourceInventoryPanel grid containment
                  |
                  v
Source + ISE integration testy
                  |
                  v
Browser verifikácia loading/loaded/error/empty
                  |
                  v
Atomické task-scoped commity
```

## Task tracking

Repozitár určuje GitHub Issues ako task list. Lokálny `gh` klient má v tejto
session neplatný token pre účet `PolnikR`, preto sa externé issues nedajú vytvoriť.
Po obnovení autentifikácie sa majú úlohy 1–4 zaznamenať do jedného implementačného
issue. Samostatný `tasks/todo.md` sa nevytvára, aby sa neporušila repo konvencia
ani neprepísal existujúci task list.

## Úloha 1: Zachytiť Resources viewport kontrakt test-first

**Popis:** Pred produkčnou zmenou doplniť focused testy pre nový
`ResourceViewportFrame` a panel layout. Testy majú chrániť deklaratívny class/DOM
kontrakt; nemajú predstierať meranie layoutu v JSDOM.

**Akceptačné kritériá:**

- [x] Frame test vyžaduje desktopové full-height containment a `overflow-hidden`.
- [x] Panel test vyžaduje tri grid riadky s `minmax(0,1fr)` body bez
      `min-h-[120px]` a bez vertikálneho auto-scroll kontajnera.
- [x] Nové assertions pred implementáciou zlyhajú iba pre chýbajúci nový kontrakt.

**Verification:**

- [x] Spustiť RED focused Vitest pre
      `ResourceViewportFrame.test.tsx` a `ResourceInventoryPanel.test.tsx`.
- [ ] Zaznamenať očakávaný failure reason; setup/import chyby sa nepovažujú za RED.

**Závislosti:** žiadne

**Súbory pravdepodobne dotknuté:**

- `src/features/discovery-inventory/resources/components/ResourceViewportFrame.test.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`

**Odhad:** S

## Úloha 2: Zaviesť Resources-specific viewport frame

**Popis:** Pridať nový jednoduchý `ResourceViewportFrame` a použiť ho ako
jediného vlastníka page-root výškového kontraktu pre source aj target Resources.
`AppShell` zostane bez diffu.

**Akceptačné kritériá:**

- [x] VMware, FlashSystem a IBM Power role pages používajú rovnaký frame.
- [x] Source a Resources ISE terminal no-provider vetvy používajú ten istý frame.
- [x] Na desktopoch frame izoluje Resources min-content od globálneho
      `AppShell` overflowu; mobilné triedy zostanú bez containment zmeny.

**Verification:**

- [x] Frame unit test prejde do GREEN stavu.
- [x] Focused page testy pre source aj target route prešli bez regresie.
- [x] `git diff -- src/layouts/app-shell/AppShell.tsx` je prázdny.

**Závislosti:** Úloha 1

**Súbory pravdepodobne dotknuté:**

- `src/features/discovery-inventory/resources/components/ResourceViewportFrame.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`

**Odhad:** M; implementovať v dvoch atomických slicoch, ak diff presiahne päť
súborov: najprv role pages, potom terminal route vetvy.

## Úloha 3: Zaviesť grid containment inventory panelu

**Popis:** Prebudovať iba layout element `ResourceInventoryPanel` z flex/minimum
scroll regiónu na trojriadkový grid. Toolbar a pagination ostanú nezmenené React
uzly; zmena sa týka iba vlastníka výšky a overflowu.

**Akceptačné kritériá:**

- [x] Panel má riadky `auto minmax(0,1fr) auto` a `min-h-0`.
- [x] Table body používa dostupný stredný riadok bez `min-h-[120px]` a bez
      `overflow-y-auto`.
- [x] Error stav nahradí iba body; pagination sa naďalej pri errore nezobrazí.

**Verification:**

- [x] `ResourceInventoryPanel.test.tsx` prejde do GREEN stavu.
- [x] Existujúce toolbar, error a pagination assertions zostanú zelené.
- [x] Diff neobsahuje `DataTable`, stĺpce, query state ani page-size zmeny.

**Závislosti:** Úloha 2

**Súbory pravdepodobne dotknuté:**

- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`

**Odhad:** S

## Checkpoint: Po úlohách 1–3

- [x] `AppShell.tsx` a commit `3eb0eba` nie sú revertované ani upravené.
- [x] Resources má nový explicitný viewport boundary a panel grid kontrakt.
- [x] Initial skeleton fix z `d1f8b7f` zostáva zachovaný a jeho testy prechádzajú.
- [x] Produkčný diff neobsahuje API, hooky, filtre, page size ani stĺpcový redesign.

## Úloha 4: Integračne a browser overenie všetkých stavov

**Popis:** Overiť source aj target Resources pri initial loading, loaded desiatich
riadkoch, background refresh, empty a error stave. Browser je autoritatívny pre
scrollbar a viditeľnosť obsahu, pretože JSDOM nemá layout engine.

**Akceptačné kritériá:**

- [ ] Pri viewporte zo screenshotu a pri 1920x1080 nemá Resources `main` ani
      inventory panel vertikálny scrollbar.
- [ ] Toolbar, metriky, všetky riadky aktuálnej strany a pagination sú viditeľné
      v loading aj loaded stave; nič nie je odrezané.
- [ ] Resources ISE a všetky tri resource typy používajú rovnaké správanie.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/ResourceViewportFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [ ] Focused ESLint pre každý zmenený TS/TSX súbor s `--max-warnings 0`.
- [ ] `npm run typecheck`, pretože sa pridá nový zdieľaný Resources component.
- [ ] Browser screenshot a computed `clientHeight/scrollHeight` pre `main`, frame,
      inventory card a body pri loading aj loaded stave.
- [x] `git diff --check`, staged-diff kontrola a task-scoped atomické commity.
- [ ] Plný suite a produkčný build sa nespúšťajú štandardne; spustia sa iba
      pri focused regresii alebo na výslovnú žiadosť reviewera.

**Závislosti:** Úlohy 2 a 3

**Súbory pravdepodobne dotknuté:** iba focused integračné testy, ak existujúce
assertions nepokrývajú source a target frame wiring

**Odhad:** M

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Nový frame iba skryje page scrollbar, ale body odreže riadky | vysoký | Browser acceptance vyžaduje viditeľné všetky riadky a pagination; pri clippingu sa task neuzavrie. |
| Lokálny containment unikne do ostatných routes | vysoký | Frame zostane vo feature priečinku; `AppShell.tsx` musí mať nulový diff. |
| Source je opravený, Resources ISE nie | stredný | Rovnaký frame pre role pages aj terminal source/target vetvy; samostatné route testy. |
| Error alebo empty stav sa po grid zmene nezmestí | stredný | Zahrnúť oba stavy do focused testov a browser flow. |
| Krátke okno fyzicky neobsiahne všetok desktopový chrome | stredný | Nepridávať clipping ani JS scaling. Zaznamenať presný podporovaný viewport, pri ktorom zlyhá, a vrátiť sa na produktové rozhodnutie. |
| Súbežné recovery zmeny sa dostanú do commitu | vysoký | Stageovať iba explicitné Resources paths a pred každým commitom kontrolovať staged diff. |

## Finálne acceptance criteria

- Resources aj Resources ISE sa na podporovanom desktope prispôsobia dostupnej
  výške bez vonkajšieho vertikálneho scrollbaru.
- Loading skeleton aj načítané údaje používajú rovnaký viewport-fit kontrakt.
- Toolbar, metriky, všetky riadky aktuálnej strany a pagination zostanú viditeľné.
- `AppShell.tsx` a globálne short-window správanie ostatných features zostanú
  bez zmeny.
- Commit `3eb0eba` sa nerevertuje; riešenie je nový Resources-local boundary.
- VMware, FlashSystem a IBM Power v source aj target role používajú rovnaké
  správanie.
- Focused testy, ESLint, typecheck, browser kontrola a diff check prejdú.
- Implementácia bude rozdelená do task-scoped atomických commitov bez nesúvisiacich
  worktree zmien.

## Odhad náročnosti

**Stredná, približne 3–5 hodín**, vrátane TDD, nového Resources boundary,
panel grid containmentu, source/target integrácie a povinnej browser verifikácie.

## Otvorené otázky

Žiadne produktové otázky pre viewporty zo screenshotu a 1920x1080. Ak browser
overenie preukáže, že pri nižšej desktopovej výške nie je možné zobraziť všetkých
desať riadkov bez scrollu alebo clippingu, implementácia sa zastaví pred zmenou
page size, density alebo viditeľnosti obsahu a vyžiada si samostatné rozhodnutie.
