# Operations Console — Light/Dark a vyplnenie dostupnej obrazovky

Dátum plánu: 2026-10-15. Implementácia dokončená a overená 2026-10-16 inline, v atomických commitoch. Výsledky a finálne rozmerové hranice: [overenie implementácie](operations-console-verification.md).

## Zadanie a rozsah

Východisko je [Operations Console HTML](../../prototypes/dashboard-modern/operations-console.html). „Open Console“ v zadaní interpretujeme ako tento návrh. Cieľom je rovnaký technický dashboard v Light aj Dark režime, ktorý vyplní dostupnú plochu aplikácie a nevyžaduje posúvanie stránky ani vnútorných panelov. Metriky, jednotky a význam demo dát zostávajú zachované.

Používateľ výslovne zvolil **prepínateľné sekcie bez scrollovania pre malé okno a mobil**. Na podporovanom desktope sú všetky metriky viditeľné súčasne; v malom okne sú všetky dostupné prepínaním sekcií, prípadne stránkovaním ich položiek. Tieto režimy nesmú byť zamieňané pri reportovaní výsledkov.

Plán zahŕňa dopracovanie referenčného HTML a následné prenesenie do existujúceho React Overview. Nevytvára nový dashboardový backend, nové KPI, nové grafové závislosti, globálny dizajnový systém ani druhý navigačný shell. Existujúce detaily, refresh, demo preview, stavové varianty a resource prefetch zostanú funkčné.

`tasks/plan.md`, `tasks/todo.md` aj starší `tasks/dashboard/plan.md` obsahujú inú alebo historickú prácu. Zostávajú zachované. Tento dokument je autoritatívny pre nový vizuálny smer; starší zákaz nahradiť donut iným grafom sa na tento používateľom vyžiadaný smer nevzťahuje. Otvorená API fáza zo starého plánu sa týmto neschvaľuje.

## Zistený stav

- `AppRoutes.tsx` už vykresľuje Overview na index route s `contentScroll: 'contained'`.
- `AppShell.tsx` má desktopový výškový rámec, vonkajšie okraje a `main` s paddingom. `AppHeader` zaberá 56 px. Sidebar môže byť rozbalený, zbalený alebo mobilný overlay.
- `OverviewPage.tsx` už má `.dashboard-host`, `.operations-dashboard`, štyri KPI, štyri panely, density preference a lokálne demo interakcie.
- Súčasná implementácia používa `overview.css`, `dashboard-kpi.css`, `dashboard-charts.css`; úzke kontajnery dnes môžu aktivovať scroll. Túto vetvu treba pri integrácii nahradiť zvoleným režimom sekcií.
- `ThemeProvider` už rieši `light | dark | system`, `.dark`, `data-theme`, `color-scheme`, zmenu systémovej témy a uloženie voľby. `ThemeSelector` existuje v používateľskom menu. Nevytvárať druhý zdroj témy ani druhý storage key.
- `src/index.css` má svetlé a tmavé `--app-*` tokeny. Nové dashboardové tokeny budú lokálne a nadviažu na existujúce tokeny.
- Existujú focused testy `OverviewPage.test.tsx`, `DashboardMetricCard.test.tsx`, `selectDashboardMetrics.test.ts`, `ThemeContext.test.tsx`, `AppShell.test.tsx`.
- Doterajšie overenie samostatného HTML nie je dôkaz, že rovnaký layout funguje vo vnútri reálneho AppShell. Meranie host kontajnera je prvá implementačná úloha.

## Pevný dátový kontrakt

| Oblasť | Zachované hodnoty a význam |
| --- | --- |
| KPI | Failed snapshot jobs **3**, Replication issues **7**, Connection failures **4**, Missing volumes **5** |
| Issues Distribution | **19 category counts**; **16 / 37 / 21 / 26 %**. Podiely sa počítajú z 3/19, 7/19, 4/19, 5/19, až popisy sa zaokrúhľujú. Nie počet unikátnych incidentov ani podiel poškodenej infraštruktúry. |
| Recovery Applications | **34**, VMware **23 / 67.6 %**, IBM Power **11 / 32.4 %**, deployed **26**, not deployed **8** |
| Recovery Groups Topology | **24**, Local **16 / 66.7 %**, Metro Mirror **8 / 33.3 %**, FlashCopy mappings **42**, groups with snapshot policy **18** |
| Infrastructure | VMware **128**, powered on **108/128**; IBM Power **32**, active **30/32**; FlashSystem **186**, available **178/186**; Hitachi **94**, available **91/94** |

