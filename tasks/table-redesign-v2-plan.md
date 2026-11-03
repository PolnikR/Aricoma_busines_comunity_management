# Implementačný plán: Redizajn tabuliek v2 (variant B)

Dátum pôvodného plánu: 2026-11-02. Aktualizácia: 2026-11-03. Stav: fáza T13–T19 je implementovaná pre Resources. Nadväzujúca fáza T20–T30 plánuje spoločné shared rámovanie pre všetkých konzumentov inventory view vrátane Identity & access; táto fáza zatiaľ nebola implementovaná. Výsledky skorších úloh a nové úlohy sú v todo súbore.
Úlohy a checkpointy: [table-redesign-v2-todo.md](table-redesign-v2-todo.md).
Vizuálny vzor: prototyp https://claude.ai/artifact/SSm6HEN89RW3LJJ2PqdtmU (Platform providers).

## Cieľ a rozsah

Modernizovať tabuľkové stránky v existujúcich farbách aplikácie (`src/index.css`) tak, aby sa zmena preniesla na všetky stránky cez shared komponenty. Riešené problémy:

1. Dve hlavičky nad sebou s podobným obsahom: `TableToolbar` (nadpis stránky) a `InventoryShell` (`inventoryTitle` + `inventoryDescription`).
2. Pri krátkom zozname karta tabuľky nesiaha po spodok stránky a pod ňou ostáva prázdne miesto.
3. Zastaraný vzhľad hlavičky stĺpcov, riadkov, toolbaru, stránkovania a hlavičky stránky.

**Variant B:**
- Shared vrstva sa zmení pre všetkých konzumentov naraz.
- Nové zdieľané bunky (entita s iniciálou, farebný typ, kopírovateľný kód) sa zapoja len na Platform providers ako vzor.
- Ostatné stránky prejdú na nové bunky v samostatnom pláne.

**Mimo pôvodného rozsahu (rozšírenie pre Resources a Resources ISE je opísané vo fáze 4 nižšie):**
- zapojenie nových buniek mimo Platform providers,
- 8 tabuliek bez `DataTableSurface` (Identity & Access sekcie, Access logs, FlashSystem a Power inventory): zdedia len vzhľad `DataTable`,
- tabuľka na dashboarde (`IssuesDistribution`),
- triedenie stĺpcov,
- nový bočný panel detailu (`DetailView` ostáva).

## Východiskový stav (overené 2026-11-02 na `test` po merge `7d37317b`)

| Shared komponent | Konzumenti (mimo testov) |
|---|---|
| `DataTable` | 26 súborov |
| `DataTableSurface` | 19 |
| `DataTableToolbar` | 20 |
| `DataTablePagination` | 19 |
| `InventoryShell` | 12 stránok, 11 s `inventoryTitle`, 5 s `tabs` |
| `TableToolbar` (hlavička stránky) | 12 |
| `PageHeader` priamo | 13 |

- 11 tabuliek používa `layout="fit"` a 3 súbory prepisujú `headerCellClassName`/`cellClassName`. Pri vizuálnej kontrole na ne treba myslieť osobitne.
- Výška: routes s `contentScroll: 'contained'` dávajú obsahu výšku viewportu (`AppShell`) a reťazec `flex-1`/`lg:min-h-0` vedie až po `DataTableSurface`. Napriek tomu karta na screenshote nesiaha po spodok stránky. Príčina nie je známa, preto ide ako prvá úloha.
- Kopírovanie už rieši `DetailCopyButton` (`src/shared/components/detail-view/`) a filtrovanie podľa typu sa dá spraviť cez `useTableState({ predicate })` a `DataTableToolbar` `segments`.

## Architektonické rozhodnutia

