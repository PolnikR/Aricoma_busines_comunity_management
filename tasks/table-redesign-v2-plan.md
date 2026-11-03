# Implementačný plán: Redizajn tabuliek v2 (variant B)

Dátum pôvodného plánu: 2026-11-02. Aktualizácia: 2026-11-03. Stav: T13–T41 sú implementované a overené v zaznamenanom automatizovanom rozsahu vrátane provider lišty a OR tagov. Historické ľudské akceptácie zostávajú otvorené. Výsledky a presné overenie sú v todo dokumente.
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

T20–T30 boli vykonané po pokyne používateľa `executing-plans inline` z 2026-11-03. Stav krokov, focused overenie, browser dôkazy a commity sú v [todo a výsledkovom reporte fázy 5](table-redesign-v2-todo.md). Zdrojová inventúra potvrdila jednu shared implementáciu view frame a viewportu; Resources a Identity nemajú vlastnú kópiu. Každá položka matice musí byť overená alebo výslovne uvedená ako blokovaná s dôvodom. Ľudskú vizuálnu akceptáciu v CP11 agent neuzatvára.

## Fáza 6: Štyria provideri a podmienky načítania v jednej lište (T31–T41)

Dátum: 2026-11-03. **Stav: vykonané inline podľa pokynu používateľa; T31–T41 vrátane doplnkov T34b a T41a–T41c sú dokončené v automatizovanom rozsahu.** Ide o pokračovanie tohto plánu podľa pokynu používateľa; nesúvisiace tasks/plan.md a tasks/todo.md sa nemenia. Otvorené historické úlohy a ľudské akceptácie zostávajú zachované.

### Východisko a požadovaný výsledok

Vizuálny zdroj: prototypes/vmware-load-scope/index.html a README.md, posledná revízia prototypu 7c73d521. Vývoj rozhodnutí je v commitoch de17dcba (spike scroll), c270fbeb (štyri položky), 93bb0abe (podmienky napravo), 7c73d521 (vynechanie prázdnych hodnôt a viac tagov). Prototyp je referenciou vzhľadu, nie zdrojom produkčných fixtures alebo novej backend logiky.

- Vľavo najviac štyri provider záložky na širokom okne; navigácia sa neroztiahne na celú tabuľku. Pri menej provideroch sa zúži. Na menšom okne sa zmestí menej položiek.
- Zachovať spike ovládanie: overflow šípky, disabled okraje, horizontálny wheel/touch, Home/End, ArrowLeft/ArrowRight, wrap-around, roving focus a dosunutie aktívnej položky. V limitovanom režime šípka posúva celé viditeľné položky, nie pôvodných 80 %.
- Napravo v tom istom páse Name prefix a Tags vybraného VMware providera. Chýbajúci prefix alebo tag nemá label ani placeholder. Ak chýbajú obe hodnoty, blok vrátane zámku úplne zmizne.
- Pri viacerých tagoch dva na širokom okne, jeden na úzkom a +N pre zvyšok. Rozbalenie ukáže všetky plné názvy. Bez odstraňovacích krížikov, nového toolbar tlačidla alebo ďalšieho desktop riadka.
- Jeden shared obvod, divider a tieň z fázy 5. Lišta sa nezabuduje do dátovej tabuľky; toolbar, dátový viewport a pagination zostávajú samostatné.

### Overené zdroje a dôležitý rozdiel oproti prototypu

Pri plánovaní bol najprv použitý CodeGraph. Jeho výsledok pre shared Tabs nezodpovedal aktuálnemu worktree (chýbal appearance/context), preto sa hranice a súbory overili aj aktuálnym zdrojom vo worktree test.

