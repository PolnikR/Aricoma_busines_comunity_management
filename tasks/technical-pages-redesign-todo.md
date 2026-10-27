# Úlohy: technické dátové stránky a používateľ v sidebare

Plán: [technical-pages-redesign-plan.md](technical-pages-redesign-plan.md).
Stav: všetky implementačné úlohy čakajú. Schválené je samostatné umiestnenie plánu.
Každý krok ukončiť focused validáciou, kontrolou diffu a atómovým commitom.
Príkazy spúšťať z koreňa repozitára; cesty nižšie sú explicitný focused rozsah.

## T1: UserMenu pre spodné ukotvenie

**Popis:** Existujúce menu rozšíriť o konkrétny sidebar režim a kompaktný trigger;
zachovať default počas migrácie. Znovu použiť auth, jazyk, tému a logout.

**Akceptačné kritériá:**
- [ ] Sidebar režim otvára menu nahor, rail doprava so spodným zarovnaním; krátky viewport má scroll menu.
- [ ] Avatar má prístupný názov, Enter/Space otvára, Escape zatvára a vracia focus, klik mimo zatvára; default header režim zostáva funkčný do T2.
- [ ] Existujúce jazykové/theme/logout správanie a auth-disabled režim ostávajú zachované; žiadny nový Settings workflow.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/app/header/UserMenu.test.tsx src/app/header/ThemeSelector.test.tsx src/__tests__/language-switching.integration.test.tsx`.
Browser overenie umiestnenia po zapojení v T2.
**Závislosti:** Žiadne.
**Súbory (S, 2):** `src/app/header/UserMenu.tsx`, `src/app/header/UserMenu.test.tsx`.

## T2: Jediný používateľ vo footeri sidebaru

**Popis:** Zapnúť sidebar režim menu a odstrániť jeho renderovanie z AppHeader.
Footer mimo navigačného scrollu; zachovať mobilné ovládanie a existujúci rám.

**Akceptačné kritériá:**
- [ ] V rozbalenom sidebare je účet vľavo dole s menom, v raili avatar; header účet neobsahuje.
- [ ] Aj pri dlhej navigácii a dlhom mene je footer dostupný; mobilný panel obsahuje účet dole a menu sa pri zavretí panelu/resetovaní režimu zavrie.
- [ ] Menu sa neorezáva a nevystupuje nad aktívny detailový dialóg; všetky pôvodné akcie sú dostupné.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/layouts/app-shell/AppSidebar.test.tsx src/layouts/app-shell/AppHeader.test.tsx src/app/header/UserMenu.test.tsx src/__tests__/language-switching.integration.test.tsx`.
**Závislosti:** T1.
**Súbory (M, 5):** `src/layouts/app-shell/AppSidebar.tsx`, `src/layouts/app-shell/AppHeader.tsx`, `src/layouts/app-shell/AppSidebar.test.tsx`, `src/layouts/app-shell/AppHeader.test.tsx`, `src/__tests__/language-switching.integration.test.tsx` (ak potrebuje nové miesto triggera).

## Checkpoint A: Účet

- [ ] T1–T2 testy prešli, oba režimy auth a všetky tri jazyky zachované.
- [ ] Browser: desktop/rail/mobile, 320 px, 1440 px, nízka výška 600 px, 200 % zoom, Tab/Escape, menu pod modal backdropom.
- [ ] Vizuálne porovnanie s aplikáciou a požiadavkou účet iba vľavo dole; výsledky zapísať pred ďalšou fázou.

## T3: Opt-in ploché inventory obaly

**Popis:** Pridať `appearance="flat"` bez zmeny existujúcich defaultov.
V plochom variante odstrániť vnútorné card rámovanie, shadow a odsadenie obalu.

**Akceptačné kritériá:**
- [ ] InventoryShell a DataTableSurface podporujú flat; InventoryPanel odovzdá variant bez duplikovanej štruktúry.
- [ ] Toolbar, children, pagination, cached/error správanie a min-height/overflow kontrakty zostanú zachované.
- [ ] Existujúci variant ostáva default; žiadna globálna zmena Card alebo tém.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`.
**Závislosti:** Žiadne; vykonať po A.
**Súbory (M, 5):** `src/shared/components/inventory-shell/InventoryShell.tsx`, `src/shared/components/inventory-shell/InventoryShell.test.tsx`, `src/shared/components/inventory-shell/InventoryPanel.tsx`, `src/shared/components/data-table/DataTableSurface.tsx`, `src/shared/components/data-table/DataTableSurface.test.tsx`.

## T4: Zapojenie plochých obalov

**Popis:** Použiť flat v oboch schválených rodinách stránok, nie v celej aplikácii.
ResourceInventoryPanel je dnes reexport: ak treba lokalizovaný wrapper na opt-in,
urobiť ho tu, shared InventoryPanel default nemení.

**Akceptačné kritériá:**
- [ ] VMware/Power/FlashSystem aj Recovery runs nemajú vnorené card rámy a tabuľka dostane celú šírku.
- [ ] Výber stále otvára pôvodný detail; nevznikne panel ani druhý dialog implementation.
- [ ] Provider/URL filtre, výber entity, retry a stránkovanie zostanú funkčné.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`.
**Závislosti:** T3.
**Súbory (M, 5):** `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.tsx`, `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`, `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`.

