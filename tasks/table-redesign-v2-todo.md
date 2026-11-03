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

Rozsah, matica stránok a rozhodnutia: [fáza 5 plánu](table-redesign-v2-plan.md#fáza-5-spoločné-shared-view-pre-všetky-inventory-stránky-t20t30). T20–T30 boli spustené pokynom používateľa executing-plans inline. Nadväzujú na overené Resources a odstránia rozdvojenie rámovania oproti Identity a ostatným inventory stránkam. Pri každom kroku focused ESLint, `git diff --check`, záznam výsledkov a atomický commit len vlastných zmien. Historické CP1–CP6 sa týmto neuzatvárajú.

### T20: Scoped dedenie rámovania panelov

**Popis:** Zaviesť malý shared kontext frame/navigation kompozície a resolver rámika v paneli/skeletone. Default mimo view zostane standalone; zatiaľ bez aktivácie v existujúcom shelli.
**Akceptačné kritériá:**
- [x] `DataTableSurface`, `DataTableSkeleton` a `InventoryPanel` rešpektujú poradie explicitný frame → nearest scope → standalone mimo scope; `InventoryPanel` neprepisuje chýbajúci prop pevným defaultom.
- [x] Dedenie funguje aj cez obyčajný vnorený feature wrapper, explicitný standalone override ostane platný a nemení query ani stav tabuľky.
- [x] Context modul obsahuje iba kompozičné hodnoty/hooky bez feature importov, dátového modelu, DOM detekcie a barrel cyklu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2`; doplniť focused integračný prípad v Surface teste pre implicitný/explicitný frame a loading status.
**Závislosti:** hotové T13–T19.
**Súbory (M, 5):** nový `src/shared/components/inventory-shell/InventoryCompositionContext.ts`, `src/shared/components/data-table/DataTableSurface.tsx`, `DataTableSkeleton.tsx`, `src/shared/components/inventory-shell/InventoryPanel.tsx`, `DataTableSurface.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 14 testov PASS; focused ESLint PASS. Kontrola standalone/embedded dedenia, override a loading statusu.

### T21: Jediná shared implementácia view frame

**Popis:** Vytvoriť shared `InventoryViewFrame` podľa hotovej resource karty a pripraviť scoped prezentáciu hlavnej navigácie. Frame poskytuje embedded scope obsahu a oddelený navigation scope iba tabs slotu.
**Akceptačné kritériá:**
- [x] Jeden shared komponent vlastní rámik, pozadie, polomer, tieň, `data-inventory-view` a jednu deliacu čiaru; nevykonáva fetch ani nerozhoduje o provideroch/view modeloch.
- [x] `Tabs` dedí embedded vzhľad iba v hlavnom navigation slote; vlastný explicitný appearance a vnútorné detailové tabs zachovajú svoju prezentáciu a klávesnicové správanie.
- [x] Loading/error/empty obsah má ten istý pomenovaný view región, bez masky/orezania vonkajších rohov; frame umožní zachovať existujúci lower-bound kontrakt shellu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/inventory-shell/InventoryViewFrame.test.tsx src/shared/components/tabs/Tabs.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx --maxWorkers=2` (prvý test je nový); overiť reálnu kompozíciu s panelom cez wrapper a nezávislosť navigation/content scope.
**Závislosti:** T20.
**Súbory (M, 4):** nový `src/shared/components/inventory-shell/InventoryViewFrame.tsx`, nový `InventoryViewFrame.test.tsx`, `src/shared/components/tabs/Tabs.tsx`, `Tabs.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 14 testov PASS; focused ESLint PASS. Navigacny scope oddeleny od content scope.

### Checkpoint 7: Shared kontrakty pripravené
- [x] T20/T21 overené bez aktivácie nového defaultu vo všetkých stránkach; pôvodný samostatný panel funguje mimo scope.
- [x] Frame a navigation scope sú nezávislé, explicitné override sú otestované a shared rámik má jediný zdroj CSS.
- [x] Žiadna tabuľka nepotrebuje poznať konkrétnu feature stránku alebo čítať DOM svojich potomkov.

### T22: Resources ako prvý konzument shared frame a viewportu

**Popis:** Presunúť overený resource viewport s gutterom do shared `InventoryViewportFrame` a resource kartu skladať cez shared `InventoryViewFrame`. Aktualizovať QA marker; zachovať už dodaný vzhľad pred aktiváciou ostatných konzumentov.
**Akceptačné kritériá:**
- [x] `ResourceInventoryShell` už nekopíruje CSS rámika; resource metriky, notice, tabs a všetky stavy sa skladajú cez nový shared frame.
- [x] `ResourceViewportFrame` je tenký obal shared viewportu; nadpis a karta majú spoločné zarovnanie a overený priestor pre tieň.
- [x] Existujúca 64-prípadová resource QA používa `data-inventory-view` a zachová výsledky vrátane rohov, tieňa, krátkeho okna a troch smoke routes migrovaných na shared frame. Standalone fallback sa overí mimo InventoryShell.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/page/ContainedViewportFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2` (existujúci ContainedViewportFrame test; nový class-string test sa nepridával); `node scripts/qa/inventory-view-table-browser.mjs`.
**Závislosti:** T21.
**Súbory (M, 5):** nový `src/shared/components/page/InventoryViewportFrame.tsx`, nový `InventoryViewportFrame.test.tsx`, `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `ResourceViewportFrame.tsx`, `scripts/qa/inventory-view-table-browser.mjs`.

**Priebeh (2026-11-03):** Implementovane: spolocny frame a viewport. Focused Vitest 3 subory / 7 testov PASS; focused ESLint PASS; Chrome quick PASS. Plna matica prerusena CDP screenshot timeoutom, zopakuje sa samostatne v T30. Viewport nema ziadnu novu logiku; namiesto class-string testu sa pouziva existujuci ContainedViewportFrame test a realna geometria.

### T23: Spoločný InventoryShell pre všetky inventory view

**Popis:** Nahradiť staré CSS skladanie v `InventoryShell` explicitným shared view frame. Resource shell sa vráti na tenký obal toho istého `InventoryShell`; metriky, notice a spacing bude skladať spoločná vrstva.
**Akceptačné kritériá:**
- [x] Všetkých 11 priamych konzumentov shellu získa rovnakého vlastníka rámika a ich panely automaticky zdedia embedded scope bez povinných props na každej tabuľke.
- [x] Zo shellu zmizne `:has`/`group-has` rámovanie a odoberanie horných okrajov potomkom; shared `VirtualMachinesSkeleton` použije rovnaký frame a vnorený skeleton.
- [x] Zachované sú accessible region name, metriky/notice mimo karty, `compactSpacing` a `surfaceMinHeightClassName`; resource wrapper nemá vlastný frame markup ani business logiku.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/inventory-shell/InventoryViewFrame.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx --maxWorkers=2`; smoke Identity Users a Resources v Chrome.
**Závislosti:** T22.
**Súbory (M, 4):** `src/shared/components/inventory-shell/InventoryShell.tsx`, `InventoryShell.test.tsx`, `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`, `ResourceInventoryShell.test.tsx`.

**Priebeh (2026-11-03):** Implementovane: vsetci InventoryShell konzumenti skladaju InventoryViewFrame, resource wrapper je tenky. Focused Vitest 4 subory / 12 testov PASS; focused ESLint PASS. Typecheck a browser sa zaznamenaju v checkpointoch.

### Checkpoint 8: Spoločný shell aktívny
- [x] `npm.cmd run typecheck` a focused kontroly T22/T23 prešli.
- [x] Resources aj Identity skutočne renderujú ten istý shared frame; root CSS rámika sa nenachádza v resource feature súbore.
- [x] Feature navigačné prepisy a viewporty, ktoré ešte čakajú na T24–T29, sú evidované; tento medzistav sa neodovzdá ako hotová globálna migrácia.

### T24: Identity & access cez spoločnú kompozíciu

**Popis:** Zapojiť shared viewport, odstrániť povrchové CSS prepisy hlavnej Identity navigácie a upraviť primárny `IdentityContentPanel`, aby rešpektoval frame scope. Preveriť listové aj formulárové/detailové vetvy tej istej stránky.
**Akceptačné kritériá:**
- [x] Users, Clients a Application roles majú spoločný súvislý frame, priehľadný pás view s jediným oddeľovačom a celý tieň; neexistuje vlastná Identity kópia view frame.
- [x] Primárne Identity settings/detailové panely sa vložia do view bez druhej karty; zámerne nezávislé detailové/portal karty majú konkrétny standalone override, ak ho potrebujú.
- [x] Zachované sú URL/sekcia/tab/entity navigácia, loading/fatal/cached error, retry, otvorenie detailu a scrollovanie dlhého formulára/tabuľky vrátane krátkeho okna.
**Overenie:** `npm.cmd exec -- vitest run src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx src/features/platform-administration/identity-access/components/IdentityAccessNavigation.test.tsx src/features/platform-administration/identity-access/components/IdentityResourceLayout.test.tsx src/features/platform-administration/identity-access/components/UsersSection.test.tsx src/features/platform-administration/identity-access/components/ClientsSection.test.tsx src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx --maxWorkers=2`; browser Users/Clients/Application roles a aspoň jeden dostupný settings/detailový view.
**Závislosti:** T23.
**Súbory (M, 5):** `src/features/platform-administration/identity-access/pages/IdentityAccessPage.tsx`, `components/IdentityAccessNavigation.tsx`, `components/IdentityResourceLayout.tsx`, `pages/IdentityAccessPage.test.tsx`, `components/IdentityResourceLayout.test.tsx` v tom istom feature adresári. Ďalšie zistené nezávislé výnimky rozčleniť pred rozšírením kroku.

**Priebeh (2026-11-03):** Implementovane: Identity zdiela viewport/frame, hlavne tabs dedia embedded a IdentityContentPanel respektuje scope. Focused Vitest 6 suborov / 72 testov PASS; focused ESLint PASS. Browser overenie cez izolovany auth stub v T30.

### T25: Recovery view navigácie

**Popis:** Pre Recovery runs a spoločný Recovery policies shell použiť shared viewport a zdedenú prezentáciu hlavnej navigácie. Tabuľkové komponenty budú rámovanie dediť zo spoločného shellu.
**Akceptačné kritériá:**
- [x] Runs aj Snapshot/Application recovery/Clean room policy view majú jeden frame a jednu čiaru pod tabs; žiadne lokálne bg/border pravidlo nepremaľuje horný oblúk.
- [x] Prepínanie view a existujúce query, retry, refresh a policy akcie fungujú bez zmeny modelu; bez tabs nevznikne prázdny navigation slot.
- [x] História/detail ostáva funkčný, pagination a relevantné formulárové/dátové viewporty sú dostupné pri 1280×600 a na mobile.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx --maxWorkers=2`; browser všetky tri policy typy a runs view/detail.
**Závislosti:** T23.
**Súbory (M, 5):** `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.tsx`, `RecoveryPolicyPageShell.test.tsx`, `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`, `RecoveryRunsTable.test.tsx`. Posledné dva súbory doplnené po browser reprodukcii nefunkčného source Retry; zachovanie tejto akcie je súčasť kritérií T25.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 3 subory / 25 testov PASS; focused ESLint PASS. Povodna assertion lokalneho bg/border override aktualizovana na shared navigation kontrakt; funkcne kontroly zachovane.

**Priebeh (2026-11-03):** Doplnok po browser reprodukcii: opraveny existujuci source Retry callback, RED SyntheticBaseEvent -> GREEN Vitest 3 subory/25 testov a opakovany komponent 1 subor/8 testov PASS. Focused ESLint PASS; browser retry-success PASS. Samostatny fix commit.

### T26: Discovery settings formulár aj história

**Popis:** Zapojiť shared viewport/navigáciu v Discovery settings. Configuration primárny formulár dostane embedded prezentáciu `SettingsSectionCard` v tomto konkrétnom použití; History tabuľka prevezme shared frame scope automaticky.
**Akceptačné kritériá:**
- [x] Configuration aj History používajú rovnaký view frame a ich prepnutie nemení počet obvodových rámikov ani polohu navigácie.
- [x] `SettingsSectionCard` má explicitný embedded režim pre primárny formulár, pričom ostatné samostatné settings karty zachovajú dnešný default a vnútorné sémantické členenie.
- [x] Save/cancel/discard, request chyby a retry, dlhý formulár a History footer sú dostupné; existuje správny scroll owner pre každý typ obsahu.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/settings/SettingsSectionCard.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.stubfetch.test.tsx src/features/discovery-inventory/discovery-settings/components/DiscoveryHistoryCard.test.tsx --maxWorkers=2`; Chrome Configuration/History a neuložené zmeny.
**Závislosti:** T23.
**Súbory (M, najviac 5):** `src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.tsx`, `DiscoverySettingsPage.test.tsx`, `src/shared/components/settings/SettingsSectionCard.tsx`, `SettingsSectionCard.test.tsx`, prípadne `DiscoveryHistoryCard.test.tsx` pri zámernej zmene existujúcej layout assertion.

**Priebeh (2026-11-03):** Implementovane: Configuration formular embedded, History dedenie, spolocny viewport. Focused Vitest 4 subory / 28 testov PASS; focused ESLint PASS. Ostatne SettingsSectionCard defaulty ostali standalone.

### Checkpoint 9: Všetky view s hlavnými záložkami
- [x] Identity, Recovery runs/policies, Discovery settings a Resources používajú jeden shared frame a zdedenú vloženú navigáciu.
- [x] Dátový viewport, hlavná navigácia a vnútorné detailové tabs majú oddelené zodpovednosti; neexistuje duplicitný nav render ani neplatné ARIA odkazy.
- [x] Každá položka bola overená aj mimo úspešného zoznamu; zistené nezávislé vnútorné karty sú explicitne zapísané.

### T27: Provider a credential zoznamy

**Popis:** Zjednotiť viewport Platform providers, Providers a Credentials. Ich existujúce tabuľkové panely zdedia framing zo spoločného shellu, bez feature CSS pre rámik.
**Akceptačné kritériá:**
- [x] Všetky tri stránky majú jeden frame bez tabs, celé rohy a tieň a spoločné zarovnanie nadpisu/karty; nevznikne prázdny navigačný riadok.
- [x] Existujúce CRUD/modal/detail, hľadanie a stránkovanie zostanú funkčné; loading/error/empty sú obsahom spoločnej karty.
- [x] Krátky a dlhý zoznam funguje na desktope i mobile bez horizontálneho scrollu dokumentu a bez orezanej pätičky.
**Overenie:** `npm.cmd exec -- vitest run src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx --maxWorkers=2`; Chrome všetky tri routes.
**Závislosti:** T23, CP9.
**Súbory (M, 5):** `src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.tsx`, `PlatformProvidersPage.test.tsx`, `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`, `ProvidersPage.test.tsx`, `src/features/providers-connectors/credentials/pages/CredentialsPage.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 5 suborov / 67 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### T28: Recovery application a group zoznamy

**Popis:** Presunúť oba zoznamy na shared viewport pri zachovaní spoločného shellu a existujúcich notice a akcií.
**Akceptačné kritériá:**
- [x] Obe stránky majú jeden spoločný frame bez lokálnej kópie rámovania; notice ostáva mimo karty podľa kontraktu shellu.
- [x] Create/edit/detail, delete/rollback a prechody na builder zachovajú doterajšie správanie; layoutová migrácia nemení orchestration ani mutation logiku.
- [x] Loading/error/empty a krátky/dlhý zoznam zachovajú dostupný footer, správny scroll a priestor na tieň.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx --maxWorkers=2`; browser oba zoznamy a návrat z buildera bez zápisov do živého backendu.
**Závislosti:** T23, CP9.
**Súbory (M, 4):** `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`, `RecoveryApplicationsListPage.test.tsx`, `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`, `RecoveryGroupsListPage.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 4 subory / 88 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### T29: Policy sets a Audit

**Popis:** Dokončiť zvyšné priame konzumenty InventoryShell zapojením spoločného viewportu. Audit overí dedenie aj cez `InventoryPanel`, Policy sets cez priamy `DataTableSurface`.
**Akceptačné kritériá:**
- [x] Obe routes používajú ten istý shared frame a bez tabs nekreslia navigačný pás; embedded režim sa zdedí cez obe panelové cesty.
- [x] Audit dotazovací toolbar/hustota a Policy Set modal/refresh po mutation zostanú funkčné; request stavy nevytvoria ďalšiu kartu.
- [x] Dlhé logy aj krátke Policy sets majú správny scroll owner, celý tieň a dostupné ovládanie pri krátkom okne a na mobile.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/platform-administration/audit/pages/AuditPage.test.tsx src/features/platform-administration/audit/components/AccessLogsTable.test.tsx --maxWorkers=2`; Chrome obe routes.
**Závislosti:** T23, CP9.
**Súbory (M, 4):** `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`, `PolicySetsPage.test.tsx`, `src/features/platform-administration/audit/pages/AuditPage.tsx`, `AuditPage.test.tsx`.

**Priebeh (2026-11-03):** Implementovane. Focused Vitest 4 subory / 37 testov PASS; focused ESLint PASS. Vsetky produkcne zmeny preverene npm.cmd run typecheck PASS.

### Checkpoint 10: Celá matica migrovaná
- [x] Každý z 11 priamych konzumentov InventoryShell a resource wrapper má výsledok v matici; žiadna položka nezostala pri starom skladaní rámika.
- [x] Header aj view sú v shared viewport kompozícii, všetky feature špecifiká sú dáta/obsah/akcie a existujúce spacing/floor voľby.
- [x] `npm.cmd run typecheck`, focused lint a cielené regresie T24–T29 prešli; samostatné panely mimo view majú stále standalone default.

### T30: Browser matica a audit úplnosti shared migrácie

**Popis:** Rozšíriť existujúcu CDP kontrolu o celú maticu konzumentov a potvrdiť, že oprava žije v shared vrstve. Spoločný browser transport/merania extrahovať iba v rozsahu potrebnom pre resource a nové inventory prípady.
**Akceptačné kritériá:**
- [x] Každá položka matice má pomenovaný výsledok a screenshot/meranie; plná geometrická matica reprezentatívnych view a minimálne desktop/mobil oboch tém ostatných routes potvrdí jeden frame, jednu čiaru, celé rohy/tieň a zarovnanie.
- [x] Request stavy, retry/cache, list/form/detail navigácia, dlhé dáta, formulárové footery a standalone mimo scope sú overené validnými lokálnymi fixtures; externé požiadavky sú blokované a reálny backend sa nemení.
- [x] Zdrojový audit potvrdí jedinú implementáciu view frame/viewportu, tenké resource wrappery a absenciu starého `:has` rámovania či feature kópií; výsledkový report pomenúva limity a každý neoverený stav.
**Overenie:** `node scripts/qa/inventory-view-table-browser.mjs` a nový `node scripts/qa/shared-inventory-view-browser.mjs`; `node --check` nad zmenenými QA skriptmi; focused ESLint, `git diff --check`, kontrola scope cez `rg -l '<InventoryShell\b' src -g '*.tsx' -g '!*.test.tsx'` a zodpovedajúcu kontrolu `InventoryViewFrame`/`InventoryViewportFrame`/legacy selectors. Celá suite a build iba pri preukázanom dôvode podľa AGENTS.md.
**Závislosti:** T20–T29, CP10.
**Súbory (M, najviac 5):** `scripts/qa/inventory-view-table-browser.mjs`, nový `scripts/qa/shared-inventory-view-browser.mjs`, podľa potreby nový spoločný `scripts/qa/inventory-browser-harness.mjs`, tento todo a existujúci plan súbor. Nevkladať screenshots do produkčného kódu ani do shared komponentov.

**Priebeh (2026-11-03):** Dokoncene: resource64 PASS; shared geometry96 + interactions88 PASS, union180, oba completed:true, nula runtime/API/asset/navigation chyb. node--check a focused ESLint oboch QA skriptov PASS; source a QA review bez zavaznych nalezov. Report a checkboxy aktualizovane, ludska akceptacia ostava otvorena.

### Checkpoint 11: Shared migrácia pripravená na odovzdanie
- [x] T20–T30 majú splnené kritériá, focused overenie a atomické commity; do reportu sa nepočíta prerušený alebo zlyhaný beh ako úspech.
- [x] Resources aj Identity a ostatní konzumenti používajú spoločné shared komponenty; rovnaký vizuálny defekt nezostal v nepreverenej položke matice.
- [x] Report obsahuje presné príkazy, browser dôkazy, zoznam standalone výnimiek, limity backend fixtures/zoom a stav celej suite/build.
- [ ] Používateľ skontroloval hotový vzhľad aspoň na Identity a Resources. Túto ľudskú kontrolu agent nezaškrtáva za používateľa.


## Výsledok fázy 5 (2026-11-03)

Implementácia prebehla inline v existujúcom worktree po pokyne používateľa. Jeden `InventoryViewFrame` vlastní obvod, pozadie, rohy, tieň a divider navigácie. `InventoryShell` ho používa pre všetkých 11 priamych konzumentov; resource shell a viewport sú tenké adaptéry. `InventoryViewportFrame` poskytuje spoločné zarovnanie headera a karty a 8 px gutter. Feature komponenty dodávajú obsah, dáta a akcie. Hlavné view tabs dedia embedded vzhľad iba v navigation slote, vnútorné detailové tabs svoj default.

Panely a skeletony používajú explicitný frame → nearest context → standalone mimo view. IdentityContentPanel rešpektuje rovnaký scope. Iba primárna Discovery Configuration karta má explicitný embedded režim SettingsSectionCard; Notifications a ostatné nezávislé settings karty si ponechali standalone default. Audit portalov nenašiel prípad vyžadujúci ďalší override. Nevznikla globálna maska/orezanie rohov ani DOM detekcia cez :has. Hustota a obsahová výška riadkov, toolbar, pagination a header z revertovaných T5–T7 sa neobnovovali.

### Focused overenie

Príkazy Vitest uvedené pri T20–T29 boli vykonané s `npm.cmd exec -- vitest run <explicitné súbory> --maxWorkers=2`:

| Krok | Súbory | Testy | Výsledok |
|---|---:|---:|---|
| T20 | 3 | 14 | PASS |
| T21 | 3 | 14 | PASS |
| T22 | 3 | 7 | PASS |
| T23 | 4 | 12 | PASS |
| T24 | 6 | 72 | PASS |
| T25 | 3 | 25 | PASS |
| T26 | 4 | 28 | PASS |
| T27 | 5 | 67 | PASS |
| T28 | 4 | 88 | PASS |
| T29 | 4 | 37 | PASS |

Počty sa nesčítavajú na unikátne testy: niektoré shared testy sa zámerne opakujú. Focused ESLint zmenených zdrojov/testov prešiel pri každom kroku. `npm.cmd run typecheck` prešiel na CP8 aj po dokončení všetkých produkčných migrácií. Existing ContainedViewportFrame test a browser geometria overujú presun viewportu; nepridával sa test, ktorý by iba kopíroval CSS class string. RecoveryPolicyPageShell mal jednu assertion starého lokálneho bg/border override: po zámernej zmene vlastníka štýlu bola aktualizovaná, ostatné behaviorálne assertions zachované a celý focused súbor opäť prešiel.

Read-only review `12e40104..9e0e2021` nenašlo závažný nález. Zdrojový audit cez `rg -l '<InventoryShell\b' src -g '*.tsx' -g '!*.test.tsx'` potvrdil 11 priamych feature konzumentov a resource wrapper. Všetci majú shared viewport; frame CSS je iba v shared vlastníkovi a legacy framing selectors v shelli chýbajú.

### Browser overenie a limity

- `node scripts/qa/inventory-view-table-browser.mjs` — 64 geometry captures PASS, exit 0. Výstup `%TEMP%/abco-resource-final-qa/results.json` a PNG v rovnakom adresári. Po globálnej migrácii sú posledné tri pôvodne standalone routes správne shared smoke prípady; genuine standalone sa testuje osobitne v shared skripte.
- `node scripts/qa/shared-inventory-view-browser.mjs --geometry-only` — 96 záznamov PASS, `completed:true`. Výstup `%TEMP%/abco-shared-inventory-geometry-final-qa/results.json` a 99 PNG.
- `node scripts/qa/shared-inventory-view-browser.mjs --interactions-only` — 88 záznamov PASS, `completed:true`. Výstup `%TEMP%/abco-shared-inventory-interactions-final-qa/results.json` a 92 PNG. Tento beh už overuje opravený Recovery runs source Retry.
- Štyri standalone prípady sú spoločné obom behom: zjednotenie obsahuje **180 unikátnych shared prípadov**. Oba dokončené behy majú nula runtime exceptions, neočakávaných API/externých originov, chybných assetov a navigation diagnostics. Predchádzajúce prerušené kombinované behy nie sú vykazované ako úspešný full run.
- `node --check scripts/qa/inventory-view-table-browser.mjs`, `node --check scripts/qa/shared-inventory-view-browser.mjs`, `npm.cmd exec eslint -- scripts/qa/inventory-view-table-browser.mjs scripts/qa/shared-inventory-view-browser.mjs --max-warnings 0`, `git diff --check` — PASS.
- Finálne PNG Identity light desktop/dark mobile, Resources dark 1280×600, Discovery short-window footer, Recovery runs retry-success a standalone Recovery actions history boli aj vizuálne prezreté. Short-window footer screenshot ukazuje Save a zachované horné záložky; Retry screenshot ukazuje úspešné načítanie aplikácie aj skupiny. Zdrojový aj QA read-only review bez závažných nálezov.

Testy používajú izolovaný headless Chrome/CDP9357 a Vite5191, validné vymyslené lokálne fixtures a blokovanie externých originov. Identity má AUTH_ENABLED=true a iba v QA nahradený localhost Keycloak adapter modul; reálne účty/tokeny ani autentifikácia sa netestujú. 125 % je emulácia CSS viewport/raster scale, nie native browser zoom. CRUD submissions a reálna orchestrácia nie sú predmetom browser geometrie; existujúce behaviorálne focused testy zostali zachované. Screenshots/geometry nenahrádzajú screen-reader ani pixel-perfect contrast audit.

Browser osobitne nepreveril cached refresh latest-run buniek a Discovery konfigurácie ani standalone loading/skeleton. Shared browser matica overuje cached refresh na desiatich listových view; Resources má vlastnú lifecycle maticu. Standalone loading/skeleton defaulty a správanie konfiguračného formulára pokrývajú focused komponentové/stránkové testy. CRUD a návraty z buildera sa neposielali do živého backendu.

Browser odhalil existujúci problém Recovery runs source Retry, prítomný už v `12e40104`: callback s voliteľným riadkom dostával priamo click event. Page ho vyhodnotila ako riadok a nespustila refetch zoznamov. T25 doplnené o jediný wrapper `onRetry: () => onRetry()` a regresnú assertion nad reálnym klikom. RED beh preukázal `SyntheticBaseEvent` namiesto prázdnych argumentov; výsledok GREEN a samostatný commit sú zaznamenané pri T25. Pôvodná hypotéza, že ide iba o čakanie na povolenie Retry, nestačila; následný probe overil hit target a nulové refetch požiadavky a identifikoval skutočnú príčinu.

Resource regresia bežala vo vlastnej izolovanej Chrome inštancii na CDP9358. Pri diagnostike screenshotov sa preukázalo, že Chrome `captureBeyondViewport:true` resetoval vnútorný scrollTop zo 111 na 0. Oba QA skripty preto zachytávajú skutočný viewport cez `captureBeyondViewport:false`; shared formulárová kontrola navyše overuje zachovanie polohy po screenshote. Ide o opravu zberu QA dôkazov, nie zmenu scrollovania aplikácie. Expired script initializer a nedokončená navigácia majú úzko ohraničenú CDP diagnostiku/recovery; geometry assertions sa nepreskakujú.

Pri vývoji QA sa pôvodná požiadavka na stále viditeľné Save opravila na skutočnú dostupnosť cez interné posúvanie formulára. Discovery pri nízkom okne posúva celý formulár vrátane footeru; kontroluje sa dosiahnutie Save kolieskom, stabilná hlavná navigácia a neposunutý desktop dokument. Zlyhané či prerušené pokusy sa nepočítajú ako úspešné dokončené behy. Kompletná test suite, full lint a production build neboli spustené podľa focused pravidiel AGENTS.md.

### Commity fázy 5

T20 d9ee4fde; T21 ad139c36; T22 3e610f84; T23 c30ff931; T24 5148738a; T25 6ef80b26; T26 b36ad491; T27 f9f32f1c; T28 038be82a; T29 9e0e2021; doplnok source Retry 8d74eeac. T30 obsahuje finálne QA skripty a tento report; hash je v Git histórii. Po Retry doplnku znovu prešli focused ESLint, komponentový test aj `npm.cmd run typecheck`. Predexistujúci routeContract snapshot nebol zahrnutý. Worktree zostáva na pôvodnej vetve test; bez push/merge. Ľudská vizuálna akceptácia v CP11 zostáva otvorená.

## Fáza 6: Provider lišta a viac tagov — T31–T41

Plán: fáza 6 v table-redesign-v2-plan.md. **Stav: prebieha inline podľa pokynu executing-plans.** Používateľ potvrdil OR: VM má aspoň jeden zo zvolených tagov. Vykonanie celého plánu používateľ následne schválil pokynom executing-plans inline. Predchádzajúce checkboxy sa nemenia. Každý krok končí focused overením, diff check a atomickým commitom vlastných zmien; dokumentačný záznam je spoločný plán/todo.

### T31: Overiť úplnosť inventory kontraktu

**Popis:** Zaznamenať potvrdené OR a overiť úplnosť odpovede bez singular tag, backend aplikovanie provider konfigurácie, význam metriky a dopad na všetky volania resolvera. Najskôr uzavrieť dátové riziko; neliečiť ho len novou UI prezentáciou.
**Akceptačné kritériá:**
- [x] Rozhodnutie OR je zaznamenané; testovacia matica zahŕňa VM s prvým tagom, iba druhým tagom, oboma a žiadnym, s/bez prefixu.
- [x] Zdroj/kontrakt alebo overiteľná fixture potvrdzuje kompletný response pre provider/prefix bez tag a prípustný objem. Mock vytvorený podľa želaného správania nie je dôkazom backend kontraktu. Samotná existencia endpointu nestačí; zdokumentovať prípadné server pagination/limity a vlastné provider filtre backendu.
- [x] Pri nepotvrdení úplnosti vznikne konkrétna API/backend závislosť a samostatný rozpad pred T33; bez tichého prechodu na neúplný inventár či iba prvý tag.
**Overenie:** baseline `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts src/features/discovery-inventory/resources/model/inventoryQueries.test.ts --maxWorkers=2`; read-only kontrola OpenAPI/aktuálnych generated kontraktov a query implementácie, dôkazy zapísať do plánu. Žiadne živé mutácie.
**Závislosti:** T30.
**Súbory (S, 2):** existujúci plan/todo, aktualizácia kontraktového záznamu. Žiadny produkčný kód.

**Priebeh (2026-11-03):** Backendový source audit + existujúci full-response route potvrdené; focused baseline 3 súbory/13 testov PASS; Chrome 1k/10k VM PASS. Výkonový ruling a presné limity/dôkazy v pláne.

### T32: Zachovať celú normalizovanú množinu provider tagov

**Popis:** Upraviť existujúci resolver tak, aby filters.tags obsahovalo všetky platné unikátne tagy v stabilnom poradí. Singular tag ostane iba výslovne zdokumentovaný kompatibilný alias prvého tagu pre auditovaných konzumentov; nové UI ho nepoužije.
**Akceptačné kritériá:**
- [x] Trim prefixu/tagov, vynechanie prázdnych a presných duplicít; bez zmeny case. Žiadny prefix/tag znamená isFixed=false.
- [x] Fixed provider scope má prednosť pred URL/session a prenáša celé pole. Prefix-only/tag-only a existujúce single-tag prípady zostávajú správne.
- [x] Regresný test s VM iba s druhým tagom nezmizne vinou skrátenia poľa; nejde o tichú zmenu významu editable table filtrov.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.test.ts src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts --maxWorkers=2`; focused ESLint.
**Závislosti:** T31.
**Súbory (M, 4):** helpers/vmwareProviderFilter.ts a jeho test; helpers/resolveVmwareInitialFilters.test.ts; hooks/useVirtualMachineSearchParams.test.tsx v resource feature. Existujúci filterVirtualMachines test môže zostať read-only overením; ak vyžaduje zmenu, je piaty súbor.

**Priebeh (2026-11-03):** Implementovana cela normalizovana mnozina filters.tags (trim/dedupe, case-sensitive, stabilne poradie), singular alias zachovany. RED7 pripadov; parent fresh Vitest4subory/26testov PASS, focused ESLint PASS, read-only review clean. Pevny provider scope nad URL/session overeny.

### T33: Zosúladiť načítanie, OR výsledok a metriky

**Popis:** Po potvrdení T31 použiť existujúci single-tag server search pre jednu hodnotu; pre viac hodnôt úplný prefixový response a lokálny provider OR scope. Zaviesť malý feature helper pre OR predicate a odvodené scoped dáta. Scope aplikovať pred metrikami/filter options a až potom editable filtrami a pagination.
**Akceptačné kritériá:**
- [x] Requests neobsahujú CSV/JSON v string tag. VM iba s druhým tagom aj s oboma tagmi je vo výsledku presne raz, VM bez ktoréhokoľvek z nich nie; prefix zostáva súčasťou existujúceho request kontraktu.
- [x] Total, metriky a filter options patria celému provider scope, nie iba prvej stránke ani nezúženému response. Query cache zostáva validovaný wire response; role/provider/live refresh/placeholder dáta sa nemiešajú.
- [x] Background prefetch neoreže vmTags na prvý tag. Obe prefetch cesty a live refresh používajú rovnakú požiadavku a následný provider scope ako foreground.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/helpers/applyVmwareProviderTagScope.test.ts src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --maxWorkers=2`; focused lint. Overiť cached refresh aj zmenu tagov pri rovnakom prefixe.
**Závislosti:** T32 a kladný gate T31. Ak je potrebná zmena hook/model/API vrstvy nad rámec piatich súborov, najprv samostatný task, nie zväčšenie tohto kroku.
**Súbory (M, 5):** nový helpers/applyVmwareProviderTagScope.ts a test; components/vmware/VmwareResourcesPage.tsx a test; pages/ResourcesBackgroundPrefetch.integration.test.tsx. Ostatné uvedené testy sú regresie existujúcich ciest.

**Priebeh (2026-11-03):** Provider OR sa aplikuje na DiscoveryInventory pred metrikami/options/pagination. Background prefetch pouziva vsetky tagy. RED provider-scope a prefetch regresie; parent fresh focused6suborov/125testov PASS; focused ESLint PASS; nezavislyreviewclean. Raw cache zachovana; settled empty scope ma EmptyState.

### Checkpoint 12: Dátová pravdivosť
- [x] Kompletný response je doložený alebo je menovite zapísaná blokujúca API závislosť.
- [x] Potvrdené OR, všetky tagy, metriky a prefetch tvoria jeden overený kontrakt.
- [x] Žiadny UI krok neprezentuje nepoužité configured tagy ako aplikované načítanie.

### T34: Zachovať kontrakt dotknutých recovery-group konzumentov

**Popis:** Auditovať a podľa spoločného OR kontraktu upraviť ďalšie použitia resolvera v recovery-group vyhľadávaní a provider kartách. Zachovať rovnaký inventár pre rovnaký provider scope; nevytvárať nový builder UI redesign.
**Akceptačné kritériá:**
- [x] VMware hook nepresadí iba prvý tag ani neumožní rozšíriť pevný scope používateľským search. Zdrojové resource names aj metadata pochádzajú z rovnakého OR výsledku.
- [x] Provider karty ukazujú správny normalizovaný počet ďalších tagov; Power ostáva bez VMware tag filtrov.
- [x] Bez prefixu/tagov aj single-tag prípady zachovajú pôvodné správanie; žiadne generated/API/CRUD zmeny.
**Overenie:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/recovery-plans/recovery-groups/helpers/providerScopeDisplay.test.ts src/features/recovery-plans/recovery-groups/helpers/recoveryGroupSearchMode.test.ts --maxWorkers=2`; focused lint.
**Závislosti:** T33.
**Súbory (M, 4):** recovery-groups/hooks/useRecoveryGroupResourceInventory.ts a test; helpers/providerScopeDisplay.ts a nový providerScopeDisplay.test.ts. Použiť existujúci tag predicate z T33, nepridávať druhú OR implementáciu.


**Priebeh (2026-11-03):** Recovery group pouziva vsetky OR tagy pred resourceNames aj metadata; single-tag request optimalizacia zachovana. Karty pocitaju normalizovane unikatne tagy. Parent fresh3subory/50testov PASS, focused ESLint PASS, nezavislyreviewclean; raw cache a Power prefix-only zachovane. T34b builder prefetch nasleduje osobitne.

### T34b: Zosúladiť samostatné builder prednačítanie

**Popis:** Source audit našiel ďalší singular-tag prefetch v RecoveryGroupBuilder.tsx:128–150. Oddelený krok drží T34 pod limitom piatich súborov.
**Akceptačné kritériá:**
- [x] Builder prefetch použije celé normalizované filters.tags a getServerSideTagFilter; viac tagov nezúži na prvý a zdieľa query key s následným resource hookom.
- [x] Zero/single-tag a prefix-only optimalizácia ostávajú; zdrojový raw cache sa lokálnym OR neprepíše.
- [x] Zachované readiness, inventoryScopeKnown, závislosti efektu a žiadne nové zápisy/request fan-out.
**Overenie:** npm.cmd exec -- vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx --maxWorkers=2; focused ESLint.
**Závislosti:** T34.
**Súbory (S, 2):** recovery-groups/components/RecoveryGroupBuilder.tsx a RecoveryGroupBuilder.prefetch.test.tsx.

**Priebeh (2026-11-03):** Builder prefetch uz nepouziva singular alias prveho tagu; getServerSideTagFilter zo vsetkych tags, skalarnedependencies a readiness zachovane. Parent fresh2subory/46testov PASS, focused ESLint PASS, nezavislyreview APPROVE. Raw cache querykey reused bezfanout. Typecheck CP13 PASS.

### T35: Opt-in limit štyroch položiek v shared Tabs

**Popis:** Rozšíriť existujúci Tabs opt-in parametrom maxVisibleItems a rozmerom slotu cez lokálnu CSS premennú. Ostatní konzumenti zostávajú pri súčasnom defaulte.
**Akceptačné kritériá:**
- [ ] Na širokom okne štyri celé položky a žiadna piata; pri 1/2/3 položkách sa viewport zúži. Šípky sú mimo slotov a zobrazia sa iba pri overflow.
- [ ] Limitovaný režim posúva celé viditeľné sloty; disabled okraje, Home/End, ArrowLeft/ArrowRight, wrap-around, touch/wheel a dosunutie active tab fungujú aj po resize.
- [ ] Default Tabs a embedded navigation scope zostanú funkčné pre Identity/Recovery; bez novej masky alebo kreslenia ďalšieho dividera.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/tabs/Tabs.test.tsx src/shared/components/inventory-shell/InventoryViewFrame.test.tsx src/features/platform-administration/identity-access/components/IdentityAccessNavigation.test.tsx src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx --maxWorkers=2`; reálne rozmerové assertions v T41, nie unit kópia class stringu.
**Závislosti:** T30; nezávislé od T31 dátového gate.
**Súbory (S, 2):** shared/components/tabs/Tabs.tsx a Tabs.test.tsx.

**Priebeh (2026-11-03):** Implementovane opt-in4 sloty, zachovane defaulty/context. Parent fresh Vitest shared regresie 6 suborov/51 testov PASS (T35 samostatne4/18), focused ESLint PASS, read-only review clean. Presna browser geometria zostava T41. Ruling: 4x160px bez medzery=640px plni poziadavku; prototyp652px nie je pixelovy kontrakt.

### T36: Vlastný +N trigger existujúceho HelpPopover

**Popis:** Doplniť iba voliteľný triggerContent do overeného shared popoveru. Default help ikona a súčasná prístupnosť ostávajú zachované; +N využije rovnaký portal a umiestnenie.
**Akceptačné kritériá:**
- [x] Vlastný textový trigger má meno, aria-expanded a aria-controls a funguje klikom, klávesnicou a na touch.
- [x] Plný zoznam nie je tooltip dostupný len hoverom; Escape/outside click/focus return fungujú a umiestnenie rešpektuje obe hranice clientWidth a dostupnú výšku.
- [x] Existujúci help trigger a default ikonka sa nemenia. Žiadna nová popover knižnica ani druhý kopírovaný positioning systém.
**Overenie:** `npm.cmd exec -- vitest run src/shared/components/help-popover/HelpPopover.test.tsx src/shared/components/help-popover/KeyedHelpPopover.test.tsx --maxWorkers=2`; focused lint; portal/klávesnica aj v T41.
**Závislosti:** T30; nezávislé od T35.
**Súbory (S, 2):** shared/components/help-popover/HelpPopover.tsx a test.

**Priebeh (2026-11-03):** Implementovany kompatibilny triggerContent pre existujuci HelpPopover. RED5 novych pripadov, GREEN33testov; parent shared regresie spolu51 PASS, focused ESLint PASS, read-only review clean. Default helpicon/focus/portal zachovane.

### Checkpoint 13: Kompatibilné shared rozhrania
- [x] Dotknutí dátoví konzumenti nepoužívajú rozporuplný scope.
- [x] Opt-in Tabs a vlastný popover trigger prešli default regresiami.
- [x] npm.cmd run typecheck PASS; fokus a scoped navigation sú zachované.

### T37: Podmienky bez placeholderov a viac tagov

**Popis:** Upraviť existujúci VmwareProviderFilterSummary na celý normalizovaný scope; použije +N popover z T36.
**Akceptačné kritériá:**
- [x] None → null bez labelov/zámku/rezervy; prefix-only a tag-only zobrazia iba nastavenú položku. Žiadne Any ani pomlčky.
- [x] Pri piatich tagoch desktop ukáže dva a +3, úzky režim jeden a +4; panel obsahuje všetkých päť plných názvov. Počet sa počíta po normalizácii, nevznikajú duplicitné focusable triggery.
- [x] Zmena providera zatvorí starý panel; resize nestratí logický focus. Dlhé hodnoty sú dostupné klávesnicou aj čítačke; nejde o editable chips.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/components/vmware/VmwareProviderFilterSummary.test.tsx --maxWorkers=2`; fixtures none/prefix/tag/both/duplicates/long/5 tags; focused lint.
**Závislosti:** T32, T33, T36.
**Súbory (S, 2):** components/vmware/VmwareProviderFilterSummary.tsx a test.

**Priebeh (2026-11-03):** Summary bez Any/null rezervy, literal prefix, vsetky normalizovane tagy a jeden responsive+N cez sharedHelpPopover. Parent fresh15testov PASS, focused ESLint PASS, nezavislyreviewclean. Provider change zatvara panel, resizefocus/externalfocus/longvalue keyboard regions overene. Realna geometria zostavaT41.

### T38: Jedna resource navigačná kompozícia

**Popis:** V resource feature vytvoriť ResourceViewNavigation skladajúci shared Tabs vľavo a summary napravo. Je to prezentačná hranica spoločná source/target, bez fetch a vlastnej query logiky.
**Akceptačné kritériá:**
- [ ] Široký desktop zachová štyri sloty vľavo a pravý summary v tom istom páse. Pri chýbajúcom scope sa pravé miesto neuplatní. Nevznikne ďalší riadok/divider/rám.
- [ ] Menšie šírky zachovajú posúvanie a čitateľné hodnoty/popover; bez horizontálneho scrollu dokumentu, kruhového resize prepočtu alebo skrývania navigácie.
- [ ] Summary patrí vybranému VMware providerovi, nie poslednému response. Flash/Power, provider-list error a no-provider nekreslia falošné VMware podmienky.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/components/ResourceViewNavigation.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx --maxWorkers=2`; browser geometry v T41.
**Závislosti:** T35, T37.
**Súbory (S, 2):** nový components/ResourceViewNavigation.tsx a test.

**Priebeh (2026-11-03):** Jeden ResourceViewNavigation bez fetch: opt-in4 provider slots vlavo + len zodpovedajuci VMware scope napravo, bez prazdneho wrappera pri none. Parent fresh2subory/14testov PASS, focused ESLint PASS, reviewclean. Taglabel pouziva novepluralTags key. Responsive9rem/2xl10rem a badge-shrink0; realbrowserT41 nasleduje.

### T39: Zapojiť source aj target routes

**Popis:** Nahradiť duplicitné Tabs markup v ResourcesPage/ResourcesIsePage spoločným ResourceViewNavigation. Oba ďalej používajú InventoryViewFrame cez existujúci shell tabs slot.
**Akceptačné kritériá:**
- [ ] Oba routes majú rovnakú navigáciu; zachované poradie a provider badge, active fallback a všetky resource typy.
- [ ] Deep link/browser back/session/query role isolation ostávajú; provider switching počas loading/error/cached refresh ukazuje podmienky zvoleného providera.
- [ ] Šípky nespúšťajú výber providera alebo inventory request; skutočný výber nemení density či provider konfiguráciu. Bez duplicitnej summary nad tabuľkou.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx --maxWorkers=2`; focused lint.
**Závislosti:** T34, T38.
**Súbory (M, 4):** pages/ResourcesPage.tsx a test; resources-ise/pages/ResourcesIsePage.tsx a test.

**Priebeh (2026-11-03):** Oba routes pouzivaju ResourceViewNavigation, bez duplicity markup/fetch. Parent fresh4subory/69testov PASS, focused5fileESLint PASS, nezavislyreviewclean. Doplnkova table-scoped SECOND assertion zachovava povodny kontrakt; browserT41 nasleduje.

### Checkpoint 14: Jeden pripojený resource view
- [ ] Obe roly sú zapojené cez jeden komponent; shared frame zostal jediný.
- [ ] Prefix/tag/none/multi zodpovedajú vybranému providerovi aj v request stavoch.
- [ ] Focused regresie a npm.cmd run typecheck PASS; ostatné inventory stránky sa vizuálne nezmenili.

### T40: Preklady a odstránenie neúčinného renderu

**Popis:** Doplniť SK/CS/EN texty pre prefix, tags, +N, názov celého zoznamu a prístupné názvy. Odstrániť pôvodné odovzdávanie summary cez ignorované inventoryDescription vo VmwareResourcesPage.
**Akceptačné kritériá:**
- [x] Všetky tri locale majú rovnaké nové kľúče a správne interpolované počty; hodnoty tagov sa neprekladajú.
- [x] Summary sa renderuje iba raz v navigácii. Odstránené vlastné nepoužité importy; bez plošného odstraňovania legacy shell props u iných feature stránok.
- [x] Žiadne Any, duplicitný provider filter count, extra scope tlačidlo ani nový standalone frame; existujúce zamykanie filter controls sa bez ďalšej požiadavky nemení.
**Overenie:** `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareProviderFilterSummary.test.tsx --maxWorkers=2`; parser a key/content assertions pre tri JSON locale; focused lint.
**Závislosti:** T40a (preklady) pred T37/T38; T40b (starý render) po T39. Celá T40 sa uzavrie po oboch krokoch.
**Súbory (M, 5):** locales/sk.json, cs.json, en.json; components/vmware/VmwareResourcesPage.tsx a test.

**Priebeh T40a (2026-11-03):** 4 nove kluce v EN/SK/CS pripravene pred UI konzumentmi. JSON parse/unikatnost/count interpolacia/help.close PASS; parent obsahoveassertions PASS, nezavislyreviewclean. T40b odstranenie stareho renderu zostava po T39.

**Priebeh (2026-11-03):** T40a tri locale doplnene; T40b odstraneny obsolete import a ignored inventoryDescription. Parent fresh2subory/30testov PASS; focused ESLint a nezavislyreviewclean. Actual OR/metrics/lockedcontrols zachovane, summary iba v ResourceViewNavigation.

### T41a: Opraviť mobilnú čitateľnosť provider lišty

**Popis:** Reálny Chrome pri 320 px odhalil nulovú šírku prefix/tag hodnôt a iba 35 px provider viewport. Kompaktná úprava pod 640 px zachová jeden pás, celý provider badge a klávesnicou dostupné hodnoty; desktop zostane nezmenený.
**Akceptačné kritériá:**
- [ ] Pri 320 px sú prefix aj tag nenulové a aspoň jeden celý provider slot dostupný medzi šípkami; bez prekrytia a horizontálneho scrollu dokumentu.
- [ ] Plné prístupné názvy, +N, resize focus a provider-change dismissal zostávajú zachované; desktop má štyri sloty a pôvodný počet tagov.
**Overenie:** focused ResourceViewNavigation, VmwareProviderFilterSummary a Tabs testy; owned ESLint; reálny browser 320/1440 a finálna T41 matica.
**Závislosti:** T40, prvý T41 browser probe.
**Súbory (M, 4):** ResourceViewNavigation.tsx a test; VmwareProviderFilterSummary.tsx a test. Bez úprav shared Tabs alebo rámu.

**Priebeh (2026-11-03):** Mobile sameband responsivefix: whole5rembadge, sr-onlylabels,40percentmetadata; actualChrome320 prefix27px/tag28px/viewport82.8px PASS,1440unchanged. Parentfresh6files49testsPASS; ownedlint/reviewclean. T41b controlwidth required aspairedchange.

### T41b: Zachovať celý mobilný provider badge

**Popis:** Mobile 4rem slot by orezal Flash/Power badge. Ponechať 5rem slot; opt-in Tabs prijme CSS premennú --tab-control-width s existujúcim defaultom 2.25rem a resource mobile nastaví 1.75rem. Rozmer viewportu počíta dve skutočné šírky ovládania.
**Akceptačné kritériá:**
- [ ] Default Tabs a default control šírky ostanú nezmenené; limitovaný režim používa rovnakú premennú pre tlačidlá aj celkovú šírku.
- [ ] Resource pri 320 px ukáže celý krátky VMware/Flash/Power badge a nenulové prefix/tag hodnoty; desktop štyri sloty sa nemenia.
**Overenie:** focused Tabs a ResourceViewNavigation testy; owned ESLint; T41 browser 320/1440.
**Závislosti:** T41a, výsledná geometria sa akceptuje až po oboch krokoch.
**Súbory (S, 2):** shared/components/tabs/Tabs.tsx a Tabs.test.tsx.

**Priebeh (2026-11-03):** Opt-in --tab-control-width applies to botharrows andwrapper, default2.25rem preserved. Resource mobile28pxarrows+80pxslot actualChromePASS allshortbadges. Parentfresh6files49testsPASS; ownedlint/reviewclean. Finalfullbrowserregressions remainT41.

### T41c: Zohľadniť šírku klasického scrollbaru

**Popis:** Reálny Windows Chrome pri 320 × 844 px má 305 px použiteľnej šírky. Body min-w-80 vynucuje 320 px a vytvára vodorovný scroll dokumentu. Zmeniť body na min-w-0 a iba mobilné resource šípky na 1.5rem, aby pri 305 px ostal celý 5rem provider slot.
**Akceptačné kritériá:**
- [ ] Pri klasickom scrollbare je document scrollWidth rovné clientWidth, bez masky alebo overflow-x-hidden.
- [ ] Pri 305 px použiteľnej šírky sa zmestí celý 80 px slot, 24 px šípky a nenulové prefix/tag hodnoty; desktop default sa nemení.
- [ ] Globálny min-width fix prejde focused AppShell/shared testami a minimálnou browser maticou ostatných view.
**Overenie:** ResourceViewNavigation, Tabs, AppShell a InventoryViewFrame focused testy; typecheck; focused TSX ESLint a CSS parser; reálny forced-classic browser probe a shared minimum-width geometria.
**Závislosti:** T41a/T41b a nameraný T41 classic-scrollbar RED.
**Súbory (S, 2):** src/index.css; ResourceViewNavigation.tsx. Žiadne skrývanie overflow alebo nové frame pravidlá.

### T41: Browser matica a finálny audit

**Popis:** Rozšíriť existujúcu resource CDP kontrolu o štyri sloty a podmienky. Zachovať obidve shared/regresné sady bez kopírovania celého QA transportu alebo použitia živých mutácií.
**Akceptačné kritériá:**
- [ ] Dokončené prípady pre 0/1/2/4/5/10 providerov, none/prefix/tag/both, 1/2/5/long tags, všetky typy a source/target; request payload/VM iba s druhým tagom/metriky overujú OR. Mocks nefalšujú podporu poľa tag v API.
- [ ] Obe témy, 320/768/1024/1440, 1280×600 a emulácia 125 %; presné štyri desktop sloty, užší pás než karta, pravý summary bez ďalšieho desktop riadka, null bez rezervy, obe hranice popovera, klávesnica, touch/wheel a zachovaný dátový scroll.
- [ ] Report uvádza úspešne dokončené behy, PNG a limity; bez runtime výnimiek, neočakávaných endpointov alebo živých zápisov. Zdrojový audit potvrdí opt-in shared zmenu, tenké resource wrappery a jediný frame.
**Overenie:** `node scripts/qa/inventory-view-table-browser.mjs`; `node scripts/qa/shared-inventory-view-browser.mjs --geometry-only` a `--interactions-only` ako oddelené dokončené scope; `node --check` oboch skriptov; focused ESLint; `npm.cmd run typecheck`; `git diff --check`. Vitest opakovať len pri nových zmenách/zisteniach, nie plnú suite/build.
**Závislosti:** T40.
**Súbory (M, 4):** oba existujúce scripts/qa inventory skripty; tento todo a plan. Dôkazy PNG mimo produkčného zdroja.

### Checkpoint 15: Pripravené na odovzdanie
- [ ] T31–T41 overené a commitnuté; OR výsledok, metriky, cache a zobrazenie sú konzistentné.
- [ ] Staré historické checkboxy ani používateľské akceptácie sa automaticky neuzatvorili; nesúvisiaci routeContract snapshot nie je commitnutý.
- [ ] Report obsahuje presné focused príkazy, browser výsledky a stav plnej suite/build.
- [x] Používateľ schválil tento implementačný plán pokynom executing-plans inline (2026-11-03).
- [ ] Používateľ vizuálne akceptoval produkčný výsledok. Agent tieto dve ľudské položky nezaškrtáva.

### Phase 6 integration verification (in progress)

Parent fresh verification after T39/T40b: the exact T39 four-file command above passed 69 tests; exact T40 two-file command passed 30 tests; `npm.cmd run typecheck` passed after integration (exit 0). T39 independent spec/quality review and T40b cleanup review both approve, no required findings. T39 commit 40b728e6; T40b commit 11f08238. Browser T41 remains in progress; these unit results are not a browser geometry claim. Raw cache immutability is covered by focused query/component tests; browser will prove the full intercepted wire response and scoped rows/metrics, without adding a production introspection seam.

T41a/T41b integration typecheck initially found strict test-fixture typing errors (two unchecked array accesses, one explicit undefined optional prop). Corrected only these test fixtures, without suppressions or assertion removal. Parent fresh `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/components/ResourceViewNavigation.test.tsx src/shared/components/tabs/Tabs.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareProviderFilterSummary.test.tsx --maxWorkers=2`: 3 files / 42 tests PASS. Owned ESLint, independent scoped re-review and parent fresh `npm.cmd run typecheck` PASS. Production behavior unchanged.

Shared browser regression after phase6 source freeze: `node scripts/qa/shared-inventory-view-browser.mjs --geometry-only` PASS, 96 records, completed=true, %TEMP%/abco-phase6-shared-geometry-final/results.json. `node scripts/qa/shared-inventory-view-browser.mjs --interactions-only` PASS, 88 records, completed=true, %TEMP%/abco-phase6-shared-interactions-final/results.json. Both have zero runtime exceptions, unexpected endpoints/origins, failed assets, and navigation diagnostics. Four standalone records overlap, so this is 180 unique shared cases, not 184 unique cases. Dedicated Chrome/CDP9358 with a disposable profile; local fixtures only. Resource-specific T41 remains open until its complete run. Initial shared launch failed before connecting CDP9358; subsequent completed runs above are the evidence, not that startup attempt.

### Fáza 6 — focused overenie implementácie

Presné cesty a príkazy sú pri jednotlivých T31–T41 vyššie. Parent vykonal fresh overenie každého kroku pred commitom; počty sa nesčítavajú na unikátne testy, pretože regresné súbory sa opakujú.

| Krok | Súbory | Testy | Výsledok |
|---|---:|---:|---|
| T31 baseline | 3 | 13 | PASS |
| T32 normalizácia | 4 | 26 | PASS |
| T33 scope/metriky/prefetch | 6 | 125 | PASS |
| T34 recovery konzumenti | 3 | 50 | PASS |
| T34b builder prefetch | 2 | 46 | PASS |
| T35/T36 shared regresie | 6 | 51 | PASS |
| T37 summary | 1 | 15 | PASS |
| T38 navigačná kompozícia | 2 | 14 | PASS |
| T39 source/target routes | 4 | 69 | PASS |
| T40 cleanup + summary | 2 | 30 | PASS |
| T41a/T41b responsive + shared regresie | 6 | 49 | PASS |
| T41a/T41b strict fixture oprava | 3 | 42 | PASS |

Focused ESLint pre všetky zmenené TS/TSX súbory prešiel pri krokoch. `npm.cmd run typecheck` prešiel po shared kontraktoch, integrácii aj po oprave strict test fixtures. Finálne QA skripty a ich lint sú ešte predmetom T41; plná suite, full lint a production build sa podľa AGENTS.md nespúšťajú.

T41 QA diagnostic record: the initial 320px zero-width layout was a real product defect, fixed by d0adf183/5aec8c70. Later partial resource runs exposed harness issues: URL readiness before the new selected-provider DOM, DOM.focus on an inactive test page (document.hasFocus=false), and cached-refresh Retry notice located before the inventory frame. Native keyboard/focus assertions remain; the harness waits for current selected DOM and genuine page focus and scopes Retry to the actual alert. These failed/aborted attempts are not reported as completed passes. The final default resource command will include both the old matrix and every new phase6 scenario; its single completed run is the acceptance evidence, without requiring another duplicate full phase6-only replay.

T41c actual product verification: focused resource `--phase6-only --quick` completed 20 records after the real two-line source correction, %TEMP%/abco-phase6-classic-product-green-20261103/results.json. Both source and target with forced classic scrollbar at 320×844: innerWidth320 / clientWidth305 / scrollWidth305 / body min-width0; tab viewport81.8125≥80px slot; 24px controls; 25px prefix/tag value regions; +4 panel bounds and native keyboard PASS. This uses compiled production CSS, unlike the earlier diagnostic DOM patches. Focused four-file Vitest33 PASS, owned ESLint/PostCSS parse/typecheck PASS, independent scoped and whole-branch source review clean. Shared36 and full Resources166 remain T41 acceptance gates; no claim that those pending runs passed.