- Shared InventoryViewFrame poskytuje už hotový tabs slot s jedinou deliacou čiarou. ResourceInventoryShell je tenký adaptér InventoryShell.
- ResourcesPage a ResourcesIsePage dnes duplikujú zostavenie Tabs. Shared Tabs už má scrollControls a klávesnicu; nemá limit štyroch položiek.
- VmwareProviderFilterSummary existuje, ale VmwareResourcesPage ho odovzdáva cez inventoryDescription, ktoré súčasný InventoryShell vizuálne nepoužíva. Treba ho presunúť do skutočnej navigačnej kompozície.
- ProviderRecord.vmTags je pole. resolveVmwareProviderFilter však vyberá iba prvý neprázdny tag; rovnaké obmedzenie má background prefetch vo VmwareResourcesPage.
- VmSearchFilter v generated Zod má iba jeden string tag, nie pole. getServerSideTagFilter už vracia tag iba pre jednu hodnotu. applyFiltersAndPagination pri poli používa OR cez some().
- Query cache drží validovanú wire odpoveď. Pri lokálnom filtrovaní viacerých tagov musia metriky a filter options vychádzať z pevného provider scope, nie z neobmedzeného inventára alebo iba zo zobrazenej stránky.
- Resolver používajú aj recovery-group hook a provider karty. Zmena jeho kontraktu nesmie tento dopad prehliadnuť.
- Shared HelpPopover už rieši portal, clamp cez clientWidth, scroll/resize, Escape, outside click a focus. Pre +N stačí kompatibilný vlastný obsah triggera; nevytvárať druhý všeobecný popover systém.

### Rozhodnutia o implementácii

1. V shared Tabs zaviesť opt-in limit počtu položiek, napr. maxVisibleItems. Default ostatných konzumentov sa nezmení. V limitovanom režime použiť jednotnú šírku položky a súčet štyroch slotov + medzier; šípky sú mimo viewportu. Dlhé názvy majú dostupný plný aria-label/title, nie masku vonkajšieho rámika.
2. ResourceViewNavigation v resource feature skladá ľavé Tabs a pravý VmwareProviderFilterSummary. Oba resource routes používajú tú istú kompozíciu. Shared shell ani DataTableSurface nemajú poznať providera, tagy alebo rolu.
3. Podmienky získavať z rovnakého normalizovaného kontraktu ako inventory query: trim, odstránenie prázdnych hodnôt, stabilné poradie a deduplikácia tagov. Nezobrazovať surové vmTags ako aplikované podmienky, ak sa do výsledku preniesol iba prvý tag.
4. Zachovať case-sensitive hodnoty tagov; nenormalizovať veľkosť písmen. Prefix je doslovná hodnota name_prefix, nie nový regex alebo skutočná hviezdička pridávaná do requestu.
5. Existujúci singular tag alias možno dočasne zachovať pre kompatibilitu, ale nové UI a efektívne filtrovanie používajú celé pole. Každý zostávajúci singular konzument musí byť menovite auditovaný.
6. Predpokladaná cesta pre viac tagov: načítať kompletný inventár podľa providera/prefixu bez singular tag a aplikovať zvolenú tag logiku lokálne. To je dovolené až po T31 potvrdení úplnosti odpovede a výkonových limitov. Jeden tag si zachová server-side optimalizáciu. Neposielať CSV do string tag a neupravovať generated súbory ručne.
7. Ak T31 nepotvrdí úplný inventár alebo backend sám aplikuje iné provider pravidlá, najprv doplniť samostatný API/backend plán a závislosť. Nie je prípustné potichu načítať čiastočné dáta alebo tvrdiť, že všetky tagy fungujú.
8. Sidebar +N ukazuje celý zoznam cez existujúci HelpPopover s voliteľným triggerContent. Predvolený help trigger aj ostatné použitia ostanú funkčné. Pri zmene providera sa starý zoznam zatvorí. Pri resize/scroll sa panel drží v použiteľnom viewporte, nezakrýva ho frame clipping.
9. Pre FlashSystem a IBM Power zostane navigácia funkčná, ale nevykreslia sa im falošné VMware tag podmienky. Source a target majú izolovaný URL/session/query scope.
10. HTML lokálne vyhľadávanie je iba prototypová interakcia. Táto fáza automaticky neodomyká produkčné search/filter controls, nemení CRUD, hustotu, hlavičky ani predchádzajúce revertované T5–T7.