Zachovať `Demo data`, `Sample snapshot`, vysvetlenie FlashCopy „demo; not recovery points“, demo význam snapshot policy a existujúce významy dostupnosti. Unknown/loading nie sú nula. Pri partial stave sa nesmie vykresliť neznáma hodnota ako potvrdená hodnota. Žiadne vymyslené trendy, SLA, zdravotné skóre ani označenie live.

## Návrh rozloženia

### 1. Skutočná dostupná plocha

„Celá obrazovka“ znamená **obsahový obdĺžnik pridelený dashboardu po odpočítaní existujúcej hlavičky, sidebaru a zámerného rámca aplikácie**, nie systémový Fullscreen/F11.

- V samostatnom HTML má vonkajší rámec výšku `100dvh`; hlavička má vlastný riadok a obsah dostane zvyšok.
- V Reacte použiť výšku rodiča (`height: 100%`, `flex: 1`, `min-height: 0`, `min-width: 0` v celom reťazci). **Nedávať ďalšie `100vh/100dvh` do Overview vnútri AppShell.**
- Odstrániť lokálny `max-width` dashboardu a centrovanie, ktoré vytvárajú široké prázdne pásy. Šírka aj výška koreňovej mriežky zodpovedajú host kontajneru.
- Hlavička stránky a KPI majú obsahom určenú výšku. Zvyšnú výšku dostane grid analytických a infra panelov cez `minmax(0, …fr)`; jeho riadky vyplnia zvyšok, nie pevné súčty pixelov.
- Panely sa natiahnu na výšku gridovej bunky. Ich hlavičky a poznámky zostanú pri okrajoch; stredná vizualizácia dostane zvyšný priestor. Riadky grafu sa rozložia rovnomerne. Nepridávať ďalšie dáta na zaplnenie miesta.
- Pozorovať rozmery `.dashboard-host`, nie jednotlivých panelov. Existujúci AppShell observer publikuje šírku/pozíciu pre overlays; pre dashboard ho nerozširovať bez potreby. Úzky lokálny observer môže klasifikovať šírku aj výšku hostu, ak CSS container queries nestačia pre stav sekcií.
- Klasifikácia je odvodená od vonkajšieho hostu, nesmie sama meniť jeho rozmery ani vytvárať resize slučku. Zrušiť observer pri unmount; bez polling intervalov a série `setTimeout` opráv layoutu.

### 2. Kompozície podľa rozmerov hostu

Nasledujúce hranice sú **návrhový štart**, nie namerané fakty. OC1 a OC2 ich musia overiť v EN/SK/CS, s oboma stavmi sidebaru. Prioritu má merateľná čitateľnosť a dostupnosť dát.

| Režim | Počiatočná podmienka hostu | Kompozícia |
| --- | --- | --- |
| Full / wide | približne W ≥ 1150 a H ≥ 600 CSS px | 4 KPI v rade; Issues, Applications a Topology v 3 stĺpcoch; Infrastructure v plnej šírke dole |
| Full / compact | približne W ≥ 850 a H ≥ 440 CSS px | 4 úsporné KPI; 4 panely v 2 × 2 mriežke, infrastructure položky podľa miesta v 2 × 2; všetky dáta naraz |
| Sections | menšia dostupná šírka alebo výška | jedna aktívna sekcia vypĺňa celý zvyšok; navigácia medzi Indicators, Issues, Applications, Topology a Infrastructure |

Na desktope sa kompozícia môže meniť, ale metriky nesmú potichu zmiznúť. Šírka monitoru sama nestačí: rozbalený sidebar a jazyk môžu posunúť stránku do kompaktnej kompozície. Zmena témy nesmie zmeniť geometriu.

`Auto` vyberá medzery podľa dostupnej plochy. Existujúce `Compact` a `Spacious` môžu zostať ako preferencia medzier, nikdy nesmú vynútiť overflow. Obmedziť preferenciu dostupnou plochou a zmenou kompozície; neskresľovať čísla ani mierku grafov. Na veľkom monitore aj Compact naďalej vyplní host cez pružné riadky.

### 3. Malé okná a mobil — schválené prepínanie

