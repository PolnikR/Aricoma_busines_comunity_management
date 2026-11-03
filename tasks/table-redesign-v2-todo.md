# Redizajn tabuliek v2 (variant B): úlohy

Plán: [table-redesign-v2-plan.md](table-redesign-v2-plan.md).
Stav (2026-11-03): T4 zrušené, T5–T7 vrátené. T13–T19 implementované pre Resources; výsledky sú uvedené nižšie. Nová fáza T20–T30 pre spoločné shared view vrátane Identity & access je naplánovaná a nezačala.

Spoločné pravidlo pre každú úlohu: focused `npm exec vitest run <testy úlohy>`, `npm exec eslint -- <zmenené súbory> --max-warnings 0`, `git diff --check` a atomický commit vlastných overených zmien. Testy chránia správanie, nie CSS triedy.

## Fáza 1: Rozloženie stránky

### T1: Karta tabuľky siaha po spodok stránky

**Popis:** Zistiť, prečo `DataTableSurface` na Platform providers pri 4 záznamoch nesiaha po spodok obsahu, hoci route má `contentScroll: 'contained'`, a opraviť to v shared vrstve. Ak je príčina v `AppShell`, najprv navrhnúť opravu a počkať na schválenie.

**Výsledok (2026-11-02):** bez zmeny kódu. Na `test` po merge `7d37317b` karta siaha po spodok stránky. Chyba zo screenshotu pochádzala zo zahodeného lokálneho commitu `3d4f0625` („content-sized surface“). Merané headless Chrome cez CDP na Platform providers (4 záznamy):
- 1600×900: karta 255–830 px, obsah končí na 842 px (p-3), pätička dole.
- 1280×600: pätička 464–529 px je viditeľná, scrolluje sa len telo tabuľky (135/328 px).
- 390×844: scrolluje sa dokument, pätička je dosiahnuteľná.

**Akceptačné kritériá:**
- [x] Na šírke ≥1024 px pri krátkom zozname spodná hrana karty lícuje so spodkom obsahu stránky a stránkovanie je pripnuté dole.
- [x] Pri dlhom zozname sa scrolluje len telo tabuľky a hlavička stĺpcov ostáva viditeľná. Existuje len jeden vertikálny scroll owner (`DataTableSurface` stredný riadok, `thead` sticky).
- [x] Pri 1280×600 je stránkovanie dosiahnuteľné. Na mobile (<1024 px) sa stránka scrolluje ako dnes.

**Overenie:**
- [ ] `npm exec vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/page/ContainedViewportFrame.test.tsx`
- [ ] Prehliadač: Platform providers (4 riadky), Policy sets, Resources, pri 1920×1080 a 1280×600.

**Závislosti:** žiadne.
**Súbory (S–M):** `InventoryShell.tsx`, `DataTableSurface.tsx` a ich testy; podľa diagnózy `ContainedViewportFrame.tsx` alebo `AppShell.tsx`.

### T2: Jedna hlavička na stránke

**Popis:** `InventoryShell` prestane vykresľovať `inventoryTitle` a `inventoryDescription`. `inventoryTitle` ostane ako `aria-label` sekcie a riadok so `tabs` ostane.

**Rozhodnutie (2026-11-02, variant A):** popis v `InventoryShell` je na väčšine stránok duplikát. Tam, kde nesie vlastnú informáciu, sa veta pripojila k popisu stránky z existujúcich prekladov, bez nových kľúčov:
- Recovery runs: rozsah „latest run per orchestrated entity“,
- Audit: „Last {lines} lines …“,
- Clean room policies: popis pravidiel.

Discovery settings sa nemení, lebo popis stránky už vymenúva všetky sekcie. Záložky sú teraz zarovnané vľavo.

**Akceptačné kritériá:**
- [x] Na 11 stránkach s `inventoryTitle` nie je pod hlavičkou stránky druhý nadpis ani popis.
- [x] Sekcia má stále prístupné meno z `inventoryTitle`. Stránky s `tabs` zobrazujú záložky v samostatnom riadku.
- [x] Na stránkach so záložkami je jasné, ktorá sekcia je aktívna (aktívna záložka). Titulok sa neponecháva.

**Overenie:**
- [ ] `npm exec vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`
- [ ] Prehliadač: Platform providers, Credentials, Identity & Access (so záložkami), Recovery runs (so záložkami).

**Závislosti:** žiadne.
**Súbory (S, 2):** `src/shared/components/inventory-shell/InventoryShell.tsx`, `InventoryShell.test.tsx`.

### T2b: Tabuľka je jediná karta (doplnené 2026-11-02 na žiadosť používateľa)

**Popis:** Vonkajšia karta `InventoryShell` okolo `DataTableSurface` bola zbytočný rámik v rámiku. `DataTableSurface` má značku `data-table-surface` a `InventoryShell` cez CSS `:has()` vypne svoj okraj, pozadie, tieň a padding, keď obsah takú kartu obsahuje. Obsah bez vlastnej karty (formuláre Discovery settings) si rámik ponechá. Nepridáva sa prop pre jednotlivé stránky.

**Akceptačné kritériá:**
- [x] Platform providers, Recovery runs, Audit a Resources majú jedinú kartu a jej ľavý okraj lícuje s nadpisom stránky (headless Chrome: x = 337 px pri 1600×900).
- [x] Discovery settings (formulár) si rámik ponechá.
- [x] Záložky zostávajú nad kartou bez spodnej čiary.

**Overenie:** `npm exec vitest run` nad `InventoryShell`, `data-table` a 16 konzumentmi (43 súborov, 361 testov); headless Chrome na piatich stránkach.
**Súbory (S, 3):** `InventoryShell.tsx`, `DataTableSurface.tsx`, `DataTableSurface.test.tsx`.

### T2c: Záložky ako prvý riadok karty tabuľky (variant 1 z prototypu https://claude.ai/artifact/714nihWpzHcrdzpFXZthHu)

**Popis:** Keď `InventoryShell` obsahuje `DataTableSurface`, riadok s `tabs` dostane horný okraj, zaoblenie a pozadie karty a `DataTableSurface` pod ním stratí horný okraj a zaoblenie. Záložky a tabuľka tak tvoria jednu kartu. Obsah bez vlastnej karty (konfigurácia Discovery settings) sa nemení. Riešené len cez CSS v `InventoryShell`, bez zmeny rozhrania a stránok.

**Akceptačné kritériá:**
- [x] Recovery runs a Recovery policies: spodok riadku so záložkami je zároveň vrch karty tabuľky, ľavý a pravý okraj lícujú s nadpisom (headless Chrome 1600×900).
- [x] Discovery settings (formulár) a Policy sets (bez záložiek) sa nezmenili.
- [x] Mobil 390×844: stránka sa do šírky nerozťahuje a záložky sa posúvajú v riadku.

**Nerozhodnuté:** počty v záložkách a väčšie písmo záložiek z prototypu (stránky dnes posielajú `compact`). Záložka History v Discovery settings (obsahuje `DataTableSurface`) nebola v prehliadači overená.

**Súbory (S, 1):** `InventoryShell.tsx`.

### Checkpoint 1: Rozloženie
- [ ] `npm run typecheck` a `npm run lint` bez chýb.
- [ ] Používateľ v prehliadači potvrdí jednu hlavičku a kartu tabuľky na celú výšku (Platform providers, Policy sets, Identity & Access).

## Fáza 2: Shared vzhľad (prenesie sa na všetky tabuľky)

### T3: Vzhľad `DataTable`

