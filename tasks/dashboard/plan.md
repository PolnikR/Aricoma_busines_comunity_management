# ABCO Overview – implementačný plán (React implementácia)

**Stav:** React Overview s mock dátami implementovaný podľa HTML; T0–T6 overené, kompletný build PASS. [Report a dôkazy](verification.md). Live API fáza T7 zostáva neschválená.
**Aktuálny vizuálny zdroj:** `src/features/dashboard/pages/OverviewPage.tsx`, `overview.css` a komponenty v `src/features/dashboard/components/`. Pôvodná samostatná HTML predloha bola po dokončení integrácie odstránená.
**Táto verzia plne nahrádza zamietnutý smer `prototypes/dashboard-home-v3.html`.** V1/V2/V3 nemeníme a nepreberáme z nich layout, mock dáta ani obsah.
**Cieľ:** zachovať existujúci React Overview a jeho vizuálnu kompozíciu v EXISTUJÚCOM ABCO `AppShell`. Žiadna implementácia mimo daného rozsahu, žiadny nový backend, žiadny commit/push bez zadania.

## A. Zistené fakty z aktuálneho FE (revízia 2026-10-14)

- Pracovný repozitár `C:\Users\polnikr\source\ABCO\Aricoma_busines_comunity_management`, aktuálna vetva počas analýzy `spike/ant-design-shell`; začni kontrolou `git status --short` a neprepínaj vetvu automaticky.
- `src/layouts/app-shell/AppShell.tsx` už vykresľuje `AppSidebar` + `AppHeader`. Desktop pri `lg` má `h-screen`, `overflow-hidden`; obsahová plocha je `flex`, `min-h-0`. `AppHeader.tsx` má `h-14`, teda 56 px.
- `AppShell` rieši vonkajší padding (`lg:px-6 lg:py-5 xl:px-8` a okraj shellu). Nová stránka NESMIE vykresliť HTML `.app`, `.sidebar`, `.app-main` alebo `.global-header` druhý raz.
- `src/app/AppRoutes.tsx` obsahuje index redirect `/ -> routes.resources`. Pre Overview priprav lazy-load `OverviewPage` na indexe s route handle `{ contentScroll: 'contained' }`. `src/app/routes.ts` má `routes.home = '/'`, nepridávaj druhý alias.
- Pri `contentScroll: 'contained'` nastavuje `AppShell` `main` ako `lg:overflow-hidden`; route musí mať reťazec `flex-1 min-h-0 lg:h-full` a vlastný grid `minmax(0,...)`. Kopírovať `height:100dvh` z HTML do vnútra AppShell by spôsobilo overflow.
- `src/shared/components/page/PageHeader.tsx` má `mb-4`, `h1 text-xl leading-9` a samostatný action slot; `TableToolbar.tsx` pridáva načítavací indikátor a `Refresh`. Pre maximálnu vernosť HTML možno použiť kompaktný LOKÁLNY header len v Overview, nie meniť globálny `PageHeader`. Zachovať spoločné ľavé/pravé hranice.
- `src/shared/components/card/Card.tsx`: border/surface a `rounded-[20px]`; `StatCard` obsahuje shared stat pattern. Použiť farebné tokeny a existujúce komponenty, kde ich rozmerový contract sedí; pri inom radius/padding z HTML vytvoriť lokálny `DashboardPanel` alebo lokálnu úpravu tried, NIE meniť shared Card globálne.
- `src/index.css`: Outfit, light/dark tokens `bg-page`, `bg-surface`, `bg-surface-subtle`, `text-text-primary`, `text-text-muted`, `border-border`, `text-accent`; globálny `ThemeProvider` prepína `.dark`. Žiadne natvrdo navrhnuté nové celostránkové farby ani druhá téma.
- `src/shared/icons/Icons.tsx`: existujú `AlertTriangleIcon`, `ServerIcon`, `StorageIcon`, `DiskIcon`, `LayersIcon`, `ExecutionIcon`, `RefreshIcon`, `CheckIcon`, `HelpIcon`. Nekopírovať HTML SVG sprite ako druhú icon knižnicu.
- `src/hooks/useTranslation.ts` + `src/locales/en.json`, `sk.json`, `cs.json`: nové texty lokalizovať, žiadne nové natvrdo vložené anglické UI labely.
- `src/shared/components/page/ContainedViewportFrame.tsx` má na `lg` `overflow-y-auto`, preto ho pre neskrólujúci dashboard nepreberať slepo.
- Autoritatívne existujúce referencie layoutu: `tasks/page-layout-unification-plan.md`, `tasks/page-layout-reference-measurements.md`, `tasks/compact-page-header-measurements.md`. Z posledného merania: desktop toolbar/header začína obsah pri 149 px, navrchu 56px AppHeader; no-page-scroll pri 1366×768 a 1280×600. Treba MERAŤ aktuálny DOM a nepoužiť dokumentované čísla ako tvrdenie o každom stave novej stránky.
- `src/shared/query/cachePolicy.ts` už definuje životný cyklus React Query (nepridávať vlastnú cache či polling pri vizuálnej fáze).
- V repozitári v čase auditu neboli produkčné dashboardové súbory, iba staré plány a HTML prototypy. Neprenášať zamietnuté v3 implementácie.