- Zobraziť ovládač aktívnej sekcie, predchádzajúcu/ďalšiu sekciu a jasnú pozíciu. Na úzkom mobile použiť dostupný select alebo kompaktný pager namiesto horizontálne scrollujúcej lišty.
- V Sections režime nie je všetkých 4 KPI trvalo nad panelom; majú vlastnú sekciu Indicators. Inak by zabrali plochu potrebnú na aktívny panel.
- Keď sa nezmestí celá Infrastructure alebo Indicators, stránkovať ich položky, napr. jednu či dve karty na stránku. Pri ostatných paneloch v prípade potreby stránkovať logické podsekcie. Všetky čísla, jednotky aj vysvetlivky musia zostať dostupné; žiadne automatické rotovanie stránok.
- Aktívna sekcia prežije resize, zmenu témy a otvorenie detailu. Neaktívne panely nesmú zostať v tab poradí. Pri zmene kompozície zachovať logický fokus alebo ho bezpečne presunúť na ovládač aktívnej sekcie.
- Prepnutie sekcie nesmie spustiť nový sieťový request, duplikovať prefetch ani zmazať stav detailu.
- Minimálny základný podporovaný viewport: **320 × 480 CSS px**. Overiť aj 390 × 844 a 768 × 1024. Pri zoomovaní rozhoduje efektívna CSS plocha, nie fyzické rozlíšenie monitora.
- „Bez scrollovania pri ľubovoľne malom okne a ľubovoľnom zoome“ nie je fyzicky splniteľná požiadavka pri zachovaní čitateľnosti. Pod podporovaným minimom nesmie implementácia orezať obsah: zachová prístupný reflow aj za cenu scrollu. Tento krajný prípad sa nesmie reportovať ako splnený no-scroll režim.

### 4. Light a Dark

Jeden DOM, jedna dátová cesta, rovnaká kompozícia. Meniť iba sémantické farby. React rešpektuje existujúci ThemeProvider a jeho `system` voľbu; prototyp ukáže obe explicitné témy v tom istom dokumente.

| Tokenová rola | Light | Dark |
| --- | --- | --- |
| Pozadie / panel | chladná sivobiela plocha, biele panely | uhlovo modrá plocha, mierne svetlejšie panely |
| Primárny text | tmavý grafit | svetlá sivobiela |
| Sekundárny text | dostatočne tmavý slate | svetlejší slate |
| Akcent | tmavší teal alebo modrá s kontrastom na bielej | svetlý cyan/teal |
| Failed / issues | červená / jantárová s textovým stavom | svetlejšie ekvivalenty s rovnakým významom |
| Grafy / track | čitateľný rozdiel segmentu a podkladu | čitateľný rozdiel segmentu a podkladu |

Použiť lokálne `--dashboard-*` tokeny mapované na `--app-*`. Dopĺňať lokálnu farbu iba tam, kde je to potrebné pre Operations Console alebo kontrast; nemeníme globálnu paletu ostatných stránok. Bežný text má kontrast aspoň 4.5:1, potrebná grafika a focus aspoň 3:1. Kľúčové názvy/jednotky min. 12 px, numerické hodnoty min. 20 px; pomocný text min. 11 px. Pri nedostatku miesta zmeniť kompozíciu alebo stránku, nie znižovať tieto limity.

### 5. Technický vizuál panelov

- **KPI:** kompaktný pás, dominantné tabulárne číslice, kategória, textový stav, zachovaný kontext a klikateľný detail.
- **Issues:** štyri vodorovné pruhy na spoločnej 0–100 % stupnici, percento aj count v samostatne pomenovaných stĺpcoch; 19 category counts a vysvetlenie sú stále dostupné. Dĺžky z nezaokrúhlených podielov, rovnaká mierka pre všetky riadky.
- **Applications:** dva horizontálne podielové pruhy, celok 34 a footer 26/8. Zachovať presné labely a prístupný textový ekvivalent grafu.
- **Topology:** vetvenie Groups → Local / Metro Mirror, počty aj percentá. Je to rozdelenie skupín podľa typu, nie nová mapa skutočných replikačných spojení. Footer 42/18 zachová demo vysvetlivky.
- **Infrastructure:** štyri kompaktné resource bloky s totals, čitateľným selected/total a jednotkou. Klikanie stále otvorí existujúci detail. Partial provider zobrazí unknown, ostatné zostanú dostupné.
- Loading/empty/partial/unknown používajú rovnaké rozmery panelov, nezanechajú prázdnu dieru v gride a nespôsobia skok do iného scroll režimu.

## Akceptačná zmluva