**Popis:** Nová predvolená typografia a stavy podľa prototypu:
- hlavička stĺpcov: 12 px, medium, `text-text-muted`, bez kapitálok, pozadie `surface-subtle`,
- výška riadkov podľa hustoty: compact ≈56 px, comfortable ≈72 px, cez padding, nie pevnú výšku,
- hover `surface-subtle`, výber `accent-soft` s ľavým pruhom, viditeľný focus,
- skeleton s rovnakými rozmermi.

**Výsledok (2026-11-03):**
- Hlavička stĺpcov: `text-xs font-medium text-text-secondary/80`, bez kapitálok. Konštanta `DATA_TABLE_HEADER_TEXT` je exportovaná. `text-text-muted` z prototypu má pri 12 px kontrast len ≈3,9:1, preto sa použila sekundárna farba na 80 % (≈5,6:1).
- Riadky: minimálnu výšku `h-14`/`h-[72px]` používateľ vrátil commitom `a954471a` („restore content-sized data table rows“). Riadky sú opäť vysoké podľa obsahu s paddingom `py-1.5`/`py-2.5`. Hover je `surface-subtle`, výber ostáva `accent-soft` s ľavým pruhom.
- Override súbory `VirtualMachinesTable`, `AccessLogsTable` a `BackingStorageInfo` mali skopírovaný starý štýl hlavičky. Teraz používajú `DATA_TABLE_HEADER_TEXT`, ich odsadenia a `align-top` ostali.
- `DataTableSkeleton` sa nemenil: prvý stĺpec už má ≈56 px.
- Headless Chrome (dev server :5174, `/api` zachytené testovacími dátami, lebo backend vracal 502): hlavička 12 px/500/bez transformácie. Výšky 56/72 px namerané pred `a954471a` už neplatia.

**Akceptačné kritériá:**
- [x] Nový vzhľad sa uplatní na `layout="scroll"` aj `"fit"` a zalamovanie textu vo `fit` funguje ďalej.
- [x] Kliknutie, Enter/Space na riadku, `aria-selected` a `hideInCompact` sa správajú ako doteraz (logika riadkov sa nemenila, `DataTable.test.tsx` prechádza).
- [x] Súbory s vlastným `headerCellClassName`/`cellClassName` sú skontrolované a výsledok je zapísaný.

**Overenie:** `npm exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx`
**Závislosti:** CP1.
**Súbory (S–M, 4):** `DataTable.tsx`, `DataTable.test.tsx`, `DataTableSkeleton.tsx`, `DataTableSkeleton.test.tsx`.

### T4: Výplň prázdneho miesta pod riadkami (ZRUŠENÉ)

**Stav (2026-11-03):** zapracované v `73b1b452`, potom na žiadosť používateľa odstránené („je to hnusné, odstráň to“). Pod krátkou tabuľkou ostáva prázdna biela plocha karty. Kritériá nižšie sú len historický záznam.

**Popis:** `DataTable` vloží za tabuľku výplň s jemnými čiarami. Scroll oblasť `DataTableSurface` sa stane flex stĺpcom, aby sa výplň natiahla.

**Zmena oproti plánu (2026-11-03):** riadky sú po `a954471a` vysoké podľa obsahu, preto pevný rozostup nesedel. `DataTableFiller` si odmeria rozostup medzi posledným a predposledným riadkom (pri jednom riadku jeho výšku + 1 px) a čiary kreslí v rovnakom rytme. Prvá čiara uzavrie posledný riadok. Výplň je `sticky left-0`, aby pri vodorovnom posune ostala pod viditeľnými stĺpcami.

**Akceptačné kritériá:**
- [x] Pri krátkom zozname v `DataTableSurface` siahajú čiary po pätičku. Pri plnej strane výplň nemá výšku a nevytvára scroll navyše (Platform providers 1600×900: výplň začína na spodku posledného riadku, rozostup 50/58 px pri riadkoch 49–50/57–58 px).
- [x] Výplň je `aria-hidden`, nezobrazuje sa pri loading ani pri prázdnom stave a mimo flex rodiča má nulovú výšku.
- [ ] Čiary sú čitateľné vo svetlej aj tmavej téme a nepôsobia ako reálne riadky (svetlá téma overená, tmavá nie).

**Overenie:** `npm exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx`
**Závislosti:** T1, T3.
**Súbory (S–M, 4):** `DataTable.tsx`, `DataTableSurface.tsx` a ich testy.

### T5–T7: VRÁTENÉ (2026-11-03)

T5 (`783ad979`), T6 (`307eafd1`) a T7 (`3fffab24`) boli zapracované a prešli Checkpointom 2 (celá test suite 3400/3400). Na žiadosť používateľa („nepáči sa mi to“) boli vrátené cez `git revert`. Toolbar, stránkovanie a hlavička stránky sú v stave pred T5. Fáza 3 (T8–T12) sa nezačala.

### T5: Toolbar tabuľky

**Popis:**
- vyhľadávanie s tlačidlom na vymazanie,
- `RowDensityToggle` ako dve ikonové tlačidlá s prístupnými menami a tooltipom (doterajšie texty ostanú ako mená),
- `segments` ako chips s voliteľným `count`.

**Akceptačné kritériá:**
- [ ] Tlačidlo na vymazanie sa zobrazí len pri neprázdnom hľadaní, vyprázdni ho a vráti fokus do poľa.
- [ ] Prepínač hustoty má `aria-pressed`, prístupné mená „comfortable“/„compact“ (z props) a funguje klávesnicou.
- [ ] `Segment.count` je voliteľný a existujúci volajúci bez neho fungujú bez zmeny.

**Overenie:** `npm exec vitest run src/shared/components/data-table/DataTableToolbar.test.tsx`
**Závislosti:** CP1.
**Súbory (M, 4):** `DataTableToolbar.tsx`, `DataTableToolbar.test.tsx`, `src/shared/components/table/RowDensityToggle.tsx`, `src/shared/icons/Icons.tsx` (ikony hustoty).

### T6: Pätička a stránkovanie

**Popis:** Pätička na pozadí `surface-subtle` s kompaktnými 32 px tlačidlami. Aktuálna strana má obrys, nie plnú výplň. Text „Showing x–y of z“ ostáva.

**Akceptačné kritériá:**
- [ ] `aria-current="page"`, disabled stav predchádzajúcej/ďalšej strany a skeleton pri načítaní fungujú ako doteraz.
- [ ] Všetci volajúci `Pagination` mimo `DataTablePagination` sú skontrolovaní.
- [ ] Na mobile ostáva „Page x of y“.

**Overenie:** `npm exec vitest run src/shared/components/data-table/DataTablePagination.test.tsx`
**Závislosti:** CP1.
**Súbory (S, 2–3):** `DataTablePagination.tsx`, `DataTablePagination.test.tsx`, `src/shared/components/pagination/Pagination.tsx`.

### T7: Hlavička stránky

**Popis:** `TableToolbar`: Refresh ako ikonové tlačidlo s prístupným menom, ktoré sa počas načítania točí (nahrádza text „Updating“), a voliteľný `count` vedľa nadpisu.

**Akceptačné kritériá:**
- [ ] Refresh má prístupné meno z `refreshLabel` alebo `common.refresh` a počas `isFetching` oznamuje stav (`aria-busy` alebo skrytý text).
- [ ] `count` sa zobrazí len, keď je zadaný. Volajúci bez neho sa nemenia.
- [ ] `PageHeader` ostáva kompatibilný s 13 priamymi volajúcimi.

**Overenie:** `npm exec vitest run src/shared/components/table/TableToolbar.test.tsx src/shared/components/page/PageHeader.test.tsx`
**Závislosti:** CP1.
**Súbory (S–M, 3–4):** `TableToolbar.tsx`, `TableToolbar.test.tsx`, prípadne `PageHeader.tsx` a `PageHeader.test.tsx`.