- **Jeden spoločný default, žiadny opt-in pre každú stránku.** Nový vzhľad je predvolený vzhľad shared komponentov. Nepridávajú sa props typu `variant="modern"`.
- **Dvojitá hlavička sa rieši v `InventoryShell`.** Shell prestane vykresľovať `inventoryTitle` a `inventoryDescription` a `inventoryTitle` ostane ako `aria-label` sekcie. Riadok so `tabs` ostáva. Názov stránky nesie výhradne `TableToolbar`/`PageHeader`.
- **Prázdne miesto pod riadkami ostáva prázdne.** Pôvodná výplň s čiarami (T4) bola na žiadosť používateľa odstránená. Nová fáza ju neobnovuje. Výška riadkov zostáva podľa obsahu, s paddingom `py-1.5`/`py-2.5`, bez minima 56/72 px.
- **Nové bunky žijú v `src/shared/components/data-table/cells/`** a exportujú sa z `@/shared/components/data-table`. Kopírovanie používa existujúci `DetailCopyButton`.
- **Farby typov idú cez nové tokeny `--app-tone-1..4`** v `src/index.css`, so svetlou aj tmavou hodnotou. Mapovanie typu na tón určuje stránka, shared bunka pozná len tón.
- **Testy chránia správanie, nie CSS triedy:** prístupné mená, `aria-pressed`, `aria-current`, viditeľnosť nadpisu, kopírovanie, kliknutie na riadok. Existujúce testy, ktoré kontrolujú konkrétne triedy, sa upravia len tam, kde zmena triedy je zámer.

## Poradie a závislosti

```
T1 výška ──┐
T2 hlavička├─► CP1 ─► T3 DataTable ─► T4 výplň ─┐
           │                                     ├─► CP2 ─► T8 EntityCell+tóny ─► T10 Platform providers ─► CP3
           │          T5 toolbar ───────────────┤          T9 CopyableCode ───────┘          │
           │          T6 stránkovanie ──────────┤                               T11 filter typu (voliteľné)
           │          T7 hlavička stránky ──────┘                               T12 cleanup inventoryDescription
```

Riziková úloha T1 ide prvá. T5, T6 a T7 sú navzájom nezávislé a dajú sa robiť paralelne.

## Overovanie

- Pri každej úlohe: focused `npm exec vitest run <konkrétne testy>`, `npm exec eslint -- <zmenené súbory> --max-warnings 0` a `git diff --check`. Potom atomický commit.
- Na checkpointoch: `npm run typecheck` a `npm run lint`. Na CP2 a CP3 aj celé `npm test`, lebo zmena je prierezová (26 tabuliek).
- **Browser kontrola:** projekt nemá Playwright ani chrome-devtools MCP. Kontrolu v prehliadači na checkpointoch robí používateľ podľa zoznamu stránok v todo, prípadne sa pred T1 nakonfiguruje chrome-devtools MCP.

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Vizuálne regresie v 26 tabuľkách, najmä 11× `layout="fit"` a 3 override tried | Vysoký | Checkpointy s pevným zoznamom stránok na kontrolu; override súbory sa skontrolujú menovite |
| Príčina zlej výšky je v `AppShell` alebo v route frame, teda zasahuje všetky routes | Stredný | T1 najprv len diagnostikuje a opravu navrhne pred zásahom do `AppShell` |
| Na stránkach so záložkami (Identity, Recovery runs, Policy sets, Discovery settings, Recovery policies) zmizne názov sekcie | Stredný | Overiť v T2, že kontext nesie aktívna záložka; ak nie, ponechať titulok len pri `tabs` |
| Testy viazané na CSS triedy (napr. „layout expectations“) | Stredný | Upraviť len tam, kde je zmena zámerná, a v commite to uviesť |
| `Pagination` sa používa aj mimo `DataTablePagination` | Nízky | V T6 skontrolovať všetkých volajúcich |
| Bez automatizovaného prehliadača sa regresie zachytia neskoro | Stredný | Ručná kontrola na každom checkpointe |

## Otvorené otázky

1. Zmazať staré `tasks/redesign-of-pages-plan.md` a `tasks/redesign-of-pages-todo.md` (zamietnutý pokus, 60 nesplnených úloh)? Odporúčanie: áno, samostatným commitom pred T1.
2. Pre doplnenú fázu T13–T19 používateľ 2026-11-03 výslovne zvolil doplnenie existujúceho plánu a todo súboru. Úlohy tejto fázy sú evidované tu, bez vytvárania GitHub Issues.
3. Zaradiť T11 (filter podľa typu na Platform providers)?

## Fáza 4: View a tabuľka v jednej karte (doplnené 2026-11-03)

### Cieľ a vizuálny podklad

