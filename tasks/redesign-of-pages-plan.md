# Redesign of pages — spoločný vzhľad ABCO / Linear + Tremor

Stav: revidovaný implementačný plán na review; táto relácia mení iba dokumentáciu.
Úlohy: [redesign-of-pages-todo.md](redesign-of-pages-todo.md).
Vizuálna referencia: [HTML template](../prototypes/policy-sets-modern.html), commit `20c682d4`.

## Cieľ a rozsah

Modernizovať EXISTUJÚCI spoločný layout tabuľkových stránok ABCO cez shared komponenty. Zmena spoločných defaultov sa má prejaviť na všetkých ich konzumentoch. Policy sets je jedna z kontrolných stránok, nie samostatný pilot ani hranica implementácie. Používateľ doložil existujúci jednotný vzhľad na Resources, Providers a Identity; tieto stránky tvoria povinnú kontrolnú vzorku.

Preniesť hierarchiu Linear/Tremor (typografia, jemné deliace čiary, kompaktné toolbary, vyvážené rozostupy) do existujúcich ABCO tokenov a komponentov. Neimplementovať paralelný dizajnový systém ani lokálne kópie tabuľky pre každú feature.

Rozsah zahŕňa všetkých konzumentov shared tabuľkových/inventory komponentov: Resources, Providers, Credentials, Recovery Applications/Groups, Policies/Policy sets, Recovery runs, Identity a Audit; audit v T1 doplní úplný zoznam podľa aktuálneho kódu. Aj vložené tabuľky v detailoch sú konzumenti na kontrolu kompatibility. Nejde o kompletný redesign formulárov, builderov, dashboardov alebo samotného DetailView.

## Overený základ

- CodeGraph pri príprave hlási 57 volaní DataTable, 40 DataTableSurface a 26 TableToolbar. Ide o volania, nie počty stránok; konkrétny zoznam sa overí pred implementáciou.
- DataTable vlastní hlavičku, riadky, hustotu, selection/focus a horizontálny scroll; feature column definitions môžu vzhľad prebiť cez headerCellClassName/cellClassName.
- DataTableSurface vlastní toolbar/body/pagination a výškový grid. InventoryPanel ho skladá s DataTableRequestState; ResourceInventoryPanel je adaptér/reexport, nie dôvod na druhú implementáciu vzhľadu.
- InventoryShell pridáva obal, hlavičku a vnútorné odsadenie. TableToolbar skladá PageHeader a akcie. Skutočný stav aktuálnej pracovnej vetvy je autoritatívny, nie stav popísaný v historickom pláne.
- PolicySetsPage.module.css je lokálna výnimka z poslednej úpravy: modrá hlavička, zebra a silnejšie čiary. Pri centrálnom redizajne ju odstrániť alebo zúžiť, aby neprebíjala spoločný výsledok.
- Existujúci scroll kontrakt je funkčný záväzok; historická regresia je popísaná v [policy-set-table-scroll-plan.md](policy-set-table-scroll-plan.md).

## Architektonické rozhodnutia

1. Nový vzhľad implementovať ako spoločný default na úrovni DataTable, DataTableSurface, InventoryShell, DataTableToolbar, RowDensityToggle, DataTablePagination a tabuľkovej hlavičky TableToolbar. Nepridávať vzhľadový opt-in na každú stránku. Výnimka je prípustná iba pre konkrétny auditovaný layout, napríklad virtualizovanú tabuľku s meranou výškou riadkov.
2. InventoryPanel a nízkoúrovňový Table meniť iba ak audit ukáže pravidlo, ktoré patrí práve tam; nezdvojovať štýly, ktoré už zdedia. Globálny Card, Button, Input, Badge ani PageHeader nepreštýlovať bez auditu netabuľkových konzumentov. V rámci tohto rozsahu preferovať existujúce styling props/composition na tabuľkovej vrstve.
3. Zachovať verejné funkčné props, callbacky, URL stav, filtre, search, sort, výber, pagination, hustotu, refresh/retry, loading/empty/error/cached-error, sticky prvky a virtualizáciu. Žiadna zmena API, generated súborov, query keys, doménových pravidiel alebo obsahu metrík.
4. Lokálne zmeny slúžia na odstránenie prekážajúcich override štýlov a zosúladenie samostatných tabuliek s tým istým vizuálnym kontraktom. Bez plošného prepisovania feature komponentov alebo generických selektorov zasahujúcich všetky table na stránke.
5. Obsah buniek je feature-specific. Prototypové odznaky Snapshot/Recovery/Clean room sa nemajú pridávať do shared DataTable ani preniesť do ostatných domén. Tento vizuálny rez nepridáva nový clean-room filter, nové metriky, demo header/avatar ani statické počty z HTML. Existujúce odznaky a ich význam zostávajú.
6. Nepresúvať používateľské menu ani meniť AppShell/routing. Linear/Tremor sú referencie, nie nové závislosti. Zachovať preklady EN/SK/CS a existujúci font aplikácie.

