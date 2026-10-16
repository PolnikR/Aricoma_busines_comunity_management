# Plán: Scroll tabuľky Resources v dostupnej výške

Dátum: 2026-10-16. Stav: T1 až T4 vrátane schváleného T2b vykonané a overené; finálna matica 105 PASS, 0 FAIL. Pozri [merania](resources-table-scroll-measurements.md).
Úlohy: [tasks/todo.md](todo.md). Používateľ výslovne povolil nahradiť oba predchádzajúce dokumenty, pretože ich práca je hotová. Pre túto úlohu požaduje lokálny plán a zoznam úloh.

## Cieľ a rozsah

Na desktopových Resources má rolovať oblasť riadkov tabuľky. Nadpis, metriky, provider taby, filtre a stránkovanie zostávajú dostupné bez scrollovania celej route. Použiť existujúci vzor Providers a jeho DataTableSurface; nepridávať nový scroll systém.

Zmena sa týka VMware, FlashSystem, IBM Power a Resources ISE cez spoločné obaly. API, načítavanie, cache, prefetch, filtrovanie, stránkovanie a virtualizácia sa nemenia. Metriky už majú default zbalený cez useStoredBoolean(storageKey, true); zachovať aj explicitnú uloženú voľbu používateľa. Mobil pod lg zachová prirodzené scrollovanie stránky.

## Zistená príčina

Commit 94bbf09c riešil príliš nízku oblasť riadkov pri krátkom okne zavedením minima karty 480 px a scrollovania route. Súčasne InventoryShell pri surfaceMinHeightClassName vynecháva lg:min-h-0 na rodičovi. Výsledné min-height:auto dovolí rodičovi rásť podľa prirodzenej výšky tabuľky. Samotné minimum 480 px preto nie je jediná príčina.

Závislosti layoutu:

AppShell (contained route) -> ResourceViewportFrame -> ContainedViewportFrame -> ResourceInventoryShell -> InventoryShell -> ResourceInventoryPanel / InventoryPanel -> DataTableSurface -> tabuľka.

Providers používa InventoryShell bez výškového minima a DataTableSurface s vnútorným overflow-y-auto. VMware tabuľka renderuje stránkované rows.map; tento problém nevznikol kvôli virtualizácii.

## Dôkazy z diagnostiky Playwright

Playwright Core + headless Edge, lokálny Vite, izolovaný kontext a zachytené API odpovede: 232 VM, 10 riadkov na stránke, štyri provider taby; Providers porovnané s 25 testovacími providermi. Metriky boli zbalené. Hodnoty sú CSS px, nie fyzické pixely screenshotu. Zoom ani produkčný backend používateľa neboli reprodukované.

| Viewport | Aktuálne pretečenie route | Iba rodič min-height:0 | Rodič aj karta min-height:0 |
|---|---|---|---|
| 1366x768 | 106 px | route bez pretečenia; tabuľka 241 px | rovnaký výsledok |
| 1280x600 | 274 px | route stále preteká o 128 px | route bez pretečenia; tabuľka 73 px |
| 1204x777 | 89 px | route bez pretečenia | tabuľka 258 px |
| 1507x795 | 79 px | route bez pretečenia | tabuľka 268 px |
| 1505x971, 1884x994 | žiadne | žiadne | žiadne |

Po dočasnej DOM úprave koliesko posunulo vnútorný scrollTop na 106 px pri 1366x768 a na 200 px pri 1280x600. Stránkovanie zostalo v okne. Providers mal vo všetkých šiestich veľkostiach scroll v tabuľke. Neboli zachytené pageerror udalosti.

Diagnostické artefakty sú dočasne v node_modules/.cache/scroll-probe/ (probe.mjs, results.json, screenshoty). Nie sú súčasťou Gitu ani trvalým regresným testom. Pred implementáciou výsledky znovu vytvoriť; nespoliehať sa na prítomnosť tohto priečinka.

## Rozhodnutia pre implementáciu