### Potvrdené OR a zostávajúci dátový gate

**Používateľ potvrdil OR (2026-11-03):** VM musí mať aspoň jeden zo zvolených tagov. Prefix sa kombinuje s touto tag podmienkou. OR aj vykonanie implementačného plánu boli schválené používateľom. UI nesmie tvrdiť účinnosť celej množiny, pokiaľ query cesta nezodpovedá potvrdenému kontraktu.

T31 ďalej overí, či POST /vms/search bez tag vracia kompletný inventár pre prefix, či backend uplatňuje provider konfiguráciu sám, a aký objem dát je prípustný. Schéma jedného tagu sama tieto odpovede nedokazuje.

### Poradie a checkpointy

T31 kontrakt → T32 normalizácia → T33 efektívny inventory scope → CP12.
T34 dotknutí konzumenti → T34b builder prefetch; T35 opt-in Tabs; T36 vlastný popover trigger → CP13.
T37 summary → T38 resource kompozícia → T39 oba routes → CP14.
T40 preklady/odstránenie starej summary cesty → T41 browser regresia → CP15.

T35/T36 sa dajú pripravovať nezávisle od dátového rozhodnutia; aktivácia multi-tag UI závisí od T31–T34. Úpravy rovnakých shared súborov musia byť postupné. Nie je potrebné delegovanie agentom. Detailné task listy, závislosti a presné focused príkazy sú vo fáze 6 todo dokumentu.

### Overenie a limity rozsahu

- Každý krok: focused testy pre priamo dotknuté kontrakty, focused ESLint zmenených TS/TSX, git diff --check, atomický commit len vlastných súborov. Nepridávať class-string mirror testy.
- Typecheck po shared kontraktoch a po finálnej integrácii. Plná suite, full lint ani build nie sú automatický krok; balík build spúšťa aj celú suite, preto ho nenahrádzať za focused overenie.
- Browser: source/target, VMware/Flash/Power, 0/1/2/4/5/10 providerov, none/prefix/tag/both, 1/2/5/dlhé tagy, success/loading/empty/fatal/cached error/retry, zmena providera pri otvorenom popoveri, šípky/klávesnica/wheel/touch a dlhá tabuľka. Obe témy; 320/768/1024/1440 a krátke 1280×600, emulácia 125 %.
- Screenshoty cez captureBeyondViewport:false, aby Chrome neresetoval interný scroll. Iba izolované lokálne fixtures; bez zápisov do backendu.
- Súčasťou browser kontroly je, že pri žiadnych podmienkach nevznikne ani prázdny rezervovaný blok, +N neprekročí viewport, nevznikne desktop riadok navyše a na širokom okne zostávajú štyri celé providery.
- Human acceptance z predchádzajúcich fáz zostáva otvorená. OR bolo potvrdené používateľom. Schválenie celého plánu a produkčného výsledku sa nezaznamená za používateľa.

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Zobrazených päť tagov, request použije iba prvý | Vysoký | Dátový gate T31; query/result/UI assertions z rovnakého kontraktu |
| Server bez tag nevracia celý inventár | Vysoký | Overiť kontrakt/fixture; pri obmedzení samostatný API plán pred aktiváciou |
| Nesprávne metriky po lokálnom filtrovaní | Vysoký | Scope pred metrics/options/pagination; test VM iba s druhým tagom |
| Foreground a prefetch majú odlišný scope/cache | Vysoký | Overiť oba prefetch vstupy a live refresh, nemiešať role/providera |
| Zmena shared Tabs ovplyvní Identity/Recovery | Stredný | Opt-in prop, default regresie, bez globálnej CSS zmeny |
| Popover odíde vľavo mimo mobil | Stredný | Obe horizontálne hranice podľa clientWidth, resize/scroll/focus browser QA |
| Pravé tagy vytlačia navigáciu alebo ďalší riadok | Stredný | Limit pravej šírky, +N, responsive sloty, bez masky obvodu |