## Spoločný ABCO vizuálny kontrakt

| Oblasť | Cieľ |
|---|---|
| Paleta | Existujúce page/surface/surface-subtle/surface-muted, border, text-primary/text-secondary a accent/focus; light aj dark |
| Typografia | Jasná hierarchia názov → ID/popisy, čitateľné 12–14 px podľa existujúcej škály; monospace iba technické hodnoty; žiadny nový globálny font |
| Plochy | Zachovať existujúci hlavný rám ABCO, jemné členenie dátovej plochy, odstrániť len skutočne nadbytočné vnorené rámovanie; neobnoviť karty, ktoré už boli odstránené |
| Tabuľka | Subtílna hlavička, jemné oddeľovače, jasný hover/selected/focus; nezaťažovať každý riadok výrazným rámom či tieňom |
| Ovládanie | Zarovnaný search, filtre, density a akcie; existujúce ovládače a labely zostávajú, aj keď sa v prototype nenachádzajú |
| Rozmery | Konzistentná shared spacing škála; compact/comfortable zachovať, viacriadkový obsah neorezať pevnou výškou |
| Kontrast | Text 4.5:1 (veľký 3:1), focus a relevantné ovládacie hranice 3:1; namerať v oboch témach |
| Scroll | Zachovať min-h-0/min-w-0, ohraničený desktop body a dostupnú pagination; horizontálny scroll v tabuľke, mobil prirodzene scrolluje |

Pri krátkej bežnej tabuľke má pagination nasledovať obsah bez veľkej prázdnej plochy vnútri rámu. Nevnucovať auto-height virtualizovaným alebo zámerne výškovo ohraničeným zoznamom: rozlíšiť obsahový a viewportový layout v zdieľanej vrstve iba ak merania potvrdia potrebu. Krátky dataset aj nízky viewport s dlhým datasetom musia prejsť pred prijatím výškovej zmeny.

## Etapy a závislosti

T1 audit konzumentov a baseline → T2 shared obaly → T3 shared tabuľka/skeleton → checkpoint A.
T4 toolbar/hustota → T5 pagination/hlavička → checkpoint B.
T6 Policy sets override → T7 VMware kompatibilita → T8 Power/FlashSystem kompatibilita → checkpoint C.
T9 ostatní konzumenti a lokálne výnimky → T10 browser QA a odovzdanie → checkpoint D.

Každý implementačný rez sa overí na reálnej stránke a ponechá aplikáciu použiteľnú. T2–T5 sú spoločné zmeny, nie osobitné migrácie stránok. T6–T9 sú kontrola zdedeného výsledku a oprava iba preukázaných výnimiek. Súbory, testy a merateľné kritériá sú v task liste.

## Matica povinného overenia

| Rodina | Čo zachovať a preveriť |
|---|---|
| Resources VMware | Provider tabs, metriky, search/filter, URL Back/Forward, hustota, dlhé hodnoty, horizontálny/vertikálny scroll a výber |
| Resources Power a FlashSystem | Platformové stĺpce, filtre, detailové akcie, scroll a virtualizácia tam, kde ju aktuálny kód používa |
| Providers a Credentials | Typ/role/status odznaky, citlivé hodnoty nezverejniť, filtre, JSON a detail |
| Identity | Users/Clients/Roles a vnorené tabuľky, ich tabs, pagination, keyboard a dialógy |
| Recovery a Policies | Search/pagination, CRUD dialógy, post-delete refresh, reference warnings, JSON; bez zmien payloadov |
| Recovery runs a Audit | URL/filter stav, časové hodnoty, lazy dáta, history detail, loading/cached-error |
| Ďalší konzumenti | Všetci nájdení v T1 musia mať výsledok kontroly alebo konkrétny zdôvodnený layoutový rozdiel |