Odstrániť prerušený horný rámik, nerovnomernú deliacu čiaru a orezaný tieň na Resources a Resources ISE. Zachovať rozlíšenie medzi výberom view a ovládaním tabuľky. Podklad je [samostatný HTML návrh](../.worktrees/table-frame-design/prototypes/table-frame-prototype/index.html), uložený vo vetve `prototype/table-frame-design`, commit `d770bd3c`. Je to vizuálny podklad; jeho ukážkové dáta ani JavaScript sa nekopírujú do aplikácie.

Používateľ požiadal o plán a osobitne zdôraznil záložku „VMware VMs · vm-01“. Následne výslovne požiadal vykonať plán cez executing-plans inline; implementovaný bol iba rozsah T13–T19.

### Potvrdená príčina

- `InventoryShell` pri vnorenom `DataTableSurface` cez `:has()` vypína svoj rámik a časť rámika prenáša na pás záložiek. Výsledná karta je poskladaná z dvoch samostatne rámovaných súrodencov.
- Pás má horný polomer 20 px a `overflow: visible`. Nepriehľadné obdĺžnikové pozadie `Tabs` začína 9 px od jeho okraja a prekrýva časť oblúka. Dočasná zmena orezania alebo priehľadné pozadie odstránili rovnaký defekt v Chrome pri šírke 1600 aj 800 px.
- `Tabs` so scroll controls a obal navigácie kreslia každý svoj 1 px spodný rámik. Čiara je hrubšia iba pod záložkami.
- Tieň `DataTableSurface` orezáva vnútorný obal `InventoryShell` aj `ContainedViewportFrame`. Odstránenie orezania iba z prvého obalu nestačilo; po diagnostickom vypnutí oboch bol tieň súvislý.
- Overené v izolovanom headless Chrome s lokálnymi testovacími dátami. Diagnostické PNG a výsledky boli uložené do `%TEMP%/abco-corner-evidence`; nie sú trvalou závislosťou plánu.

### Rozlíšenie view a table

| Vrstva | Zodpovednosť | Vizuálne vyjadrenie |
|---|---|---|
| Stránka `ResourcesPage` / `ResourcesIsePage` | Zostaví dostupné view z providerov príslušnej roly a cez existujúci hook vyberá `resourceTab` + `providerId` v URL | Záložka obsahuje názov typu zdroja a štítok providera, napr. `VMware VMs` + `vm-01` |
| View `ResourceInventoryShell` | Rozmiestni metriky a hlásenia; vlastní jednu kartu pre navigáciu a obsah aktívneho view | Jediný obvodový rámik, biele pozadie, zaoblenie a tieň; navigácia tvorí samostatný horný pás |
| Panel tabuľky `ResourceInventoryPanel` | Toolbar, stav požiadavky, dátový viewport a stránkovanie | Pod pásom view je jeden oddeľovač, potom vyhľadávanie/filtre a hlavička stĺpcov |
| `DataTable` a resource columns | Stĺpce, riadky, hustota, výber a otvorenie detailu | Obsahovo vysoké riadky; aktívna záložka view nie je hlavičkou stĺpca ani filtrom tabuľky |

Aktívny view má modrý text a samostatné modré podčiarknutie pod svojím labelom; štítok `vm-01` je identifikátor zdroja, nie počet záznamov. Navigačný pás a toolbar sa nespoja do jedného riadku. Zachovať dostupné mená záložiek, `aria-selected`, roving tabindex, ArrowLeft/ArrowRight/Home/End a scroll controls. Obsah view má vlastné prístupné meno sekcie. Nepridávať neúplné `aria-controls`/`aria-labelledby` odkazujúce na neexistujúce prvky; ak sa pri implementácii zavádza plná asociácia tab–tabpanel, patrí do view/stránky a treba explicitne rozplánovať odovzdanie stabilných ID, nie ho skryť do `DataTable`.

### Kompozícia a rozhrania

```text
ResourcesPage / ResourcesIsePage — URL, provider role, výber view
  resource page — existujúce dotazy a dáta
    ResourceInventoryShell
      metriky a hlásenia mimo karty
      jedna karta view — rámik, pozadie, zaoblenie, tieň
        navigácia view — Tabs bez vlastného pozadia a deliaceho rámika
        pomenovaná sekcia obsahu aktívneho view
          ResourceInventoryPanel bez vonkajšieho rámika
            existujúci toolbar
            jediný vertikálny dátový viewport + DataTable
            existujúce stránkovanie
          alebo loading / error / empty obsah bez ďalšej karty
```

