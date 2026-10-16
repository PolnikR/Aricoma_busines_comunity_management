# Úlohy: Scroll tabuľky Resources

Plán: [plan.md](plan.md). Stav: T1/T2 a kontrolný bod A overené. T3 je otvorená pre použiteľnosť krátkych okien; čaká sa na odpoveď k zmenšeniu odsadení. Výsledky: [merania](resources-table-scroll-measurements.md).
Predchádzajúci obsah bol nahradený so súhlasom používateľa, ktorý potvrdil jeho dokončenie. Tento lokálny checklist je pre túto úlohu výslovne vyžiadaný; nevytvára duplicitné GitHub issues.

## T1: Reprodukovateľná Playwright regresia

Opis: pripraviť opakovateľné meranie skutočnej aplikácie na izolovaných testovacích dátach.
Závislosti: žiadne. Rozsah: malý, 1 nový skript.
Súbor: scripts/qa/verify-resources-table-scroll.mjs.

Kritériá prijatia:

- [x] Izolovaný browser používa validné fixture, 232 VM, štyri provider taby a zbalené metriky; nečíta prihlasovacie údaje.
- [x] Pred opravou reprodukuje layoutové zlyhanie pri 1366x768 alebo 1280x600; príčina zlyhania je zaznamenaná.
- [x] Zachytí výšky, overflow, scrollTop a pozície ovládania; spustenie a Playwright runtime sú zdokumentované.

Overenie: node scripts/qa/verify-resources-table-scroll.mjs; očakávané zlyhanie pred opravou.

## T2: Oprava Resources flex obalu

Opis: obnoviť štandardný zmenšiteľný layout InventoryShell a odstrániť Resources-only minimum 480 px.
Závislosti: T1. Rozsah: malý, 2 súbory; pri preukázanej potrebe ďalšiu zmenu frame oddeliť do malej nadväzujúcej úlohy.
Súbory: src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx a ResourceInventoryShell.test.tsx.

Kritériá prijatia:

- [x] Resources používa min-h-0 cez rodiča aj kartu a nevyžaduje 480 px.
- [x] Existujúci DataTableSurface vlastní scroll riadkov; metriky, preference a dátové operácie sú zachované.
- [x] Cielené component testy, lint a browser regresia z T1 po oprave prejdú.

Overenie: focused Vitest/ESLint príkazy v plan.md a Playwright skript. jsdom test nenahrádza browser meranie.

## Kontrolný bod A

- [x] Pri 1366x768 aj 1280x600 nepreteká desktopová route a wheel posúva oblasť riadkov.
- [x] Stránkovanie je v okne; nestačí iba skryť vonkajšie pretečenie.
- [x] Zásah do ContainedViewportFrame je buď nepotrebný, alebo podložený samostatným meraním a cielenými testmi.

## T3: Overenie flow a použiteľnosti

Opis: rozšíriť QA skript na dotknuté stránky a zapísať merania pred/po.
Závislosti: T2 a kontrolný bod A. Rozsah: stredný, 2 súbory.
Súbory: scripts/qa/verify-resources-table-scroll.mjs a tasks/resources-table-scroll-measurements.md.

Kritériá prijatia:

- [ ] VMware, FlashSystem, IBM Power a Resources ISE prejdú desktopovou maticou; Providers a mobil 390x844 nemajú regresiu.
- [x] Overené compact/comfortable, 10/25/50 riadkov, sidebar, taby, zbalené/rozbalené metriky a loading/empty/error/cached-error stavy podľa plan.md.
- [ ] Wheel a klávesnica dosiahnu riadky aj stránkovanie; pri 1280x600 je zdokumentovaný počet celých viditeľných riadkov. Ak nie je viditeľný ani jeden, úloha zostáva otvorená a uvedie sa konkrétny návrh malej úpravy.

Overenie: Playwright skript, merania geometrie pred/po scrollovaní a screenshoty; zaznamenať aj runtime chyby. Odlišné výsledky pri zoome neodhadovať z fyzických pixelov screenshotu.

## T4: Kontroly a commit

Opis: overiť konečný diff a uložiť hotovú opravu s dôkazmi.
Závislosti: T3. Rozsah: malý, aktualizácia tohto checklistu a záznamu meraní.
Súbory: tasks/todo.md a tasks/resources-table-scroll-measurements.md.

Kritériá prijatia:

- [ ] Focused Vitest a ESLint dotknutých súborov, Playwright a git diff --check prejdú; presné výsledky sú zapísané.
- [ ] Commit obsahuje iba zmeny tejto úlohy; existujúce cudzie zmeny zostávajú nedotknuté.
- [ ] Odovzdanie uvádza commit, verifikáciu a limity; celý suite ani build sa nespúšťajú bez dôvodu podľa AGENTS.md.

Overenie: git diff --cached --stat, git diff --cached --check a git log -1 po úspešnom commite.

## Kontrolný bod B: Dokončenie

- [ ] Všetky otvorené kritériá T1 až T4 sú splnené; oprava nie je vyhlásená za hotovú iba na základe testov CSS tried.
- [ ] Merania potvrdzujú scroll v tabuľke, stabilné ovládanie a použiteľnosť nízkych okien.
- [ ] Výsledná oprava je overená a commitnutá; push a merge nie sú súčasťou zadania.