1. Odstrániť Resources-only minimum 480 px a obnoviť štandardný InventoryShell s lg:min-h-0 cez celý flex reťazec. ResourceInventoryShell používa štandardný InventoryShell a zapína iba schválené kompaktnejšie desktopové odsadenia. Odstrániť iba konštantu a importy, ktoré tým vzniknú ako nepoužité.
2. Shared surfaceMinHeightClassName zatiaľ ponechať. Jeho odstránenie zo všetkých shared kontraktov nie je potrebné na opravu Resources a rozšírilo by diff.
3. Ponechať existujúce DataTableSurface ako vlastníka vertikálneho scrollu riadkov. Neopravovať symptóm samotným overflow-hidden na vonkajšom obale. ContainedViewportFrame meniť iba vtedy, ak po oprave flex reťazca preukázateľne naďalej preteká; každú takú zmenu podložiť meraním a overiť všetkých jeho spotrebiteľov.
4. Nemeníme AppShell, route handles, predvolené metriky ani používateľské preferencie. Zatiaľ nepridávať automatické zbaľovanie metrík, výškové breakpointy alebo nový kompaktný header.
5. V nízkych oknách je použiteľnosť samostatné kritérium: samotná absencia vonkajšieho scrollbaru nestačí. Výška 73 px zahŕňa aj hlavičku tabuľky. Overiť skutočne viditeľné riadky v oboch hustotách. Ak sa nezmestí ani jeden celý riadok, neoznačiť opravu za hotovú; zaznamenať rozmery a navrhnúť konkrétnu malú úpravu existujúcich vertikálnych rozostupov pred rozšírením scope.

## Poradie a kontrolné body

Úlohy vykonať sekvenčne: T1 -> T2 -> kontrolný bod A -> T3 -> T4 -> kontrolný bod B. Podrobný checklist a súbory sú v todo.md. Nie je potrebná paralelná práca agentov.

### T1: Reprodukovateľná browser regresia (malá)

Pripraviť skript scripts/qa/verify-resources-table-scroll.mjs s izolovaným Playwright kontextom, testovacími API odpoveďami a zbalenými metrikami. Použiť dostupný QA runtime; nepridávať produkčnú závislosť alebo meniť lockfile len kvôli diagnostike. Pri externom Playwright runtime dokumentovať jeho umiestnenie a spôsob spustenia. Zachytávať iba skutočné /api/ URL, nikdy /src/shared/api/ moduly.

Overenie: pred opravou musí zlyhať cielená assertion o vonkajšom scrollovaní pri 1366x768 alebo 1280x600. Zlyhanie musí byť layoutová regresia, nie chýbajúci browser, autentifikácia alebo neplatné fixture. Uložiť rozmery main, route, shell, karty, scroll kontajnera, hlavičky, riadkov a stránkovania.

### T2: Oprava spoločného Resources obalu (malá)

Upraviť ResourceInventoryShell.tsx a ResourceInventoryShell.test.tsx. Test už nesmie vyžadovať 480 px; má overovať zmenšiteľný layout a zachovanie obsahu. Zásah do shared frame a jeho testu je podmienený meraním podľa rozhodnutia 3.

Overenie: príslušné component testy, focused ESLint a browser regresia z T1 po oprave. Kontrolný bod A: vonkajší scroll zmizol v oboch reprodukciách a koliesko posúva vnútorný kontajner.


### T2b: Schválené odsadenia Resources (malá)

Používateľ po výsledkoch T3 výslovne schválil zmenšenie odsadení iba na Resources. InventoryShell má voliteľné compactSpacing (default false), ktoré mení iba desktopový gap na 4 px, padding vonkajšej karty na 0, vertikálny padding inventory hlavičky na 2 px a padding obsahu na 0. ResourceInventoryShell túto voľbu zapína pre všetky svoje flow. Providers a ďalšie stránky ostávajú na predvolenom rozložení; mobilné triedy sa nemenia. Nejde o zmenu hustoty riadkov alebo metrík.

Súbory: src/shared/components/inventory-shell/InventoryShell.tsx, src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx a scripts/qa/verify-resources-table-scroll.mjs. Závislosť: T2 a zlyhania T3. Overenie: existujúce focused component testy, ESLint zmenených TSX a Playwright vrátane Comfortable + rozbalené metriky pri 1280x600, cached-error a zachovania voľby metrík. Po T2b zopakovať celú maticu pred dokončením T3/T4.