### Checkpoint 2: Shared vzhľad
- [ ] `npm run typecheck`, `npm run lint` a `npm test` bez chýb.
- [ ] Používateľ v prehliadači skontroluje vo svetlej aj tmavej téme: Platform providers, Providers, Credentials, Policy sets, Recovery groups, Recovery runs, Resources, Audit a jednu tabuľku s `layout="fit"`.

## Fáza 3: Zdieľané bunky a vzor na Platform providers

### T8: Bunka entity a farebné tóny

**Popis:**
- tokeny `--app-tone-1..4` (svetlé aj tmavé) v `src/index.css`,
- `EntityCell`: štvorec s iniciálami v tóne, názov a ID monospace písmom,
- `ToneBadge`: štítok s bodkou v tóne.

**Akceptačné kritériá:**
- [ ] Iniciály sa odvodzujú z názvu a pre čítačku sú skryté. Názov a ID sa skrátia s `title`.
- [ ] Kontrast textu tónov voči pozadiu je aspoň 4.5:1 v oboch témach.
- [ ] Komponenty sa exportujú z `@/shared/components/data-table`.

**Overenie:** `npm exec vitest run src/shared/components/data-table/cells`
**Závislosti:** CP2.
**Súbory (M, 5):** `src/index.css`, `cells/EntityCell.tsx`, `cells/ToneBadge.tsx`, `cells/cells.test.tsx`, `data-table/index.ts`.

### T9: Kopírovateľný kód v bunke

**Popis:** `CopyableCode`: monospace hodnota skrátená s `title` a `DetailCopyButton`, ktorý sa zobrazí pri hoveri alebo fokuse riadku. Klik na kopírovanie nespustí klik na riadok.

**Akceptačné kritériá:**
- [ ] Kopírovanie zapíše hodnotu do schránky a potvrdí ju („Copied“). Chyba schránky nič nerozbije.
- [ ] Klik ani Enter na tlačidle neotvorí detail riadku.
- [ ] Tlačidlo je dosiahnuteľné klávesnicou aj bez hoveru.

**Overenie:** `npm exec vitest run src/shared/components/data-table/cells`
**Závislosti:** CP2.
**Súbory (S, 3):** `cells/CopyableCode.tsx`, `cells/cells.test.tsx`, `data-table/index.ts`.

### T10: Platform providers podľa prototypu

**Popis:**
- stĺpce v poradí Provider (`EntityCell`) | Type (`ToneBadge`, AIRFLOW/SMTP/BACKEND/KEYCLOAK → tóny 1–4) | URL (`CopyableCode`) | Description | JSON (ikonové ghost tlačidlo),
- „Add provider“ ako primárne tlačidlo,
- počet záznamov v hlavičke.

**Akceptačné kritériá:**
- [ ] JSON tlačidlo otvorí `JsonViewerModal` a neotvorí detail. Klik na riadok otvorí `DetailView` ako doteraz.
- [ ] Neznámy typ dostane neutrálny štítok a stránka nespadne.
- [ ] Vyhľadávanie podľa názvu, ID a typu funguje ďalej.

**Overenie:** `npm exec vitest run src/features/platform-administration/platform-providers`
**Závislosti:** T7, T8, T9.
**Súbory (S, 3):** `PlatformProvidersTable.tsx`, `PlatformProvidersTable.test.tsx`, `PlatformProvidersPage.tsx`.

### T11 (voliteľné): Filter podľa typu na Platform providers

**Popis:** Chips „All / Airflow / SMTP / Backend / Keycloak“ s počtami cez `segments` a `useTableState({ predicate })`. Zobrazia sa len typy, ktoré majú záznamy.

**Akceptačné kritériá:**
- [ ] Filter sa kombinuje s vyhľadávaním a pri zmene sa vráti na prvú stranu.
- [ ] Počty sa rátajú z celého zoznamu, nie z výsledku vyhľadávania.
- [ ] Texty chips sú preložené (en/sk/cs).

**Overenie:** `npm exec vitest run src/features/platform-administration/platform-providers`
**Závislosti:** T5, T10.
**Súbory (M, 5):** `PlatformProvidersTable.tsx`, `PlatformProvidersTable.test.tsx`, `src/locales/en.json`, `sk.json`, `cs.json`.

### T12: Odstrániť nepoužívaný `inventoryDescription`

**Popis:** Po T2 sa `inventoryDescription` nikde nezobrazuje. Treba odstrániť prop, odovzdávanie v 11 volajúcich a prekladové kľúče, ktoré už nič nepoužíva. Ide o mechanickú zmenu a je to jediná úloha nad 5 súborov.

**Akceptačné kritériá:**
- [ ] `InventoryShellProps` nemá `inventoryDescription` a typecheck prejde.
- [ ] Odstránené sú len prekladové kľúče bez ďalšieho použitia (overené vyhľadaním).
- [ ] Prekladové testy v `src/locales` prejdú.

**Overenie:** `npm run typecheck`, `npm exec vitest run src/locales src/shared/components/inventory-shell`
**Závislosti:** T2.
**Súbory (L, mechanicky):** `InventoryShell.tsx`, 11 stránok s `inventoryTitle`, `src/locales/{en,sk,cs}.json`.

### Checkpoint 3: Hotovo
- [ ] `npm run typecheck`, `npm run lint` a `npm test` bez chýb.
- [ ] Používateľ porovná Platform providers s prototypom vo svetlej aj tmavej téme, pri 3/4/viac záznamoch a na mobile.
- [ ] Pripravené na review a rozhodnutie, či nasleduje plán pre nové bunky na ďalších stránkach.

## Fáza 4: Oddelenie view a tabuľky v spoločnej karte