1. `ResourceInventoryShell` bude skladať kartu explicitne, bez závislosti na zisťovaní potomkov cez `:has()` a bez odoberania horného rámika vnorenému panelu. Jeho dnešné delegovanie na všeobecný `InventoryShell` sa v tejto resource vetve odstráni. Všeobecný shell na ostatných stránkach zostáva mimo tejto migrácie.
2. `DataTableSurface`, `InventoryPanel` a `DataTableSkeleton` dostanú malý explicitný kompozičný kontrakt `frame?: 'standalone' | 'embedded'`, predvolene `standalone`. Embedded režim odstráni iba vonkajší rámik, pozadie, tieň a orezávanie obalu; zachová min-size pravidlá a vnútorný dátový viewport. Toto nie je vizuálny variant „modern“, ale určenie vlastníka rámika. Existujúci konzumenti bez prop sa správajú ako doteraz.
3. `ResourceInventoryPanel` bude odovzdávať `frame="embedded"` do `InventoryPanel`. Resource loading a fatal/empty stavy budú rovnako obsahom spoločnej karty. Záložky zostanú dostupné aj pri chybe inventára, aby sa dal zmeniť zdroj; pri chybe zoznamu providerov zachovať dnešnú dostupnosť navigácie a retry.
4. `Tabs` dostane explicitnú vloženú prezentáciu `appearance?: 'default' | 'embedded'`. Embedded správanie bude konzistentné s aj bez scroll controls: priehľadný obal/list, bez spodnej deliacej čiary a s odsadením od oblúka. Jediný oddeľovač vlastní pás view. Navigačná logika a model providerov ostávajú v existujúcich stránkach a hookoch.
5. Žiadne `overflow: hidden`, maska ani prekryvný biely prvok na opravu vonkajších rohov. Priehľadné vnútorné plochy a odsadenie zabezpečia, že ich nič nepremaľuje. Skutočný dátový scroll viewport a existujúce skracovanie textu môžu používať overflow podľa svojej funkcie.
6. Pre tieň vytvoriť merateľný priestor v resource vetve layoutu ešte pred hranicou `ContainedViewportFrame`. Zachovať všeobecné pravidlá route scrollovania. Nevypínať globálne overflow v `AppShell` alebo `ContainedViewportFrame` len kvôli tieňu; podľa merania doplniť padding/gutter v `ResourceViewportFrame` a zodpovedajúcu dostupnú výšku. Karta a hlavička zostanú zarovnané.

### Rozsah a poradie

Táto fáza zahŕňa obe resource routes a ich VMware, FlashSystem a IBM Power view vrátane všetkých request stavov. Ostatné tabuľkové stránky sa kontrolujú ako konzumenti nezmeneného defaultu shared komponentov, ale nemigrujú sa automaticky na nový view shell. T2b/T2c zostávajú historickým záznamom; pre resource vetvu ich CSS skladanie nahradí T16. Pôvodné rozhodnutie o spoločnom vizuálnom defaulte nezakazuje explicitné kompozičné režimy rámika.

T4 je zrušené. T5–T7 boli vrátené a táto fáza ich neopakuje. T8–T12 nie sú jej závislosťou. Toolbar, stránkovanie a hlavičku stránky prevziať z aktuálnej aplikácie, aj keď HTML prototyp obsahuje drobné rozdiely. Nepridávať nové bunky, farby typov, API, zmeny cache/prefetch, filter reset pravidiel ani plošné premenovanie props.

```text
T13 vložené view záložky ──┐
T14 vložený panel tabuľky ├── CP4 ── T16 jedna karta Resources ── T17 stavové integrácie ── CP5
T15 vložený skeleton ─────┘                                                            │
                                                           T18 priestor na tieň ◄──────┘
                                                                  │
                                                           T19 browser QA ── CP6
```

Úlohy sú podrobne uvedené v existujúcom todo súbore. Implementovať postupne kvôli spoločným súborom; paralelná práca nie je potrebná. Každý krok končí focused overením a atomickým commitom. Pri zmene rozsahu aktualizovať tento plán a zaznamenať dôvod, nepokračovať skrytým globálnym redizajnom.

### Overovanie doplnenej fázy