## B. Vizuálna zmluva – 1:1 NA VNÚTORNEJ STRÁNKE

**Nezamieňať 1:1 obsah s duplikovaním prototypového shellu.** Keďže skutočný ABCO sidebar má inú šírku než samostatný HTML prototyp, celoplošný pixel-to-pixel screenshot vrátane shellu nie je správna metóda. Najprv porovnať obdĺžnik dostupného obsahu a potom jeho pomery/gapy/typografiu; aktuálna React implementácia je zdrojom zachovanej kompozície.

Zachovať poradie, funkciu a kompozíciu súčasnej React stránky:

1. `Overview` header – title/subtitle vľavo, `Demo data / Sample snapshot / Refresh` vpravo.
2. Horný pás **4 rovnako širokých KPI kariet**, v poradí `Critical issues`, `Warnings`, `Running operations`, `Unverified signals`. Rovnaké ikonové štvorce, názvy, podnázvy, veľká hodnota, jemné hover/focus.
3. Dashboard plocha **2 stĺpce po 50 %**, dva riadky: vľavo hore `Requires Attention`, vpravo hore `Recovery Groups Topology`; vľavo dole `Recent Activity`, vpravo dole `Infrastructure Overview`.
4. `Requires Attention`: **3 kompaktné incidentové karty**, každá má ikonu závažnosti, vecný text, timestamp a tlačidlo detailu. Žiadna tabulka/list-scroll/paginácia. `View all issues` smeruje na vhodnú existujúcu detailnú sekciu alebo zostane neaktívnym vysvetleným preview prvkom, nie falošným linkom.
5. `Recovery Groups Topology`: **jeden výrazný donut** s celkom v strede a čitateľnou legendou `Local`/`Metro Mirror` s početnosťami a percentami; graf kresliť bez novej knižnice (CSS conic-gradient alebo SVG); prístupný alternatívny text. Nezmeniť donut na bar chart. Topology nie je protection health.
6. `Recent Activity`: **3 posledné vecné udalosti** v minimalistickej timeline. Nie Access Logs ako business udalosti. Bez scrollbarov.
7. `Infrastructure Overview`: **vnorená mriežka 2×2** kompaktných metrík VMware VMs, IBM Power partitions, FlashSystem volumes, Hitachi volumes. Názov + total + malý progress (s presne vysvetlenou jednotkou). Bez nekonečných zoznamov providerov.
8. Na normálnych desktopoch musí byť vidno VŠETKY štyri hlavné panely a všetky uvedené riadky. Žiadny interaktívny panel nesmie skrývať posledné údaje v `overflow:hidden` alebo vnútornom scrollbare.

Aktuálne `overview.css` používa približne: `.kpis grid 4 col`, `.board grid 2 col × 2 rows (1.06fr/.94fr)`, `.page gap 12px`, `.panel radius 13px`, `.donut width min(218px,33vh,21vw)`. Na nižšej ploche má vlastný height-aware breakpoint `max-height:820px`. To sú vizuálne východiská; v React obsahu prispôsobiť iba tie rozmery, ktoré musí prevziať AppShell. Nesmie sa zaviesť globálny `zoom`/`transform:scale()`.