Východisko a rozhodnutia sú vo [fáze 4 plánu](table-redesign-v2-plan.md#fáza-4-view-a-tabuľka-v-jednej-karte-doplnené-2026-11-03). Úlohy T13–T19 neopakujú zrušené T4 ani vrátené T5–T7. View navigácia `VMware VMs · vm-01` ostáva samostatným horným pásom; toolbar a hlavička stĺpcov patria tabuľke. Nový rámik vlastní view. Každý krok overiť a commitnúť samostatne; stage iba vlastných zmien.

### T13: Vložená navigácia view

**Popis:** Pridať do `Tabs` explicitné `appearance="embedded"` a zapojiť ho v Resources aj Resources ISE. Vložená navigácia má priehľadný obal/list a nevlastní deliaci rámik. Provider badge, aktívne podčiarknutie a navigačné správanie zostanú.

**Akceptačné kritériá:**
- [x] „VMware VMs“ a štítok `vm-01` ostávajú jednou záložkou view; aktivita je vyjadrená modrým textom, podčiarknutím a `aria-selected`, bez zmeny modelu providerov.
- [x] Embedded vzhľad funguje s aj bez scroll controls; defekt horného oblúka sa nerieši maskou alebo orezaním celej karty. Default `Tabs` inde zostáva zachovaný.
- [x] Kliknutie a klávesy ArrowLeft/ArrowRight/Home/End vyberajú ten istý view/provider ako dnes; source/target role a URL pravidlá zostávajú.

**Overenie:** `npm.cmd exec vitest run src/shared/components/tabs/Tabs.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`; Chrome: dva VMware providery a pretečený navigačný pás.
**Závislosti:** žiadne; vychádzať z aktuálneho stavu po revert T5–T7.
**Súbory (M, 4):** `src/shared/components/tabs/Tabs.tsx`, `Tabs.test.tsx`, `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`, `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`.

**Priebeh (2026-11-03):** implementovane; focused Vitest 4 subory / 38 testov PASS, focused ESLint PASS. Vzhlad v Chrome bude overeny spolu s finalnou kartou v T19.

### T14: Panel tabuľky s explicitným vlastníctvom rámika

**Popis:** Pridať `frame?: 'standalone' | 'embedded'` do `DataTableSurface` a odovzdanie cez `InventoryPanel`. Default zostáva standalone. Embedded panel je rozložením toolbar/data/footer v spoločnej karte view.

**Akceptačné kritériá:**
- [x] Embedded obal nemá vlastný vonkajší rámik, pozadie, polomer, tieň ani orezávanie rohov; vnútorný dátový viewport zachová scroll a min-size pravidlá.
- [x] Toolbar a stránkovanie sú mimo vertikálneho dátového viewportu; chybové/cached správanie `InventoryPanel` zostáva funkčné.
- [x] Konzumenti bez prop ostávajú standalone; tabuľková vrstva neprijíma provider model ani logiku výberu view.

**Overenie:** `npm.cmd exec vitest run src/shared/components/data-table/DataTableSurface.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/shared/components/data-table/DataTable.test.tsx`; focused ESLint na zmenených TS/TSX.
**Závislosti:** žiadne.
**Súbory (M, najviac 4):** `src/shared/components/data-table/DataTableSurface.tsx`, `DataTableSurface.test.tsx`, `src/shared/components/inventory-shell/InventoryPanel.tsx`, prípadne jeho nový `InventoryPanel.test.tsx` pre verejný kontrakt (nezavádzať duplicitné testy existujúceho error správania).

**Priebeh (2026-11-03):** implementovane; focused Vitest 3 subory / 10 testov PASS, focused ESLint PASS. Vzhlad standalone/embedded overi T19.

### T15: Skeleton použiteľný vo view karte

**Popis:** Doplniť rovnaký frame kontrakt do `DataTableSkeleton`, aby loading nepotreboval druhú kartu ani následné CSS prepisovanie cez `!rounded-*`.

**Akceptačné kritériá:**
- [x] Embedded skeleton nevytvára vonkajší rámik/tieň/pozadie; zachová prístupný loading status, `aria-busy` a existujúce rozmery obsahu.
- [x] Predvolený standalone skeleton a voľby `layout`, toolbar/pagination ostávajú kompatibilné.
- [x] Nezavádzajú sa pevné minimálne výšky reálnych riadkov ani dekoratívna výplň.

**Overenie:** `npm.cmd exec vitest run src/shared/components/data-table/DataTableSkeleton.test.tsx src/shared/components/data-table/DataTable.test.tsx`; Chrome: porovnať standalone a embedded loading.
**Závislosti:** T14 (rovnaké pomenovanie kontraktu).
**Súbory (S, 2):** `src/shared/components/data-table/DataTableSkeleton.tsx`, `DataTableSkeleton.test.tsx`.

**Priebeh (2026-11-03):** implementovane; focused Vitest 2 subory / 9 testov PASS, focused ESLint PASS. Skutocne rohy loading stavu overi T19.

### Checkpoint 4: Kompozičné kontrakty pripravené
- [x] Cielené kontroly T13–T15 prešli; defaulty shared komponentov sa nezmenili.
- [x] `npm.cmd run typecheck` overil existujúcich konzumentov nových voliteľných props.
- [x] Zmeny sú atomicky commitnuté; aktualizovaný stav plánu je pripravený na kontrolu pred migráciou view.

**Overenie CP4:** `npm.cmd run typecheck` PASS (exit 0).

### T16: Jedna karta vlastnená resource view

**Popis:** `ResourceInventoryShell` prestane delegovať rámovanie na všeobecný `InventoryShell` a explicitne zloží metriky/notice a jednu kartu s navigáciou a obsahom. `ResourceInventoryPanel` bude obaľovať `InventoryPanel` s embedded frame. `ResourceInventoryLoading` a `ResourceInventoryState` sa upravia súčasne na obsah tej istej karty.

**Akceptačné kritériá:**
- [x] Úspešný výsledok, loading, chyba providerov, bez providera, chyba inventára a prázdny výsledok majú jeden spoločný vonkajší rámik; metriky a notice zostanú mimo karty.
- [x] Resource vetva sa nespolieha na `:has([data-table-surface])`, odoberanie horného rámika potomkom ani na `!rounded-*`; navigácia a obsah majú jediný oddeľovač a transparentné krajné vrstvy.
- [x] Sekcia view má prístupné pomenovanie, navigácia sa nerenderuje duplicitne a samotný `DataTable` ju nepozná; žiadny ARIA odkaz nesmeruje na neexistujúci prvok.

**Overenie:** `npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`; Chrome: normálny stav → loading → error → retry v rovnakom rámci.
**Závislosti:** T13, T14, T15, CP4.
**Súbory (M, 5):** `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `ResourceInventoryPanel.tsx`, `ResourceInventoryStates.tsx`, `ResourceInventoryPanel.test.tsx`, `ResourceInventoryStates.test.tsx`. Zachovať rozhranie existujúcich stránok; ak treba rozšíriť kontrakt shellu, rozdeliť krok pred prekročením tohto rozsahu.

**Priebeh (2026-11-03):** kod implementovany; focused Vitest 4 subory / 20 testov PASS, focused ESLint PASS. Browser kriterium vsetkych stavov ostava na T19.

**Doplnené po T19:** browser kritériá všetkých resource stavov overené; vonkajšia karta ani navigácia nezískavajú druhý rámik pri loading/error/empty.

### T17: Prechody medzi view a request stavmi

**Popis:** Doplniť iba chýbajúce behaviorálne integrácie, ktoré chránia zodpovednosti view/table a migráciu troch resource typov na oboch routes. Existujúce CSS assertions upraviť iba tam, kde sa zámerne zmenil vlastník rámika.

**Akceptačné kritériá:**
- [x] Výber view zachová dnešný URL/provider scope a správanie filtrov/pagination; naviazané query/cache/prefetch mechanizmy sa nemenia a správne sa zobrazí VMware, FlashSystem alebo Power obsah.
- [x] Pri chybe inventára je možné zmeniť dostupný view a použiť retry; pri cached dátach zostávajú údaje aj príslušné stránkovanie. Loading a empty nevytvárajú ďalší view rámik.
- [x] Klávesnicová navigácia a dostupné mená odlišujú navigáciu view od tlačidiel a hlavičiek tabuľky; prípadné existujúce ID asociácie zostávajú platné a unikátne.

**Overenie:** `npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx`.
**Závislosti:** T16.
**Súbory (M, najviac 4):** testy `ResourceInventoryShell`, `VmwareResourcesPage`, `FlashSystemInventoryView`, `PowerInventoryView`. Ostatné uvedené existujúce testy spustiť ako regresiu; ak zlyhanie preukáže ďalšiu zmenu kontraktu, najprv rozčleniť krok a doplniť plán.

**Priebeh (2026-11-03):** integracny test zachovania view/navigacie cez loading, fatal error, retry, cached error a empty; focused Vitest 7 suborov / 74 testov PASS, focused ESLint PASS.

### Checkpoint 5: View a tabuľka fungujú spolu
- [x] T16/T17 majú výsledky focused testov a browser kontrolu jednej karty v úspešnom aj chybovom stave.
- [x] Horný pás ostáva navigáciou view s badge providera a modrým podčiarknutím; toolbar a stĺpce sú viditeľne samostatnou tabuľkovou vrstvou.
- [x] Neboli obnovené T4 ani vrátené T5–T7; sú pripravené screenshoty na review pred finálnou kontrolou layoutu.

**Overenie CP5:** realny Chrome: jedna karta, priehladne tabs, samostatny toolbar, loading/error/cached integracie PASS.

### T18: Priestor na súvislý tieň karty

**Popis:** V resource route vetve ponechať okolo spoločnej karty priestor na tieň aj pri karte natiahnutej po spodok. Rozmery odmerať v Chrome; lokálny gutter/padding musí zohľadniť aj clipping hranicu `ContainedViewportFrame`.

**Akceptačné kritériá:**
- [x] Tieň je súvislý po bokoch aj pod kartou, bez tmavej škvrny pri oblúku; všetky štyri rohy sú súvislé aj pri zoom 125 %.
- [x] Pri 1280×600 je footer dostupný; pri krátkom zozname ostáva dole, pri dlhom scrollujú údaje a nie navigácia view. Na mobile nevznikne horizontálny scroll dokumentu.
- [x] Zarovnanie karty a nadpisu je zachované; nezruší sa globálne route overflow a orezanie ani maska sa nepoužijú na schovanie chyby rámika.

**Overenie:** `npm.cmd exec vitest run src/shared/components/page/ContainedViewportFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx`; podľa zavedeného lokálneho kontraktu aj nový `ResourceViewportFrame.test.tsx`. Chrome: 1600×900, 1280×600, 800×900, 390×844, dve témy a desktop zoom 125 %.
**Závislosti:** T16, T17, CP5.
**Súbory (S–M, najviac 3):** `src/features/discovery-inventory/resources/components/ResourceViewportFrame.tsx`, prípadne nový `ResourceViewportFrame.test.tsx`, podľa merania `ResourceInventoryShell.tsx`. Zásah do `AppShell`/shared route frame vyžaduje najprv doložiť konkrétny ancestor a aktualizovať rozsah plánu.

**Priebeh (2026-11-03):** lokalny p-2 gutter v ResourceViewportFrame; odstup karty od clipping hranice je 8 px vlavo/vpravo/dole. 25 Chrome merani (obe roly, obe temy, 4 viewporty a desktop 125 % zoom) PASS. Vitest 2 subory / 3 testy a focused ESLint PASS.

### T19: Reprodukovateľné browser overenie

**Popis:** Uložiť malý QA skript podľa existujúcich `scripts/qa/*-browser.mjs`, ktorý otvorí izolovaný lokálny prehliadač s validnými fixture odpoveďami, prejde resource view a uloží merania a screenshoty. Slúži na vykreslenie a skutočné scroll správanie; nenahrádza ho kontrola CSS tried.

**Akceptačné kritériá:**
- [x] Browser matica z plánu pokrýva view s rovnakým typom a odlišným providerom, pretekajúce/dlhé záložky, view bez tabs, krátky/dlhý/prázdny zoznam, loading, fatal aj cached error a retry na source/target routes.
- [x] Screenshoty a merania dokazujú jeden rámik, jednu deliacu čiaru, celé rohy/tieň, oddelený pás view a vlastný dátový scroll; klávesnicová navigácia/otvorenie detailu fungujú a nevznikajú nové runtime chyby.
- [x] Reprezentatívne standalone stránky (Platform providers, Recovery runs a Discovery settings) zachovali defaultné rámovanie; výsledky obsahujú presné príkazy, limity fixtures a porovnanie s HTML návrhom.

**Overenie:** `node scripts/qa/inventory-view-table-browser.mjs` (nový skript; konkrétne lokálne porty a spustenie izolovaného Chrome uviesť v komentári), focused ESLint zmenených TS/TSX a `git diff --check`. Nevykonávať zápisy do živého backendu.
**Závislosti:** T13–T18.
**Súbory (S–M, 3):** nový `scripts/qa/inventory-view-table-browser.mjs`, tento todo súbor, podľa skutočných zistení existujúci plan súbor. Screenshoty/QA výstupy ukladať mimo tracked produkčných súborov.

### Checkpoint 6: Fáza view/table pripravená na odovzdanie
- [x] T13–T19 spĺňajú kritériá; ku každému implementačnému kroku existuje focused overenie a atomický commit.
- [x] Výsledné screenshoty zodpovedajú spoločnej karte HTML návrhu a jasne odlišujú výber view od ovládania tabuľky.
- [x] Report uvádza vykonané príkazy, prehliadač/viewport/tému/zoom a prípadné limity. Celá test suite ani production build sa neoznačia za vykonané, ak neboli spustené.
- [ ] Používateľ skontroloval výsledok; pôvodné otvorené alebo vrátené úlohy mimo tejto fázy neboli automaticky označené ako hotové.

## Výsledok fázy 4 (2026-11-03)

T13–T19 boli vykonané po pokyne používateľa executing-plans inline. Vlastník rámika je `ResourceInventoryShell`: názov view, badge providera a modré podčiarknutie zostávajú v samostatnom hornom navigačnom páse. Pod ním je toolbar a obsah tabuľky. `ResourceInventoryPanel`, skeleton aj fatal/empty obsah sú vložené bez ďalšej karty. Predvolené standalone rozhrania shared komponentov sú zachované. `ResourceViewportFrame` má lokálny `p-2` priestor; meraný odstup karty od najbližšej clipping hranice je 8 px vľavo, vpravo a dole. Globálne route scrollovanie sa nemenilo.

### Vykonané overenie

Finálny focused príkaz — **15 súborov, 108 testov PASS, exit 0**:

```powershell
npm.cmd exec -- vitest run src/shared/components/tabs/Tabs.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/shared/components/data-table/DataTable.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx src/shared/components/page/ContainedViewportFrame.test.tsx --maxWorkers=2
```

- `npm.cmd run typecheck` — PASS po shared kontraktoch aj po finálnej resource integrácii.
- Focused `npm.cmd exec eslint -- <zmenené TS/TSX súbory kroku> --max-warnings 0` — PASS pri T13–T18; konkrétne oblasti sú uvedené pri krokoch.
- `npm.cmd exec eslint -- scripts/qa/inventory-view-table-browser.mjs --max-warnings 0` — PASS.
- `node --check scripts/qa/inventory-view-table-browser.mjs` — PASS.
- `node scripts/qa/inventory-view-table-browser.mjs` — **64 dokončených prípadov PASS**, z toho 61 resource geometrických záznamov a 3 standalone kontroly. Nula runtime výnimiek, neočakávaných endpointov a zlyhaných súborov aplikácie. Očakávané HTTP 503 sú lokálne fixtures chybových scenárov.
- `node scripts/qa/inventory-view-table-browser.mjs --interactions-only` — 40 prípadov PASS pri vývoji skriptu. Po review oprave assertion tieňa/cleanup ešte `--quick` s osobitným `INVENTORY_QA_OUTPUT` — PASS; obsahová kontrola všetkých 61 záznamov plnej matice tiež potvrdila prítomný tieň.
- `git diff --check` a pred commitmi `git diff --cached --check` — PASS.

### Browser dôkazy a reprodukcia

Spustenie aplikácie: `npm.cmd run dev -- --host 127.0.0.1 --port 5191 --strictPort`. Izolovaný headless Chrome používal CDP port 9357 a samostatný dočasný profil. Skript má komentár k spusteniu a voliteľné `INVENTORY_QA_BASE`, `INVENTORY_QA_CDP`, `INVENTORY_QA_OUTPUT`. Všetky lokálne config/API odpovede sú fixtures; externé originy skript blokuje. Nenastali zápisy do živého backendu.

Výstup: `%TEMP%/abco-inventory-view-qa/results.json` a PNG v tom istom adresári. Príklady: `initial-light-desktop.png`, `source-dark-1280x600-zoom1.png`, `source-light-390x844-zoom1.png`, `source-long-table-scrolled.png`, `source-vmware-loading.png`, `target-flashsystem-inventory-error.png`, `source-cached-refresh-error.png`, `standalone-platform-providers.png`.

Matica overila source/target routes, oba motívy, 1600×900, 1280×600, 800×900, 390×844 a desktop emuláciu zoom 125 % pomocou zodpovedajúcej CSS šírky/výšky a raster scale. Overené oba VMware providery, všetky tri typy zdrojov, dlhé/pretečené záložky, view bez providerov, chyba zoznamu providerov, success/loading/fatal/empty, retry, cached refresh chyba, otvorenie detailu a dlhý zoznam so samostatným dátovým scrollom. Tlačidlá navigácie a hlavička view pri posúvaní dát zostávajú na mieste. Hlavné svetlé, tmavé a mobilné PNG boli aj vizuálne prezreté; rohy sú súvislé a obraz zodpovedá spoločnej karte HTML návrhu.

### Review a limity

Read-only code review T13–T18 nenašlo závažný problém ani regresiu. Review QA skriptu odhalilo chýbajúcu assertion existencie tieňa a cleanup závislý od uloženia screenshotu. Obe veci opravené a opravy opätovne skontrolované: tieň sa explicitne vyžaduje a best-effort diagnostické výstupy neblokujú uzavretie socketu/QA tabu.

Prehliadač testoval lokálne validné ukážkové odpovede, nie živý backend, a 125 % je emulovaný zoom. Pri zmene typu zdroja aplikácia už pred touto úpravou montuje inú resource stránku; QA pred ďalším klávesom zameria jej aktívnu záložku a čaká na zmenu URL aj renderu. Nepotvrdzuje teda neprerušené zachovanie fokusu pri remounte iného typu stránky.

Pri vývoji QA sa opravilo čakanie na dokončenie renderu záložky (samotná zmena URL nestačila). Priebežné veľké súbežné test spustenia boli prerušené; výsledok uvedený vyššie je samostatne dokončený focused beh s `--maxWorkers=2`, správne odovzdaným cez `npm.cmd exec --`.

Kompletná test suite, full lint a production build neboli spustené podľa dohodnutého focused rozsahu. Otvorená zostáva iba vizuálna kontrola výsledku používateľom v CP6. Pôvodné T1–T12 ani ich historické checkpointy sa týmto automaticky neuzatvárajú. T4 a T5–T7 neboli obnovené. Predexistujúca zmena `src/app/routing/__snapshots__/routeContract.test.tsx.snap` nebola zahrnutá do commitov tejto práce.

### Commity implementácie

- T13 `cf5f8876` — vložená resource view navigácia.
- T14 `dacd242d` — embedded panel a explicitný vlastník rámika.
- T15 `433e5743` — embedded loading skeleton.
- T16 `27befee0` — jediná karta resource view a vnorené stavy.
- T17 `b2d2924a` — integračné prechody stavov so zachovaním navigácie.
- T18 `14a92f09` — lokálny priestor pre celý tieň.
- T19 — záverečný commit obsahuje QA skript a tento výsledkový report; presný hash je v Git histórii.

## Fáza 5: Jedno shared inventory view pre všetkých konzumentov

Rozsah, matica stránok a rozhodnutia: [fáza 5 plánu](table-redesign-v2-plan.md#fáza-5-spoločné-shared-view-pre-všetky-inventory-stránky-t20t30). T20–T30 sú nové nezačaté úlohy. Nadväzujú na overené Resources a odstránia rozdvojenie rámovania oproti Identity a ostatným inventory stránkam. Pri každom kroku focused ESLint, `git diff --check`, záznam výsledkov a atomický commit len vlastných zmien. Historické CP1–CP6 sa týmto neuzatvárajú.

### T20: Scoped dedenie rámovania panelov

**Popis:** Zaviesť malý shared kontext frame/navigation kompozície a resolver rámika v paneli/skeletone. Default mimo view zostane standalone; zatiaľ bez aktivácie v existujúcom shelli.
**Akceptačné kritériá:**
- [ ] `DataTableSurface`, `DataTableSkeleton` a `InventoryPanel` rešpektujú poradie explicitný frame → nearest scope → standalone mimo scope; `InventoryPanel` neprepisuje chýbajúci prop pevným defaultom.
- [ ] Dedenie funguje aj cez obyčajný vnorený feature wrapper, explicitný standalone override ostane platný a nemení query ani stav tabuľky.
- [ ] Context modul obsahuje iba kompozičné hodnoty/hooky bez feature importov, dátového modelu, DOM detekcie a barrel cyklu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2`; doplniť focused integračný prípad v Surface teste pre implicitný/explicitný frame a loading status.
**Závislosti:** hotové T13–T19.
**Súbory (M, 5):** nový `src/shared/components/inventory-shell/InventoryCompositionContext.ts`, `src/shared/components/data-table/DataTableSurface.tsx`, `DataTableSkeleton.tsx`, `src/shared/components/inventory-shell/InventoryPanel.tsx`, `DataTableSurface.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 14 testov PASS; focused ESLint PASS. Kontrola standalone/embedded dedenia, override a loading statusu.

### T21: Jediná shared implementácia view frame

**Popis:** Vytvoriť shared `InventoryViewFrame` podľa hotovej resource karty a pripraviť scoped prezentáciu hlavnej navigácie. Frame poskytuje embedded scope obsahu a oddelený navigation scope iba tabs slotu.
**Akceptačné kritériá:**
- [ ] Jeden shared komponent vlastní rámik, pozadie, polomer, tieň, `data-inventory-view` a jednu deliacu čiaru; nevykonáva fetch ani nerozhoduje o provideroch/view modeloch.
- [ ] `Tabs` dedí embedded vzhľad iba v hlavnom navigation slote; vlastný explicitný appearance a vnútorné detailové tabs zachovajú svoju prezentáciu a klávesnicové správanie.
- [ ] Loading/error/empty obsah má ten istý pomenovaný view región, bez masky/orezania vonkajších rohov; frame umožní zachovať existujúci lower-bound kontrakt shellu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/inventory-shell/InventoryViewFrame.test.tsx src/shared/components/tabs/Tabs.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx --maxWorkers=2` (prvý test je nový); overiť reálnu kompozíciu s panelom cez wrapper a nezávislosť navigation/content scope.
**Závislosti:** T20.
**Súbory (M, 4):** nový `src/shared/components/inventory-shell/InventoryViewFrame.tsx`, nový `InventoryViewFrame.test.tsx`, `src/shared/components/tabs/Tabs.tsx`, `Tabs.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 14 testov PASS; focused ESLint PASS. Navigacny scope oddeleny od content scope.

### Checkpoint 7: Shared kontrakty pripravené
- [ ] T20/T21 overené bez aktivácie nového defaultu vo všetkých stránkach; pôvodný samostatný panel funguje mimo scope.
- [ ] Frame a navigation scope sú nezávislé, explicitné override sú otestované a shared rámik má jediný zdroj CSS.
- [ ] Žiadna tabuľka nepotrebuje poznať konkrétnu feature stránku alebo čítať DOM svojich potomkov.

### T22: Resources ako prvý konzument shared frame a viewportu

**Popis:** Presunúť overený resource viewport s gutterom do shared `InventoryViewportFrame` a resource kartu skladať cez shared `InventoryViewFrame`. Aktualizovať QA marker; zachovať už dodaný vzhľad pred aktiváciou ostatných konzumentov.
**Akceptačné kritériá:**
- [ ] `ResourceInventoryShell` už nekopíruje CSS rámika; resource metriky, notice, tabs a všetky stavy sa skladajú cez nový shared frame.
- [ ] `ResourceViewportFrame` je tenký obal shared viewportu; nadpis a karta majú spoločné zarovnanie a overený priestor pre tieň.
- [ ] Existujúca 64-prípadová resource QA používa `data-inventory-view` a zachová výsledky vrátane rohov, tieňa, krátkeho okna a standalone fallbackov.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/page/ContainedViewportFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2` (viewport test je nový); `node scripts/qa/inventory-view-table-browser.mjs`.
**Závislosti:** T21.
**Súbory (M, 5):** nový `src/shared/components/page/InventoryViewportFrame.tsx`, nový `InventoryViewportFrame.test.tsx`, `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `ResourceViewportFrame.tsx`, `scripts/qa/inventory-view-table-browser.mjs`.

**Priebeh (2026-11-03):** Implementovane: spolocny frame a viewport. Focused Vitest 3 subory / 7 testov PASS; focused ESLint PASS; Chrome quick PASS. Plna matica prerusena CDP screenshot timeoutom, zopakuje sa samostatne v T30. Viewport nema ziadnu novu logiku; namiesto class-string testu sa pouziva existujuci ContainedViewportFrame test a realna geometria.

### T23: Spoločný InventoryShell pre všetky inventory view

**Popis:** Nahradiť staré CSS skladanie v `InventoryShell` explicitným shared view frame. Resource shell sa vráti na tenký obal toho istého `InventoryShell`; metriky, notice a spacing bude skladať spoločná vrstva.
**Akceptačné kritériá:**
- [ ] Všetkých 11 priamych konzumentov shellu získa rovnakého vlastníka rámika a ich panely automaticky zdedia embedded scope bez povinných props na každej tabuľke.
- [ ] Zo shellu zmizne `:has`/`group-has` rámovanie a odoberanie horných okrajov potomkom; shared `VirtualMachinesSkeleton` použije rovnaký frame a vnorený skeleton.
- [ ] Zachované sú accessible region name, metriky/notice mimo karty, `compactSpacing` a `surfaceMinHeightClassName`; resource wrapper nemá vlastný frame markup ani business logiku.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/inventory-shell/InventoryViewFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2`; smoke Identity Users a Resources v Chrome.
**Závislosti:** T22.
**Súbory (M, 4):** `src/shared/components/inventory-shell/InventoryShell.tsx`, `InventoryShell.test.tsx`, `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `ResourceInventoryShell.test.tsx`.

**Priebeh (2026-11-03):** Implementovane: vsetci InventoryShell konzumenti skladaju InventoryViewFrame, resource wrapper je tenky. Focused Vitest 4 subory / 12 testov PASS; focused ESLint PASS. Typecheck a browser sa zaznamenaju v checkpointoch.

### Checkpoint 8: Spoločný shell aktívny
- [ ] `npm.cmd run typecheck` a focused kontroly T22/T23 prešli.
- [ ] Resources aj Identity skutočne renderujú ten istý shared frame; root CSS rámika sa nenachádza v resource feature súbore.
- [ ] Feature navigačné prepisy a viewporty, ktoré ešte čakajú na T24–T29, sú evidované; tento medzistav sa neodovzdá ako hotová globálna migrácia.

### T24: Identity & access cez spoločnú kompozíciu

**Popis:** Zapojiť shared viewport, odstrániť povrchové CSS prepisy hlavnej Identity navigácie a upraviť primárny `IdentityContentPanel`, aby rešpektoval frame scope. Preveriť listové aj formulárové/detailové vetvy tej istej stránky.
**Akceptačné kritériá:**
- [ ] Users, Clients a Application roles majú spoločný súvislý frame, priehľadný pás view s jediným oddeľovačom a celý tieň; neexistuje vlastná Identity kópia view frame.
- [ ] Primárne Identity settings/detailové panely sa vložia do view bez druhej karty; zámerne nezávislé detailové/portal karty majú konkrétny standalone override, ak ho potrebujú.
- [ ] Zachované sú URL/sekcia/tab/entity navigácia, loading/fatal/cached error, retry, otvorenie detailu a scrollovanie dlhého formulára/tabuľky vrátane krátkeho okna.
**Overenie:** `npm.cmd exec -- vitest run src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx src/features/platform-administration/identity-access/components/IdentityAccessNavigation.test.tsx src/features/platform-administration/identity-access/components/IdentityResourceLayout.test.tsx src/features/platform-administration/identity-access/components/UsersSection.test.tsx src/features/platform-administration/identity-access/components/ClientsSection.test.tsx src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx --maxWorkers=2`; browser Users/Clients/Application roles a aspoň jeden dostupný settings/detailový view.
**Závislosti:** T23.
**Súbory (M, 5):** `src/features/platform-administration/identity-access/pages/IdentityAccessPage.tsx`, `components/IdentityAccessNavigation.tsx`, `components/IdentityResourceLayout.tsx`, `pages/IdentityAccessPage.test.tsx`, `components/IdentityResourceLayout.test.tsx` v tom istom feature adresári. Ďalšie zistené nezávislé výnimky rozčleniť pred rozšírením kroku.

**Priebeh (2026-11-03):** Implementovane: Identity zdiela viewport/frame, hlavne tabs dedia embedded a IdentityContentPanel respektuje scope. Focused Vitest 6 suborov / 72 testov PASS; focused ESLint PASS. Browser overenie cez izolovany auth stub v T30.

### T25: Recovery view navigácie

**Popis:** Pre Recovery runs a spoločný Recovery policies shell použiť shared viewport a zdedenú prezentáciu hlavnej navigácie. Tabuľkové komponenty budú rámovanie dediť zo spoločného shellu.
**Akceptačné kritériá:**
- [ ] Runs aj Snapshot/Application recovery/Clean room policy view majú jeden frame a jednu čiaru pod tabs; žiadne lokálne bg/border pravidlo nepremaľuje horný oblúk.
- [ ] Prepínanie view a existujúce query, retry, refresh a policy akcie fungujú bez zmeny modelu; bez tabs nevznikne prázdny navigation slot.
- [ ] História/detail ostáva funkčný, pagination a relevantné formulárové/dátové viewporty sú dostupné pri 1280×600 a na mobile.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx --maxWorkers=2`; browser všetky tri policy typy a runs view/detail.
**Závislosti:** T23.
**Súbory (M, 4):** `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, `RecoveryRunsPage.test.tsx`, `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.tsx`, `RecoveryPolicyPageShell.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 25 testov PASS; focused ESLint PASS. Povodna assertion lokalneho bg/border override aktualizovana na shared navigation kontrakt; funkcne kontroly zachovane.

### T26: Discovery settings formulár aj história

**Popis:** Zapojiť shared viewport/navigáciu v Discovery settings. Configuration primárny formulár dostane embedded prezentáciu `SettingsSectionCard` v tomto konkrétnom použití; History tabuľka prevezme shared frame scope automaticky.
**Akceptačné kritériá:**
- [ ] Configuration aj History používajú rovnaký view frame a ich prepnutie nemení počet obvodových rámikov ani polohu navigácie.
- [ ] `SettingsSectionCard` má explicitný embedded režim pre primárny formulár, pričom ostatné samostatné settings karty zachovajú dnešný default a vnútorné sémantické členenie.
- [ ] Save/cancel/discard, request chyby a retry, dlhý formulár a History footer sú dostupné; existuje správny scroll owner pre každý typ obsahu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/settings/SettingsSectionCard.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.stubfetch.test.tsx src/features/discovery-inventory/discovery-settings/components/DiscoveryHistoryCard.test.tsx --maxWorkers=2`; Chrome Configuration/History a neuložené zmeny.
**Závislosti:** T23.
**Súbory (M, najviac 5):** `src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.tsx`, `DiscoverySettingsPage.test.tsx`, `src/shared/components/settings/SettingsSectionCard.tsx`, `SettingsSectionCard.test.tsx`, prípadne `DiscoveryHistoryCard.test.tsx` pri zámernej zmene existujúcej layout assertion.

**Priebeh (2026-11-03):** Implementovane: Configuration formular embedded, History dedenie, spolocny viewport. Focused Vitest 4 subory / 28 testov PASS; focused ESLint PASS. Ostatne SettingsSectionCard defaulty ostali standalone.

### Checkpoint 9: Všetky view s hlavnými záložkami
- [ ] Identity, Recovery runs/policies, Discovery settings a Resources používajú jeden shared frame a zdedenú vloženú navigáciu.
- [ ] Dátový viewport, hlavná navigácia a vnútorné detailové tabs majú oddelené zodpovednosti; neexistuje duplicitný nav render ani neplatné ARIA odkazy.
- [ ] Každá položka bola overená aj mimo úspešného zoznamu; zistené nezávislé vnútorné karty sú explicitne zapísané.

### T27: Provider a credential zoznamy

**Popis:** Zjednotiť viewport Platform providers, Providers a Credentials. Ich existujúce tabuľkové panely zdedia framing zo spoločného shellu, bez feature CSS pre rámik.
**Akceptačné kritériá:**
- [ ] Všetky tri stránky majú jeden frame bez tabs, celé rohy a tieň a spoločné zarovnanie nadpisu/karty; nevznikne prázdny navigačný riadok.
- [ ] Existujúce CRUD/modal/detail, hľadanie a stránkovanie zostanú funkčné; loading/error/empty sú obsahom spoločnej karty.
- [ ] Krátky a dlhý zoznam funguje na desktope i mobile bez horizontálneho scrollu dokumentu a bez orezanej pätičky.
**Overenie:** `npm.cmd exec -- vitest run src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx --maxWorkers=2`; Chrome všetky tri routes.
**Závislosti:** T23, CP9.
**Súbory (M, 5):** `src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.tsx`, `PlatformProvidersPage.test.tsx`, `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`, `ProvidersPage.test.tsx`, `src/features/providers-connectors/credentials/pages/CredentialsPage.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 5 suborov / 67 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### T28: Recovery application a group zoznamy

**Popis:** Presunúť oba zoznamy na shared viewport pri zachovaní spoločného shellu a existujúcich notice a akcií.
**Akceptačné kritériá:**
- [ ] Obe stránky majú jeden spoločný frame bez lokálnej kópie rámovania; notice ostáva mimo karty podľa kontraktu shellu.
- [ ] Create/edit/detail, delete/rollback a prechody na builder zachovajú doterajšie správanie; layoutová migrácia nemení orchestration ani mutation logiku.
- [ ] Loading/error/empty a krátky/dlhý zoznam zachovajú dostupný footer, správny scroll a priestor na tieň.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx --maxWorkers=2`; browser oba zoznamy a návrat z buildera bez zápisov do živého backendu.
**Závislosti:** T23, CP9.
**Súbory (M, 4):** `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`, `RecoveryApplicationsListPage.test.tsx`, `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`, `RecoveryGroupsListPage.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 4 subory / 88 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### T29: Policy sets a Audit

**Popis:** Dokončiť zvyšné priame konzumenty InventoryShell zapojením spoločného viewportu. Audit overí dedenie aj cez `InventoryPanel`, Policy sets cez priamy `DataTableSurface`.
**Akceptačné kritériá:**
- [ ] Obe routes používajú ten istý shared frame a bez tabs nekreslia navigačný pás; embedded režim sa zdedí cez obe panelové cesty.
- [ ] Audit dotazovací toolbar/hustota a Policy Set modal/refresh po mutation zostanú funkčné; request stavy nevytvoria ďalšiu kartu.
- [ ] Dlhé logy aj krátke Policy sets majú správny scroll owner, celý tieň a dostupné ovládanie pri krátkom okne a na mobile.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/platform-administration/audit/pages/AuditPage.test.tsx src/features/platform-administration/audit/components/AccessLogsTable.test.tsx --maxWorkers=2`; Chrome obe routes.
**Závislosti:** T23, CP9.
**Súbory (M, 4):** `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`, `PolicySetsPage.test.tsx`, `src/features/platform-administration/audit/pages/AuditPage.tsx`, `AuditPage.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 4 subory / 37 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### Checkpoint 10: Celá matica migrovaná
- [ ] Každý z 11 priamych konzumentov InventoryShell a resource wrapper má výsledok v matici; žiadna položka nezostala pri starom skladaní rámika.
- [ ] Header aj view sú v shared viewport kompozícii, všetky feature špecifiká sú dáta/obsah/akcie a existujúce spacing/floor voľby.
- [ ] `npm.cmd run typecheck`, focused lint a cielené regresie T24–T29 prešli; samostatné panely mimo view majú stále standalone default.

### T30: Browser matica a audit úplnosti shared migrácie

**Popis:** Rozšíriť existujúcu CDP kontrolu o celú maticu konzumentov a potvrdiť, že oprava žije v shared vrstve. Spoločný browser transport/merania extrahovať iba v rozsahu potrebnom pre resource a nové inventory prípady.
**Akceptačné kritériá:**
- [ ] Každá položka matice má pomenovaný výsledok a screenshot/meranie; plná geometrická matica reprezentatívnych view a minimálne desktop/mobil oboch tém ostatných routes potvrdí jeden frame, jednu čiaru, celé rohy/tieň a zarovnanie.
- [ ] Request stavy, retry/cache, list/form/detail navigácia, dlhé dáta, formulárové footery a standalone mimo scope sú overené validnými lokálnymi fixtures; externé požiadavky sú blokované a reálny backend sa nemení.
- [ ] Zdrojový audit potvrdí jedinú implementáciu view frame/viewportu, tenké resource wrappery a absenciu starého `:has` rámovania či feature kópií; výsledkový report pomenúva limity a každý neoverený stav.
**Overenie:** `node scripts/qa/inventory-view-table-browser.mjs` a nový `node scripts/qa/shared-inventory-view-browser.mjs`; `node --check` nad zmenenými QA skriptmi; focused ESLint, `git diff --check`, kontrola scope cez `rg -l '<InventoryShell\b' src -g '*.tsx' -g '!*.test.tsx'` a zodpovedajúcu kontrolu `InventoryViewFrame`/`InventoryViewportFrame`/legacy selectors. Celá suite a build iba pri preukázanom dôvode podľa AGENTS.md.
**Závislosti:** T20–T29, CP10.
**Súbory (M, najviac 5):** `scripts/qa/inventory-view-table-browser.mjs`, nový `scripts/qa/shared-inventory-view-browser.mjs`, podľa potreby nový spoločný `scripts/qa/inventory-browser-harness.mjs`, tento todo a existujúci plan súbor. Nevkladať screenshots do produkčného kódu ani do shared komponentov.

### Checkpoint 11: Shared migrácia pripravená na odovzdanie
- [ ] T20–T30 majú splnené kritériá, focused overenie a atomické commity; do reportu sa nepočíta prerušený alebo zlyhaný beh ako úspech.
- [ ] Resources aj Identity a ostatní konzumenti používajú spoločné shared komponenty; rovnaký vizuálny defekt nezostal v nepreverenej položke matice.
- [ ] Report obsahuje presné príkazy, browser dôkazy, zoznam standalone výnimiek, limity backend fixtures/zoom a stav celej suite/build.
- [ ] Používateľ skontroloval hotový vzhľad aspoň na Identity a Resources. Túto ľudskú kontrolu agent nezaškrtáva za používateľa.