## Overovanie a bezpečný postup

- Focused Vitest konkrétnych shared súborov po každom reze a priamo dotknuté feature testy; príkazy v task liste. ESLint iba zmenené TS/TSX, git diff --check.
- Po T5 spustiť npm.cmd run typecheck pre zdieľaný rozsah; neskôr zopakovať iba ak sa zmenia typy alebo vzniknú nové pochybnosti. Plný build a kompletná suite nie sú default; prípadné rozšírenie testov odôvodniť konkrétnym dopadom.
- Reálny browser: 320/768/1024/1440 px, nízky desktop 1280×600, light/dark, compact/comfortable; 0, krátky a viacstránkový dataset. Pre každý layoutový typ pokryť loading, no-match, fatal/cached error a retry.
- Tab/Enter/Space, Escape a návrat focusu, JSON bez súčasného otvorenia riadku, dostupnosť všetkých akcií, konzola a network. Zistené preexistujúce chyby oddeliť od regresií; nesúvisiace opravy neprimiešať.
- Browser fixtures musia mať vlastný Vite cacheDir a izolovaný profil mimo repozitára, nesmú prepísať cache živého servera. Overiť identitu stránky; HTTP 200 môže byť iba SPA fallback.
- Screenshoty a výsledky označiť ako fixture alebo reálna aplikácia. jsdom ani HTTP fetch nie sú vizuálne browser overenie. Pri nedostupnom browseri príslušné checklisty ostávajú otvorené.
- Mutácie testovať iba na izolovaných fixture dátach alebo určených testovacích záznamoch; bez nevyžiadaného mazania produkčných údajov.
- Každý overený rez atomicky commitnúť iba s vlastnými zmenami. Tento plán nezadáva push, merge ani zmenu vetvy.

## Vzťah k ostatným plánom

Táto revízia na výslovný pokyn používateľa nahrádza predchádzajúci Policy sets pilot v týchto dvoch súboroch. Spoločný rozsah je potvrdený; nežiadať znovu povolenie na jednotlivých konzumentov.

[Globálny technický redesign](global-table-visual-redesign-plan.md) a [technické stránky](technical-pages-redesign-plan.md) slúžia ako história a zdroj funkčných invariantov. Pre vzhľad riešený touto prácou má prednosť nový Linear/Tremor template prispôsobený ABCO. Staré checklisty neoznačovať za dokončené a nepreberať z nich merge do test ani presun účtu do sidebaru. Aktuálny kód a používateľove screenshoty sú baseline, nie predpoklad, že historický redesign ešte nebol zavedený.

## Riziká a rozhodnutia počas auditu

| Riziko | Dopad | Ošetrenie |
|---|---|---|
| Zmena shared defaultu ovplyvní vnorené tabuľky | Vysoký | Kompletná matica konzumentov vrátane netradičných umiestnení |
| Lokálne override skryjú nový vzhľad | Stredný | Vyhľadať styling props/CSS a odstrániť len konfliktnú časť |
| Auto-height poškodí scroll/virtualizáciu | Vysoký | Výškový kontrakt merať skoro, výnimky explicitné a úzke |
| Subtílna paleta zhorší čitateľnosť | Stredný | Nameraný kontrast a reálne screenshoty oboch tém |
| Súbežné úpravy rovnakých komponentov | Vysoký | Pred každým rezom stav Gitu a vlastníctvo zmien |

Otvorené sú len implementačné detaily auditu: kompletný zoznam konzumentov, preukázané výškové výnimky a presné lokálne override. Rozsah už nie je otvorená otázka. Shared zmeny vykonávať sekvenčne; nezávislé kontroly hotových stránok možno oddeliť, nie súbežne editovať shared súbory.