## Checkpoint B: Plochá plocha

- [ ] T3–T4 testy a `npm.cmd run typecheck` prešli; focused ESLint nad zmenenými TS/TSX.
- [ ] Browser: Resources všetkých troch platforiem, Recovery runs a jedna nezmenená stránka používajúca DataTableSurface; oba motívy, bez page overflow.
- [ ] Pôvodné detailové dialógy a ich nested vrstvenie sú zachované; žiadny fixed right detail.

## T5: Pás existujúcich metrík Resources

**Popis:** Pridať opt-in plochú prezentáciu do CollapsibleMetrics a zapojiť
VMware a SourceInventoryMetrics. Zachovať výpočty aj storage preferenciu.

**Akceptačné kritériá:**
- [ ] Metriky sú pás s deliacimi čiarami, na úzkej šírke sa zalomia, bez individuálnych kariet.
- [ ] Expand/collapse a uložená preferencia fungujú vrátane loading a helper loading.
- [ ] Hodnoty, jednotky a ich význam ostávajú pôvodné; Recovery runs nedostane falošné globálne KPI.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/shared/components/stat-card/CollapsibleMetrics.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.test.tsx src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx`.
**Závislosti:** T4.
**Súbory (M, 4):** `src/shared/components/stat-card/CollapsibleMetrics.tsx`, `src/shared/components/stat-card/CollapsibleMetrics.test.tsx`, `src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.tsx`, `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.tsx`.

## T6: Kompaktný toolbar

**Popis:** Opt-in kompaktné rozostupy DataTableToolbar zapojiť cez Resources
toolbary. Zachovať rozsah filtrov a ich modálne Apply/Cancel správanie.

**Akceptačné kritériá:**
- [ ] Search, filter tlačidlo a hustota tvoria kompaktný toolbar s dostupnými názvami a focusom.
- [ ] Žiadne filtre sa nestratia; Apply/Cancel/Reset, disabled a active count fungujú pôvodne.
- [ ] Pri 320 px sa ovládanie zalomí; veľkosť dropdownov a dialógových formulárov sa globálne nemení.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/shared/components/data-table/DataTableToolbar.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`.
**Závislosti:** T3.
**Súbory (M, 4):** `src/shared/components/data-table/DataTableToolbar.tsx`, `src/shared/components/data-table/DataTableToolbar.test.tsx`, `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.tsx`, `src/features/discovery-inventory/resources/components/SourceInventoryToolbar.tsx`.

## Checkpoint C: Hustota nad tabuľkou

- [ ] Metriky neobsahujú individuálne karty; loading a collapse preference otestované.
- [ ] Filter modály majú pôvodné funkcie, dostatočný focus a čitateľnosť.
- [ ] Porovnať počet viditeľných riadkov pred/po pri 1440 × 900 na rovnakých dátach; nové rozloženie ich nesmie znížiť.

## T7: Kompaktné tabuľky Resources

**Popis:** Doplniť len potrebný opt-in sticky-first-column kontrakt do DataTable,
zapojiť tri resources tabuľky. Znovu použiť súčasnú density API a štýlové props.

**Akceptačné kritériá:**
- [ ] Compact má pri jednoriadkovom obsahu cieľ 32 px, comfortable zachovaný; identifikátory a čísla sú čitateľné bez potlačenia obsahu chýb.
- [ ] Sticky hlavička/prvý stĺpec, virtuálne riadky a vnútorný scroll spolu fungujú; default DataTable sa nezmení.
- [ ] Výber myšou aj klávesnicou otvára existujúce VM/LPAR/volume dialógy a po zatvorení vráti focus.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/shared/components/data-table/DataTable.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`.
**Závislosti:** T4, T6.
**Súbory (M, 5):** `src/shared/components/data-table/DataTable.tsx`, `src/shared/components/data-table/DataTable.test.tsx`, `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx`, `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.tsx`, `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.tsx`.

## T8: Kompaktné Recovery runs

**Popis:** Zapojiť kompaktný toolbar, density toggle a opt-in sticky column.
Použiť existujúce údaje entity + latest run a zachovať odkaz do histórie.

**Akceptačné kritériá:**
- [ ] All/Applications/Groups a URL entity selection ostávajú; žiadna migrácia na fixture platform tabs alebo plochú históriu.
- [ ] Compact/comfortable mení hustotu bez zmeny výsledkov; search/page/pageSize/refresh a row retry zostanú funkčné.
- [ ] No runs, pending, failed fetch a stale refresh sú odlíšené; detail stále používa RecoveryRunHistoryDetailView.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.test.tsx src/features/recovery-plans/recovery-runs/hooks/useRecoveryRunsTabSearchParam.test.tsx`.
**Závislosti:** T4, T6, T7.
**Súbory (M, 4):** `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`, `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`, `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`.

