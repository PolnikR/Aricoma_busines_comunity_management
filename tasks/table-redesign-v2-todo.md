# Redizajn tabuliek v2 (variant B): úlohy

Plán: [table-redesign-v2-plan.md](table-redesign-v2-plan.md).
Stav: implementácia nezačala.

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
