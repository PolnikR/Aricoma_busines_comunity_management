# Implementačný plán: Redizajn tabuliek v2 (variant B)

Dátum: 2026-11-02. Stav: návrh, čaká na schválenie.
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

**Mimo rozsahu:**
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
- **Prázdne miesto pod riadkami vypĺňa `DataTable`.** Za tabuľku vloží výplň s jemnými čiarami v rozostupe nominálnej výšky riadku podľa hustoty. Výplň sa natiahne len vo flex rodičovi, teda v `DataTableSurface`. Inde má nulovú výšku a správa sa ako dnes. Riadky nedostanú pevnú výšku, takže zalamované bunky v `layout="fit"` ostanú funkčné.
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
2. Evidovať úlohy aj ako GitHub Issues (podľa `docs/agents/issue-tracker.md`), alebo stačí tento todo súbor, ako je zvykom v `tasks/`?
3. Zaradiť T11 (filter podľa typu na Platform providers)?