Implementácia fázy je dokončená. T31 gate je doložený nižšie; finálne focused a browser overenie je v todo reporte.

### T31 — overený kontrakt a rozhodnutie (2026-11-03)

Backend: čistý lokálny checkout C:/Users/polnikr/source/ABCO/abco-be, HEAD f0abff981619c8e57c956a69a3cd12605af160ce. api/routers/vcenter.py:24–38 načíta snapshot get_all_vms a aplikuje iba request body filtre; neaplikuje skryto vmTags/vmPrefix providera. vcenter/discovery.py:226–255 používa rekurzívny root ContainerView a celý list(container.view); :335–354 robí presnú case-sensitive tag membership a startswith prefix a vracia celý count/vms bez slicing. api/schemas.py:193–195 nemá pagination. discovery_cache/service.py:21–65 a store.py:40–41 neskracujú snapshot; stale fallback môže byť kompletný starší snapshot. Kontrakt dokumentuje docs/superpowers/specs/2026-08-26-discovery-endpoint-caching-design.md:103–105. Nasadená verzia backendu sa týmto neoverila.

Ruling: zachovať jeden existujúci prefixový/no-tag request a lokálny OR, nie nový fan-out N requestov. Bez tagu už dnes funguje nezamknutý a prefix-only provider; nejde o nový neobmedzený endpoint. Neexistuje doložený produkčný maximálny počet VM, preto gate výkonu znamená meranú reprezentatívnu vzorku plus explicitný limit tvrdenia, nie vymyslenú hornú hranicu. Pri reálnom prekročení prijateľného objemu bude potrebné serverové multi-tag filtrovanie; frontend nesmie potichu odrezať výsledok.

Izolovaný Chrome na existujúcom production route, validné fixtures bez tagu, 1600×900: 1 000 VM / 211 817 B VM odpovedí / 6 523 ms cold-ready / 10 renderovaných riadkov; 10 000 VM / 2 137 820 B / 2 754 ms warm-ready / 10 riadkov. Čas zahŕňa CDP/Vite/ready čakanie, nie čistý čas filtra ani porovnateľný výkonový benchmark. Oba behy dokončené bez runtime/API/asset chýb, celý total overený, bez DOM renderu všetkých VM. Dôkazy %TEMP%/abco-phase6-baseline-1000 a abco-phase6-baseline-10000 (benchmark.json/results.json/PNG). Nevytvára to garanciu pre ľubovoľný inventár alebo diskové metadáta. T33 doplní správnosť provider OR a odvodených metrík.

Baseline T31: npm.cmd exec -- vitest run helpers/vmwareProviderFilter.test.ts helpers/filterVirtualMachines.test.ts model/inventoryQueries.test.ts (úplné cesty podľa todo), --maxWorkers=2: 3 súbory / 13 testov PASS.

Ruling T34b (2026-11-03): audit potvrdil samostatný first-tag prefetch v recovery-groups/components/RecoveryGroupBuilder.tsx:128–150. Pred jeho zmenou bol doplnený T34b (2 súbory) po T34 a pred CP13, aby T34 neprekročil päť súborov a cache buildera zodpovedala resource hooku. Bez rozšírenia builder UI alebo CRUD.

Ruling T40a/T40b: nové SK/CS/EN kľúče sa pripravia pred T37–T39, aby prezentačné komponenty nezobrazovali surové locale kľúče. T40b odstráni neúčinnú summary cestu po T39; celá úloha T40 sa uzavrie až po oboch krokoch. Stále iba 3 JSON + VmwareResourcesPage a test = päť produkčných/test súborov.

Ruling T39 (2026-11-03): integration test lookup for SECOND now matches both the literal provider prefix and a VM name. Scope that existing assertion to the inventory table in ResourcesBackgroundPrefetch.integration.test.tsx; this is the fifth T39 file, within task budget. Cost if wrong: test selector rework; no production behavior expansion.