- Konkrétne Vitest súbory sú pri T13–T19. Testovať navigáciu a URL/provider scope, retry, zachovanie cache údajov, dostupnosť toolbaru/pagination mimo scroll viewportu a kompatibilitu samostatného panelu. Samotné CSS rohy overovať v reálnom Chrome, nepridávať testy, ktoré iba kopírujú class stringy.
- Na každom kroku `npm.cmd exec eslint -- <zmenené TS/TSX súbory> --max-warnings 0` a `git diff --check`. Po integrácii shared typových kontraktov raz `npm.cmd run typecheck`; zmyslom je zachytiť všetkých konzumentov rozšíreného rozhrania.
- Browser matica: 1600×900, 1280×600, 800×900, 390×844; svetlá aj tmavá téma. Pri desktopoch overiť aj zoom 125 %. Dva a viac providerov rovnakého typu, dlhý label, krátky aj dlhý zoznam a stránky bez navigácie. Zdokumentovať aktívny view, počet rámikov, súvislosť rohov/tieňa, deliacu čiaru, zarovnanie a scroll ownery.
- Použiť izolovaný Chrome cez dostupný DevTools MCP alebo už overený lokálny CDP postup. Testovacie API odpovede musia zodpovedať generated schémam. Výsledky a screenshoty ukladať reprodukovateľným QA skriptom; absenciu živého backendu označiť.
- Celá test suite, full lint a production build sa pre T13–T19 nespúšťajú automaticky. Rozsah rozšíriť len pri preukázanom zásahu mimo uvedených kontraktov alebo na výslovnú žiadosť. Týmto pravidlom sa pre novú fázu spresňuje pôvodné širšie overovanie CP1–CP3.

### Riziká a hranice

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Loading/error vetva vykreslí vlastnú kartu | Vysoký | T16 prepojí shell aj všetky resource state helpers v jednom kroku; T17 pokryje prechody stavov |
| Default shared komponentu ovplyvní ostatné stránky | Vysoký | Predvolený standalone režim zachovať, overiť no-prop konzumenta a reprezentatívne ostatné routes |
| Nepriehľadný toolbar/footer môže znovu prekryť roh pri chýbajúcej navigácii | Stredný | Udržať priehľadné krajné vrstvy alebo ich riadne odsadiť; overiť view bez záložiek a všetky stavy |
| Gutter na tieň zoberie miesto stránkovaniu v krátkom okne | Stredný | T18 meria 1280×600; zachovať shrink reťazec a dosiahnuteľnosť footeru, bez horizontálneho scrollu dokumentu |
| Resource view dostane duplicitný tablist alebo panel ID | Stredný | Jediný render navigácie na view, stabilné unikátne ID pre source/target a kontrola klávesnice |
| Práca prebieha súbežne s inými úpravami | Stredný | Pred každým krokom skontrolovať status/diff a čítať aktuálne súbory; nezahrnúť cudzie zmeny do commitu |

### Stav a otázky pred implementáciou

- Umiestnenie je potvrdené používateľom: doplniť tento existujúci plán a todo, neprepisovať `tasks/plan.md` ani `tasks/todo.md`.
- Podoba a hranica view/table sú popísané týmto plánom a HTML podkladom. Implementácia používa explicitný resource view shell, embedded panel/skeleton/záložky a lokálny `p-2` gutter na tieň. Zmeny globálneho scrollovania neboli potrebné. Používateľ má ešte vizuálne skontrolovať výsledok.
- Ak meranie v T18 ukáže, že lokálny resource gutter nestačí, zaznamenať konkrétny clipping ancestor a dopad pred rozšírením scope do shared route layoutu. Nevoliť globálne vypnutie scrollovania ako náhradu návrhu.

## Fáza 5: Spoločné shared view pre všetky inventory stránky (T20–T30)

### Cieľ a zmena rozsahu

Po dodaní T13–T19 používateľ ukázal rovnakú chybu v Identity & access a požiadal spoločné riešenie cez shared komponenty. Cieľom je jediná implementácia rámika, navigačného pásu a priestoru na tieň, používaná Resources aj ostatnými inventory stránkami. Funkčné rozdiely zostanú v dátach, stĺpcoch, akciách a navigácii konkrétnej stránky. Nevytvárať ďalší samostatný rámik pre Identity.