## Checkpoint D: Funkčné regresie

- [ ] T7–T8 kontroly a `npm.cmd run typecheck` prešli, focused ESLint nad zmenenými súbormi.
- [ ] Resources: provider switch, refresh, URL Back/Forward, vymazaný záznam, stránkovanie, detail; Recovery runs: entity tabs, refresh error, retry a história.
- [ ] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/pages/ResourcesRouteTransition.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx src/shared/components/detail-view/DetailView.test.tsx src/shared/components/modal/nestedDialogs.test.tsx`.

## T9: Skeletony a lokalizácia

**Popis:** Zarovnať existujúci shell skeleton s účtom dole; doplniť len potrebné
nové texty EN/SK/CS. Nepridávať vývojársky preview text do produkcie.

**Akceptačné kritériá:**
- [ ] AppShellSkeleton zodpovedá umiestneniu účtu v sidebare a nemá header avatar.
- [ ] Nové texty/accessible labels existujú v EN/SK/CS; existujúce kľúče sa používajú prednostne.
- [ ] Loading/empty/error varianty vybraných stránok vizuálne nadväzujú na ploché rozloženie; bez veľkého skoku pri načítaní.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/layouts/app-shell/AppShellSkeleton.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/__tests__/language-switching.integration.test.tsx`; JSON parser pre tri locale súbory. Ak treba meniť ďalšie skeleton komponenty, rozdeliť na samostatný malý follow-up pred T10.
**Závislosti:** T2, T5–T8.
**Súbory (M, max. 5):** `src/layouts/app-shell/AppShellSkeleton.tsx`, `src/layouts/app-shell/AppShellSkeleton.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.

## T10: Finálne overenie aplikácie

**Popis:** Zdokumentovať skutočné výsledky a screenshoty reálnej aplikácie.
Použiť existujúci browser harness; ak chýba, jeden focused harness s fixtures,
bez nových produkčných endpointov alebo dependency frameworku.

**Akceptačné kritériá:**
- [ ] Resources × tri platformy a Recovery runs: svetlá/tmavá téma, 320/768/1024/1440 px, 200 % zoom, veľa dát, dlhé mená a všetky dátové stavy.
- [ ] Účet je iba dole v sidebare; menu nie je orezané, Tab/Escape/klik mimo funguje; pôvodné detailové a nested dialógy blokujú pozadie a vracajú focus.
- [ ] Žiadne nové console chyby, page overflow alebo zníženie dátovej hustoty; kontrast a accessibility názvy overené, výsledky a limity zapísané.

**Overenie:** Spustiť aplikáciu `npm.cmd run dev -- --host 127.0.0.1`; browser testy len autorizovaných lokálnych dát, logout overovať mockom bez ukončenia reálnej session. Zopakovať iba focused testy dotknuté opravami; `git diff --check`. Do reportu uviesť presný browser nástroj/príkaz, screenshot cesty a výsledky, nie iba „manual OK“.
**Závislosti:** T1–T9.
**Súbory (S–M, max. 3):** tento todo dokument, prípadne plán pri zdôvodnenej korekcii a nový `scripts/verify-technical-pages.mjs` iba ak chýba použiteľný harness.

## Checkpoint: Odovzdanie

- [ ] Všetky kritériá overené; prípadné limity výslovne zapísané bez označenia neoverenej úlohy za hotovú.
- [ ] Vizuálny výsledok pripravený na review podľa schváleného návrhu a požiadavky používateľa dole vľavo.
- [ ] Atómové commity obsahujú iba vlastné zmeny; kompletná suite/build nespustené bez zdôvodnenia širšieho scope.

## Evidencia prípravy plánu

- 2026-10-26: CodeGraph prieskum AppShell/AppSidebar/AppHeader/UserMenu, inventory
  obalov, tabuliek, metrík a Recovery runs dátového toku.
- Používateľ schválil samostatné mená plánovacích dokumentov. Pôvodné rozpracované
  plány ani súbežné recovery-application-draft dokumenty sa nemenia.
- Produkčný kód a HTML prototyp sa v plánovacej relácii nemenia. Vyššie uvedené
  implementačné testy sú plánované príkazy, nie hlásenie vykonaných testov.
- Pred implementáciou potrebuje tento konkrétny plán review; všetky jeho úlohy sú otvorené.