**Bezproblémové fit pravidlá:**
- Desktop 1600×900 a 1366×768: žiadny `document`, `main` ani **vnútorný panel** s vertikálnym scrollom. Bez vizuálneho orezávania a bez horizontálneho scrollu.
- Test aj 1280×720 a 1024×768, sidebar **expanded aj collapsed**, 1920×1080, light/dark. Responsive rozhodnutie podľa **dostupnej šírky contentu**, nie iba šírky okna.
- Pri 1024×768 alebo krátkom viewporte, keď by čitateľnosť mala padnúť pod použiteľnú mieru, bezpečný fallback = zjednodušený 2-col/1-col layout s prirodzeným scrollom len tam, kde sa 1-screen fyzicky nedá splniť; nikdy nie clipped content alebo dva scroll ownery.
- Mobil 390×844: 1-col/natural document scroll je nevyhnutný a povolený (nie je realizovateľné 8 kariet na jednu obrazovku), mobilný `AppHeader` a drawer zachovať.
- Žiadny druhý header/sidebar ani druhý scrollbar obklopujúci všetky dashboardové panely. Nemení sa shell ani iné FE pages.

**Vizuálne kontrolné body pre ďalšie zmeny:** renderovať React route v skutočnom prehliadači pri rovnakých viewportoch, porovnať jeho kompozíciu s aktuálne schválenou implementáciou a zmerať DOM rects pre 4 KPI + 4 panely: x/y/width/height, gaps, alignment; odchýlky zapisovať a upravovať, nie len deklarovať `looks fine`. Tolerancie: približne ±4 px pre zarovnanie panelov/karty a cca ±8 px pre proporcie po rozdielnom content width, ak nebráni legibilite. Nadpisy, typography, výška a kruhový graf vizuálne porovnať.

## C. Architektúra komponentov a data boundary

Cieľový feature priečinok `src/features/dashboard/`:

~~~text
pages/OverviewPage.tsx
components/DashboardSummary.tsx
components/DashboardMetricCard.tsx
components/RequiresAttention.tsx
components/RecoveryTopologyDonut.tsx
components/RecentActivity.tsx
components/InfrastructureOverview.tsx
components/DashboardPanel.tsx (iba ak potrebný pre 1:1 panel surface)
model/dashboardTypes.ts
model/selectDashboardMetrics.ts
mocks/dashboardFixtures.ts
~~~

- Žiadny všeobecný framework pre dashboard alebo nové API klienty. Dáta cez typed `props`/view-models; vizuál nezávislý od transportu. Neskoršie reálne React Query hooky v samostatnom `useDashboardOverview` / dátovom adapteri.
- Etapa 1 je **vizuálna integrácia s deterministickým mock fixture** (jeden konzistentný dataset). Vždy viditeľné `Demo data`, nie reálny stav platformy. Základné hodnoty a incidenty zachovať z aktuálneho `dashboardFixtures.ts`, nie zo zamietnutého v3; každý agregát vyrátať zo vzoriek, kde je to vhodné. Nulový čítač sa nesmie zamieňať s `Unknown`.
- Všetky onclick tlačidlá: buď skutočná navigácia na existujúce `routes.*`, alebo funkčný lokálny preview detail cez shared `Modal/DetailView`. Neinteraktívne preview prvky musia byť zjavne označené, nie tváriť sa ako akcia.
- `Loading`, `Empty`, `Partial error`, `Unknown` a `Demo` sú odlišné stavy bez layout jumpu. Kontrast statusov musí fungovať aj v dark mode; ikonka nie je jediná informácia.
- Prekladové keys `dashboard.*` pre en/sk/cs. Formátovanie času cez `src/shared/utils/dateTime.ts` / existujúce shared formattery, nie `new Date(naive)`.
- Nepreberať CSS reset, body/html styly, topbar, sidebar, scriptovú manipuláciu DOM ani HTML inline event-handlery do Reactu. Zachovať existujúce ThemeProvider/LanguageContext/AuthProvider.
- Žiadny fetch po každom KPI a žiadny globálny test všetkých providerov. Prototyp NIE JE dôkaz, že existujú všetky potrebné health metriky.

## D. Integrácia so súčasnými API: samostatná schválená etapa PO vizuálnej akceptácii

V aktuálnom `openapi/abco-api.json` sú najmä tieto použiteľné read API:
- `GET /get_providers`: zoznam providerov, role/type a `credentialStatus`; NIE posledný connection test.
- `GET /get_recovery_apps` a `GET /get_recovery_groups`: konfigurácie; groups majú `topology` a `orchestration.pushed`, ale nie úspešné vytváranie snapshotov.
- `GET /discovery/cache/history`: discovery runy `success`/`started_at`/`duration_ms`/`error`.
- `GET /get_orchestrator_runs`: vyžaduje `provider_id` a `dag_id`, nie agregovaný feed (výrazný N+1 fan-out).
- `GET /test_provider`, `GET /test_platform_provider`: každý len pre jedno ID, nevolať hromadne z dashboardu.
- `GET /get_recovery_group_inventory`: `run_id` konkrétnej skupiny, nie globálny snapshot/replication-health.
- `GET /get_volume_tree`: súčty na jeden FlashSystem provider; `fcmaps` nie je univerzálny počet snapshotov; Hitachi nemá overenú analogickú agregáciu.
- `GET /get_access_logs` sú technické HTTP požiadavky, NIE automaticky použiteľný feed business eventov.