Ide o pokračovanie tej istej práce. Dokumenty a úlohy sa na základe už potvrdeného umiestnenia dopĺňajú do tohto plánu/todo. Historické obmedzenie fázy 4 na Resources sa pre T20–T30 nahrádza nasledujúcou maticou. Staršie úlohy, výsledky a zrušené zmeny sa nemažú. Tento pokyn je vytvorenie plánu, nie vykonanie implementácie.

### Overená matica konzumentov (2026-11-03)

V aktuálnych súboroch je 11 priamych produkčných konzumentov `<InventoryShell>` a samostatný `ResourceInventoryShell`. Staršie počty v CodeGraph nie sú spoľahlivé; maticu potvrdiť pri začatí implementácie oproti aktuálnemu stromu.

| View / stránka | Dnešný vstup do shellu | Obsah a potrebná kontrola | Migračná úloha |
|---|---|---|---|
| Resources a Resources ISE | `ResourceInventoryShell` v troch resource pages | VMware/FlashSystem/Power, všetky request stavy a provider tabs; referenčný hotový vzhľad | T22, T23 |
| Identity & access | `IdentityAccessPage` | Users, Clients, Application roles; aj ďalšie dostupné sekcie, primárne `IdentityContentPanel` formuláre a detaily | T24 |
| Recovery runs | `RecoveryRunsPage` | Výber view, loading/error/empty a detail histórie | T25 |
| Recovery policies | `RecoveryPolicyPageShell` | Snapshot, Application recovery a Clean room; spoločná navigácia a tabuľky | T25 |
| Discovery settings | `DiscoverySettingsPage` | Configuration formulár aj History tabuľka, save/cancel/discard a footer | T26 |
| Platform providers | `PlatformProvidersPage` | Zoznam bez tabs, modal a request stavy | T27 |
| Providers | `ProvidersPage` | Zoznam bez tabs, vlastné akcie a detail | T27 |
| Credentials | `CredentialsPage` | Zoznam bez tabs, CRUD modal a loading/error | T27 |
| Recovery applications | `RecoveryApplicationsListPage` | Zoznam, notice, detail a prechody na builder | T28 |
| Recovery groups | `RecoveryGroupsListPage` | Zoznam, mutation notice, delete/rollback, prechody na builder | T28 |
| Policy sets | `PolicySetsPage` | Zoznam bez tabs, modal a refresh po mutation | T29 |
| Audit | `AuditPage` | `InventoryPanel` cez Access logs, dotazovací toolbar, hustota a error | T29 |

Samostatné `DataTableSurface` mimo inventory view (napr. Recovery actions history) zostanú samostatnými kartami. Menšie obsahové karty, fieldsety, upozornenia a otvorené modaly nie sú duplicitné obvodové rámy celého view; ich účel sa zachová. Dashboard a samotné recovery builders nepatria do tejto migrácie, pokiaľ sa pri inventúre nepotvrdí ich používanie rovnakého shellu.

### Rozhodnutie: zdieľaná kompozícia a lokálne dedenie rámovania

Presunúť overený rámik z resource komponentu do `src/shared/components/inventory-shell/InventoryViewFrame.tsx`. Existujúci `InventoryShell` bude skladať metriky, notice a tento shared frame. `ResourceInventoryShell` sa nakoniec vráti na tenký obal `InventoryShell` s nastavením resource spacing; nebude obsahovať vlastné CSS rámika. Všeobecný `Card` používaný po celej aplikácii sa týmto globálne nemení.

```text
InventoryViewportFrame (shared/page) — priestor na tieň, header a dostupná výška
  page header
  InventoryShell (shared/inventory-shell) — metriky, notice, compact spacing, floor
    InventoryViewFrame (shared/inventory-shell) — jediný obvodový rámik
      tabs slot — samostatný pás view, navigation scope = embedded
      content slot — surface frame scope = embedded
        ľubovoľná feature komponenta
          InventoryPanel / DataTableSurface / DataTableSkeleton
            toolbar / scroll viewport / riadky / footer
```

Používateľom očakávané „dedenie“ bude scoped React context, nie CSS zisťovanie vnorených DOM prvkov. Malý `InventoryCompositionContext.ts` bude obsahovať dva nezávislé kontexty, bez query/dát/provider modelu a bez importu barrel exportov, ktoré by vytvárali cyklus:

- **Frame scope:** mimo spoločného view `standalone`, v jeho content slote `embedded`. `DataTableSurface`, `DataTableSkeleton` a `InventoryPanel` vyriešia `explicit frame ?? nearest frame scope`. `InventoryPanel` nesmie vopred nahradiť chýbajúci prop hodnotou `standalone`, lebo by tým dedenie zablokoval. Existujúci explicitný override zostáva platný pre zámerne samostatnú vnútornú kartu.
- **Navigation scope:** mimo hlavného tabs slotu `default`, iba v tabs slote `embedded`. `Tabs` vyrieši `explicit appearance ?? nearest navigation scope`. Vnútorné detailové záložky v content slote nezdedia automaticky prezentáciu hlavného view pásu.

Alternatíva odovzdávať `frame="embedded"` cez každú feature stránku a tabuľku by duplikovala vedomosť o rodičovi na mnohých miestach. Scoped context zvolíme preto, že rámik vlastní najbližší view a tabuľka nemusí poznať stránku. Explicitný override je určený len pre skutočnú výnimku, nie ako povinný migračný prepínač pre každú tabuľku. Nepridávať DOM scan, `cloneElement`, kontrolu názvu komponentu ani nový global store.

### Pravidlá rámika, navigácie a scrollovania

1. CSS pre obvodový rámik, biele pozadie, polomer a tieň existuje na jedinom shared frame. `InventoryShell` prestane používať `:has([data-table-surface])`, `group-has-*` a odoberanie horných okrajov potomkom. Loading aj bežné dáta sa skladajú v tom istom frame; existujúci `VirtualMachinesSkeleton` helper v shared shell súbore sa takisto oprie oň.
2. Pás view vlastní jednu deliacu čiaru. Odstrániť staré `bg-surface border-b-0 px-0` vizuálne prepisy z hlavných navigácií Identity, Recovery runs, Recovery policies a Discovery settings; rozmerové triedy môžu zostať. Provider badge a modré podčiarknutie Resources sa zachovajú. URL/model/roly a business správanie sa nemenia.
3. Spoločný `InventoryViewportFrame` prevezme overený gutter z Resources a obalí nadpis aj view, aby zostali zarovnané. `ResourceViewportFrame` bude jeho tenkým obalom. Ostatné inventory pages použijú tento spoločný viewport namiesto lokálnych kópií root flex layoutu. Globálny `AppShell` ani všetky `ContainedViewportFrame` sa nemenia kvôli jednej rodine stránok.
4. Zachovať `compactSpacing`, `surfaceMinHeightClassName` a fallback route scroll pri nízkom okne. Skutočný dátový viewport a formulárový viewport zostávajú vlastníkmi scrollu. Rámik sa neopravuje orezaním, maskou ani prekrývaním rohov.
5. `IdentityContentPanel`, ktorý je primárnym obsahom view, bude rešpektovať frame scope. Vnútorné nastavenia/sekcie si zachovajú vlastné sémantické oddelenie. `SettingsSectionCard` v Configuration je konkrétny primárny formulár: dostane explicitný vložený režim v tomto použití; ostatným settings kartám zostane ich dnešný default. Neodstraňovať plošne všetky vnútorné borders.
6. React context sa prenáša aj do portalov. Pri migrácii preveriť panely v detailoch/modaloch; ak ide o nezávislú kartu, explicitne nastaviť standalone na jej hranici. Konkrétne výnimky zapísať do matice, nevkladať reset do všetkých modalov preventívne.
7. Nový shared marker pre QA je `data-inventory-view`. Resource QA prejde naň; nepridávať do shared frame resource-specific props. `data-table-surface` môže ďalej označovať standalone panel, ale vzhľad view od tejto značky nezávisí.

### Poradie, kompatibilita a kontrolné body

```text
T20 frame scope ── T21 shared view frame + navigation scope ── CP7
  └──────────────── T22 overené Resources cez shared frame/viewport
                       └─ T23 spoločný InventoryShell default ── CP8
                           ├─ T24 Identity
                           ├─ T25 Recovery runs/policies
                           └─ T26 Discovery settings ── CP9
                               ├─ T27 Provider/credential zoznamy
                               ├─ T28 Recovery app/group zoznamy
                               └─ T29 Policy sets/Audit ── CP10
                                   └─ T30 browser matica a audit úplnosti ── CP11
```