1. **Vyplnenie:** hranice koreňového dashboardu sa zhodujú s host content boxom s toleranciou 2 CSS px. Spodná hrana posledného gridového riadku je na spodnej hrane prideleného obsahu. Povolené sú len definované paddingy/gapy; bez prázdneho pásu pod dashboardom či nevyužitých gridových buniek. Zámerné vnútorné miesto grafu nie je chyba.
2. **Bez scrollu a orezania:** na podporovaných rozmeroch document, shell content, dashboard aj aktívne panely majú `scrollHeight ≤ clientHeight + 1` a `scrollWidth ≤ clientWidth + 1`. Všetky viditeľné metriky, poznámky a controls sú v dostupnom obdĺžniku; žiadne prekrytie ani skryté posledné riadky. Nestačí `overflow: hidden`, screenshot alebo samotný test scrollHeight.
3. **Čitateľnosť:** žiadny `zoom`, `transform: scale`, globálne zmenšovanie fontov, ellipsis na čísliciach ani zmazanie vysvetliviek kvôli fitu. Zachovať ovládanie klávesnicou, viditeľný focus a prístupné labely grafov/stavov.
4. **Témy:** Light/Dark majú rovnaké recty panelov a rovnaké metriky; system preference, uložená voľba a storage-unavailable fallback sa správajú ako doteraz.
5. **Desktop:** pri 1280 × 720, 1366 × 650, 1366 × 768, 1440 × 900, 1536 × 864, 1600 × 900, 1920 × 1080 a 2560 × 1440 má reálny AppShell v expanded aj collapsed stave všetky metriky naraz, bez scrollu. Ak OC1/OC2 ukáže fyzický konflikt s čitateľnosťou, zdokumentovať ho pred integráciou a prepracovať kompozíciu; neoznačiť paged režim za splnenie tohto bodu.
6. **Malé plochy:** 1024 × 768 s rozbaleným sidebarom, 768 × 1024, 390 × 844, 320 × 568 a 320 × 480 môžu používať Sections. Overiť každú sekciu/podstránku, nie len úvodnú. Pri 200 % zoome použiť efektívne CSS rozmery a pravidlo podporovaného minima.
7. **Robustnosť:** EN/SK/CS, najdlhšie labely, veľké counts (aspoň 5 číslic), 0, chýbajúce dáta, všetky existujúce stavy, resize cez hranice režimov, sidebar toggle a otvorenie/zatvorenie detailu. Dialogy majú vlastný existujúci prístupný overflow kontrakt; no-scroll zmluva sa týka dashboardovej plochy, nie ľubovoľného dlhého detailu.

Pre mobile-only zvyšnú výšku je súčasťou plánu úzky route opt-in, napr. contentFit: 'viewport', iba na Overview. Existujúce contentScroll: 'contained' samotné nestačí: mobilný AppShell dnes nemá rovnaký pevný výškový kontrakt. OC3 upraví tento rozdiel podmienečne pre Overview; ostatné routes si zachovajú pôvodný scroll aj rozmery.

## Úlohy a závislosti

Úlohy sú vedené v GitHub Issues podľa `CLAUDE.md` a `docs/agents/issue-tracker.md`. Tento dokument je návrh a index, nie druhý paralelný todo zoznam. Každá úloha má akceptačné kritériá, konkrétne overenie, predpokladané súbory a závislosti v issue.