Pre reálne `Critical issues`, `Running operations`, `Unverified signals`, incident feed, protected/healthy a všetky "Healthy"/trend grafy potrebujeme doménové pravidlá, čerstvosť a agregáciu na BE. **Neodvodzovať "OK" z `credentialStatus:ok`, `Active` ani `orchestration.pushed`.** Bez overiteľného zdroja zobraziť `Unknown`, alebo ponechať jasne označené demo UI. Nie zavádzať vymyslené health percentá, RPO či historické časové rady.

Nespájať etapu 1 a BE prácu do jedného PR bez výslovného súhlasu. Súčasný cieľ je presnosť vizuálu a architektúra bez zadlžovania.

## E. Implementačná stratégia, kontrolné body a Definition of Done

1. **Baseline (historicky splnené)**: odmerať React Overview pri 1600×900, 1366×768 a 1280×720; odmerať screenshoty skutočných ABCO Resources, Recovery Groups a Overview slot v aktuálnom `AppShell`. Potvrdiť rozdiel shell width/padding.
2. **Route frame**: React `OverviewPage` iba s page headerom a 2×2 prázdnymi panelmi, zachovať `AppShell`, route handle, sidebar, dark/system theme a jazyk. Browser checkpoint pred ďalšími komponentmi.
3. **KPI komponenty**: všetky štyri vrátane rôznych číslic (1/3/10/100/1000) a dlhých názvov. Schváliť hornú geometriu.
4. **Requires Attention + donut**: spracovať ako dva súrodé, rovnako široké panely (nie tabulky), 3 pevné incident karty, CSS/SVG kruhový graf, legenda a dostupné aria texty.
5. **Recent Activity + Infrastructure**: posledné tri eventy, 2×2 karty, správna typografia/progress a rovnaká šírka panelov 50:50.
6. **Interakcie a stavy**: demo tag, Refresh iba lokálne demo, navigácia/detail, loading/empty/error, dark/light, en/sk/cs, truncated/wrapped names. Žiadny náhodný fetch alebo nový endpoint.
7. **Finálne browser signoff**: minimálne `1600×900, 1366×768, 1280×720, 1024×768, 390×844`, collapsed/expanded sidebar, light/dark, navigácia cez logo a Overview. Pre každý viewport zapísať screenshot, scrollWidth vs clientWidth a scrollHeight vs clientHeight pre `document`, `main`, `.dashboard-panel`. Pozrieť console a network.
8. **Checks**: cielene `vitest`, `eslint`, `npm run typecheck`, `npm run build` (vrátane `api:check`). Nevyhodnocovať fixture hodnoty ako reálne zdravotné stavy. Pred odovzdaním diff summary s explicitným potvrdením, že sa nemenili unrelated components ani backend.

**Hotové až keď:** vizuál React Overview je potvrdený v skutočnom ABCO shelli; 4 KPI + 2×2 panel layout v jednom desktop viewporte; žiadny skrytý obsah, žiadny panel/page scroll pri 1600×900 a 1366×768; žiadny mock údaj vydávaný za live; všetky interakcie majú význam; testy a build bez regresií. Pri nekompatibilite medzi vizuálom Overview a AppShell **neprepisovať AppShell** – zdokumentovať konkrétny rozdiel a vyžiadať schválenie len na ten rozdiel.

## F. Výslovne mimo rozsahu

- Neimplementovať nový dizajn podľa vlastných nápadov, nepridávať iné grafy/KPI/rozloženia, nezahustiť layout.
- Neobnovovať zamietnuté `dashboard-home-v3.html` alebo starý dashboard plán.
- Nepridávať nové FE API volania pre všetky VM/provider snapshots, connection testy alebo DAGy.
- Nezapisovať mock dáta do globálneho state alebo produkčných storage inventárov.
- Nemeniť `AppShell`, existujúce Pages, backend, OpenAPI, Orval generated files alebo package dependencies.
- Nekončiť pri Unit testoch bez reálneho browser screenshot porovnania.
- Nie automaticky commit/push/merge.