Ruling T41a (2026-11-03): real Chrome320 evidence shows zero-width prefix/tag values and35px provider viewport. Add a four-file responsive follow-up before final T41: ResourceViewNavigation(.test).tsx and VmwareProviderFilterSummary(.test).tsx. Keep one band; below640 use provider badge with full accessible tab label, compact metadata labels visually hidden but accessible, positive focusable value widths and one complete provider slot. Four desktop slots and >=1100 two-tag threshold unchanged. No frame masking or descendant overrides. Cost if wrong: responsive layout rework. Evidence %TEMP%/abco-phase6-early-20261103.

Ruling T41b: a4rem slot clips Flash/Power badges after shared24px horizontalpadding. Split2file sharedTabs CSScontrolwidth follow-up, keeping T41a4files. Resource mobile uses5rem slot/1.75remcontrols (56px both),40%summary/gap4; default2.25remcontrols unchanged. Cost ifwrong: shared opt-in sizing regression; focused defaulttests and browsergate required.

### Rozhodnutia počas realizácie a cena prípadnej chyby

- Použiť existujúci linked worktree a vetvu test; staging/commity riadi parent. Cena omylu: konflikt pri inom súbežnom zápise do indexu.
- Windows natívne ekvivalenty pre scratch workflow namiesto bash skriptov s anglickými headingmi. Cena omylu: chýbajúci požadovaný krok; briefy sa porovnávali s existujúcim todo.
- T35/T36 boli na začiatku paralelné, pretože vlastnili oddelené dvojice súborov; ďalšie implementácie boli sekvenčné. Cena omylu: konflikt zdieľaného stavu; parent serializoval commity a spoločné regresie prešli.
- Jeden existujúci prefix/no-tag request plus lokálny OR, bez N-request fan-out. Cena omylu pri veľkom nasadení: objem a čas prenosu; produkčné maximum a deployed backend parity nie sú doložené, pri prekročení limitu treba server multi-tag kontrakt.
- Štyri sloty znamenajú merané celé položky, nie pixelový prototyp 652 px (desktop sloty 4×160 alebo 4×144). Cena omylu: požiadavka na následné doladenie rozstupov.
- Samostatný T34b pre ďalší builder prefetch. Cena omylu: zbytočné rozdelenie práce; udržal file budget a jednotný scope.
- T40 preklady pripravené pred UI, cleanup po route integrácii. Cena omylu: dočasne nepoužité locale kľúče; po dokončení ich UI používa.
- Piaty T39 súbor zúžil iba kolíznu SECOND test assertion na tabuľku. Cena omylu: prepracovanie selektora, bez zmeny významu pôvodnej kontroly.
- T41a doplnil mobilný kompaktný pás z reálneho zero-width nálezu. Cena omylu: responsive rework; desktop a mobile sa merali v Chrome.
- T41b oddelil opt-in šírku šípok, aby 5rem slot zachoval celý Flash/Power badge. Cena omylu: shared sizing regresia; default testy a shared browser matica prešli.
- Finálne default Resources overenie obsahuje pôvodných 64 aj všetky nové phase6 prípady; neduplikuje sa ďalším celým phase6-only behom. Cena omylu: prehliadnutý prípad; počet aj obsah kontroluje finálny read-only review. Prerušené behy sa nepovažujú za úspešné.

Ruling T41c: classic scrollbar at320x844 leaves305px usable; existing bodymin320 createsdocumentoverflow. Diagnostic CSSbodymin0 proves scroll305==client305 but tabviewport73.81<80; bodymin0+resourcecontrols24 proves81.81px whole slot and25pxvalues. Add2sourcefile T41c (index.css min-w-0, mobile resourcecontrol1.5rem), no overflowmask. Costifwrong: minimum-width regression otherfeatures; verifyshared minimum-width geometry and AppShellfocusedtests. Evidence%TEMP%/abco-phase6-classic-forced-diagnostic-20261103, diagnosticDOMpatchesnotproductionPASS.