<!-- TASK_INDEX_START -->
| ID | Úloha | Závislosť | GitHub |
| --- | --- | --- | --- |
| OC1 | Meranie reálneho AppShell | Žiadna | [#18](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/18) |
| OC2 | Adaptívny prototyp Light/Dark | OC1 | [#19](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/19) |
| OC3 | Route opt-in pre výšku viewportu | OC2 | [#20](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/20) |
| OC4 | React rámec, témy a KPI | OC3 | [#21](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/21) |
| OC5 | Technický Issues panel | OC4 | [#22](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/22) |
| OC6 | Applications a Topology | OC5 | [#23](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/23) |
| OC7 | Infrastructure pás | OC6 | [#24](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/24) |
| OC8 | Lokalizácia ovládania | OC7 | [#25](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/25) |
| OC9 | Sekcie a stránkovanie | OC8 | [#26](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/26) |
| OC10 | Finálne overenie | OC9 | [#27](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/27) |
<!-- TASK_INDEX_END -->

Poradie: OC1 → OC2 → OC3 → OC4 → OC5 → OC6 → OC7 → OC8 → OC9 → OC10. Implementačné kroky sú dokončené; dôkazy a hranice overenia sú v záverečnom reporte. Žiadny deploy, push ani merge nie je súčasťou tohto zadania.

### Kontrolné body

- **A — po OC2:** light/dark prototyp aj nameraný AppShell rozmerový kontrakt; preukázané vyplnenie plochy a minimálna čitateľnosť. Prototyp musí simulovať aj obsahovú plochu rozbaleného sidebaru, nielen celú obrazovku.
- **B — po OC5:** React frame a Issues držia rovnaké čísla, obe témy, focus a demo interakcie. Bez zásahu do iných routes.
- **C — po OC7:** všetky panely sú v novom vizuále; desktopový dashboard má úplný obsah a pružne vyplnenú plochu.
- **D — po OC9:** všetky malé režimy bez scrollu, lokalizované ovládanie, plné pokrytie metrického inventára cez pager.
- **E — po OC10:** browserové dôkazy, focused testy, čistý diff a atomické commity. Až tento bod znamená dokončenú implementáciu.

## Overovanie pri budúcej implementácii

Existujúce focused testy spúšťať podľa dotknutých kontraktov:

```powershell
npm exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/DashboardMetricCard.test.tsx src/features/dashboard/model/selectDashboardMetrics.test.ts
npm exec vitest run src/contexts/ThemeContext.test.tsx
npm exec vitest run src/layouts/app-shell/AppShell.test.tsx src/layouts/app-shell/AppHeader.test.tsx
```

Theme/shell testy sú integračná regresia, nemeníme ich implementáciu automaticky. Nové component/layout/locale testy sú pomenované v issues. Cielený ESLint spúšťať iba nad zmenenými TS/TSX súbormi. `git diff --check` pred každým commitom. Úplný suite a produkčný build sa štandardne nespúšťajú; projektový `npm run build` ich agreguje a je pre čisto lokálny vizuálny rozsah zbytočne široký.

JSDOM neoveruje rozmery layoutu. Potrebný je reálny prehliadač a uložené dôkazy: viewport, efektívne rozmery hostu, jazyk, téma, sidebar, density, aktívna sekcia, scroll rozmery, hranice relevantných elementov a screenshot. Overovať aj prekrytie textu a čitateľnosť, nie iba neprítomnosť scrollbarov. CSS zmeny fitu musia mať opakovateľný merací skript; naň nadväzuje vizuálna kontrola.

Výsledky patria do `tasks/dashboard/operations-console-verification.md` (vznikne až počas implementácie). V tomto plánovacom kroku sa neuvádzajú ako hotové.

## Riziká a hranice

| Riziko | Opatrenie |
| --- | --- |
| HTML fit nepokrýva React shell | Prvá úloha meria reálny host; nepoužiť duplikovaný header/sidebar. |
| Prázdne miesto po zmene rozlíšenia | Flex/grid vypĺňa host, bez pevnej maximálnej šírky a pevnej výšky dashboardu. |
| Bez scrollu len vďaka clippingu | Kontrolovať scroll rozmery aj recty obsahu, všetky sekcie a focus. |
| Staré CSS prepisuje nové | Izolovaný Operations Console modifier/style entry; odstrániť iba dashboardové pravidlá/importy, ktoré nový smer nahradil. |
| Dlhé preklady / viac číslic | Overiť pred zvolením hraníc kompozícií; nepoužívať 9px labely z prototypu ako produkčné minimum. |
| Rozmerový režim kmitá | Observer stabilného hostu, diskrétne režimy, žiadne vlastné meranie meniacich sa detí ako vstup do veľkosti hostu. |
| Dve nezávislé témy | React používa existujúci ThemeProvider a tokeny; neduplikovať preference. |
| Zväčšenie UI mimo fyzicky dostupnej plochy | Sections + stránkovanie v podporovanom minime; mimo neho prednosť dostupnosti pred clippingom. |

## Rozhodnutia na začiatok implementácie

Mobilný fallback bol zvolený používateľom: sekcie bez scrollovania. Iné blokujúce produktové otázky nie sú otvorené. Presné hranice kompozícií, rozdelenie fr riadkov a minimálne počty položiek na jednej podstránke určí meranie v OC1/OC2. Ak sa nedá splniť desktopová matica pri uvedenej čitateľnosti, ide o konkrétny rozmerový konflikt na vyriešenie pred React integráciou, nie povolenie potichu zmeniť zadanie.