### T3: Browser overenie dotknutých flow (stredná)

Rozšíriť ten istý QA skript a pripraviť stručný trvalý záznam tasks/resources-table-scroll-measurements.md. Nepridávať zvláštny framework.

Overenie: šesť desktopových veľkostí z tabuľky plus mobil 390x844; VMware, FlashSystem, IBM Power a Resources ISE. Zahrnúť dostatok riadkov na overflow, compact/comfortable, 10/25/50 riadkov, zbalené/rozbalené metriky, otvorený/zbalený sidebar a prepnutie provider tabov. Loading, empty, error a cached-error otestovať aspoň v krátkom a bežnom okne.

Pri desktopovom scrollovaní porovnať pozície headera, filtrov a stránkovania pred/po koliesku; route a main scrollTop sa nemenia, vnútorný scrollTop sa mení. Klávesnicou overiť dostupnosť posledného riadku a stránkovania. Pri stavoch bez riadkov overiť dosiahnuteľnosť relevantných ovládacích prvkov. Porovnať Providers ako referenciu. Pri 1280x600 vypočítať počet celých viditeľných riadkov vrátane sticky hlavičky. Expanded metriky overiť samostatne; automaticky neprepisovať používateľovu voľbu, ak nedostatok priestoru odhalí ďalší layoutový limit.

### T4: Cielené kontroly a odovzdanie (malá)

Spustiť cielené kontroly nižšie, skontrolovať diff a zaznamenať výsledky aj limity. Po úspechu aktualizovať checklist a vytvoriť atomický commit iba súborov tejto opravy. Žiadny automatický push alebo merge.

Kontrolný bod B: všetky desktopové layoutové assertions prešli, mobil a Providers nemajú regresiu, nízke okná majú preukázanú použiteľnosť; výsledky sú zaznamenané. Ak ktorýkoľvek bod neprejde, zostáva otvorený.

## Príkazy overenia pri implementácii

```powershell
npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx
npm.cmd exec eslint -- src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx
node scripts/qa/verify-resources-table-scroll.mjs
git diff --check
```

Browser skript vyžaduje spustený lokálny Vite a zdokumentovaný Playwright runtime. Ak sa zmení frame, pridať iba ContainedViewportFrame.test.tsx a ResourceViewportFrame.test.tsx a ESLint skutočne zmenených súborov. Ďalšie existujúce testy spúšťať podľa zmeneného správania; celý suite, typecheck ani produkčný build nie sú predvolený krok.

## Riziká a hranice

- Chýbajúce min-h-0 a minimum 480 px majú rozdielny vplyv; merať obe vrstvy, nie iba skryť vonkajší scrollbar.
- CSS assertion v jsdom nepotvrdí reálny layout. Rozhodujúce sú merania a wheel/keyboard interakcie v prehliadači.
- Screenshot používateľa nepotvrdzuje CSS viewport alebo zoom; pri odlišnom výsledku zaznamenať innerWidth/innerHeight, zoom a veľkosť písma pred ďalšou opravou.
- Veľa provider tabov alebo rozbalené metriky môže znížiť dostupnú výšku. Nepridávať neodsúhlasené správanie; konkrétne nedostatky uviesť v meraniach.
- Pôvodný plán krátkych viewportov v tasks/short-viewport-route-floor-plan.md zostáva historickým zdôvodnením. Tento plán nahrádza jeho Resources-only rozhodnutie o 480 px; Infrastructure sa nemení.

## Stav plánovania

Dokument vznikol na výslovnú žiadosť používateľa. Súhlas s prepísaním plánov neznamená vykonanú implementáciu. Používateľ následne zadal vykonanie inline. T1/T2 a kontrolný bod A sú overené. T3 odhalila nedostatočnú výšku pri 1280x600. Používateľ schválil aj zmenšenie odsadení Resources. Rozšírenie T2b je implementované a overené. Finálna browser matica prešla vo všetkých 105 prípadoch; focused testy, lint a kontroly sú zaznamenané v meraniach. Zmeny sa ponechávajú na aktuálnej vetve bez push alebo merge.