V T20/T21 sa pripravia kontrakty bez zmeny existujúceho defaultu mimo nového frame. T22 overí nový shared frame na už funkčných Resources pred globálnym prepnutím. T23 prepne všetkých dnešných používateľov `InventoryShell`; T24–T29 odstránia zostávajúce feature navigačné prepisy a zjednotia ich viewport. Medzikroky musia zostať funkčné; za vizuálne dokončenú sa migrácia považuje až po celej matici, nie po Resources alebo Users.

Úlohy sa vykonávajú postupne. Každá má najviac päť predpokladaných produkčných/testovacích súborov; spoločný výsledkový zápis do plánovacích dokumentov sa vedie pri commitovaní. Ak sa ukáže ďalší konzument alebo nutný zásah nad tento limit, najprv doplniť samostatnú úlohu a maticu. Návrat k stavu pred migráciou je revert konkrétneho atomického kroku, bez resetovania cudzej práce.

### Overovanie a riziká

- Testovať dedenie cez skutočný vnorený feature wrapper, implicitný standalone mimo view, explicitný standalone override, nezávislosť navigation/content scope a zachovanie loading/error/cache/pagination. Overiť, že zmena iba na shared frame sa prejaví v Resources aj Identity bez kópie CSS vo feature moduloch.
- Focused príkazy sú pri T20–T30. Zachovať silu existujúcich behaviorálnych assertions; meniť CSS assertions iba tam, kde bol zámerne presunutý vlastník rámika. Čistý presun štýlu overiť browserom, nepridávať test len ako kópiu class stringu.
- Na CP8 a po kompletnej integrácii spustiť `npm.cmd run typecheck`; focused ESLint zmenených súborov a `git diff --check` pri každom kroku. Celá test suite, full lint a production build sa nespúšťajú automaticky. Pri väčšej focused sade používať správny tvar `npm.cmd exec -- vitest run <súbory> --maxWorkers=2` a browser QA spúšťať oddelene.
- Rozšíriť existujúce izolované CDP QA namiesto druhého nesúvisiaceho test systému. Identity používa vymyslené fixture identity, bez reálnych Keycloak účtov/tokenov. Každý route z matice musí mať zaznamenaný výsledok, nie iba screenshot jednej reprezentatívnej tabuľky.
- Plná geometrická matica pre Identity, Resources, Recovery runs a Discovery settings: svetlá/tmavá, 1600×900, 1280×600, 800×900, 390×844, desktop emulácia 125 %. Ostatné položky aspoň desktop a mobil v oboch témach. Stavy úspech/loading/fatal/cached error/empty a retry pokryť podľa možností jednotlivého view.

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Explicitné defaulty v `InventoryPanel` alebo feature wrapperi zablokujú dedenie | Vysoký | Integračný test scoped frame cez vnorený wrapper; audit všetkých explicitných `frame` props |
| Kontextová zmena odstráni rám nezávislej detailovej/portal karty | Vysoký | Scope iba obsah view, audit nezávislých povrchov a konkrétne standalone override |
| Identity/Discovery settings obsahuje formulár aj tabuľku | Vysoký | T24/T26 overia oba druhy obsahu vrátane footeru a save/cancel/discard, nie iba Users/History |
| Feature navigácia znovu pridá nepriehľadné pozadie | Stredný | Vyčistiť všetky štyri hlavné navigácie z inventúry a merať jednu deliacu čiaru v Chrome |
| Shared gutter posunie nadpis alebo znemožní scroll v krátkom okne | Stredný | Header aj view v tom istom viewport komponente; test floor kontraktu, 1280×600 a dlhých dát |
| Testy založené na starej DOM štruktúre budú mechanicky oslabené | Stredný | Zachovať pomenované regióny, behaviorálne overenie navigácie a scrollbar ownerov |

### Podmienky odovzdania

T20–T30 sú plán, všetky nové úlohy ostávajú nezaškrtnuté. Implementácia začne až po pokyne používateľa. Po dokončení musí zdrojová inventúra preukázať jednu shared implementáciu view frame a viewportu; Resources a Identity nemajú vlastnú kópiu. Každá položka matice musí byť overená alebo výslovne uvedená ako blokovaná s dôvodom. Nepovažovať novú fázu za hotovú, ak rovnaký defekt ostane na inom konzumentovi spoločného shellu.
