# Plán zapracovania Dashboard Overview s mock dátami

Stav: pripravený na implementáciu; implementácia sa týmto dokumentom nespúšťa.
Úlohy a kontrolné body: [todo.md](todo.md).

## Cieľ a rozsah

Preniesť posledný čitateľný návrh z `prototypes/dashboard-home-v3.html` do React stránky Overview v existujúcom ABCO FE. Stránka bude používať lokálne, deterministické mock dáta a zachová fungujúcu navigáciu, globálny Light/Dark/System režim a existujúce prihlásenie aplikácie.

**Etapa 1 – mock integrácia, nie hotový dátový dashboard.** Navrhnutá trasa `/` má v tejto etape slúžiť na overenie React integrácie a vzhľadu. Hodnoty 18 aplikácií, 24 skupín, provider inventár a HTTP záznamy sú výhradne demonštračné a nesmú sa prezentovať ako aktuálny stav prostredia. Označenie `Mock data` a fixný čas demo snapshotu musia zostať viditeľné pre používateľa aj mimo development režimu. **Produkčné nasadenie Overview ako prehľadu reálneho stavu nie je dokončením tohto plánu**; vyžaduje samostatne schválenú etapu zapojenia dát a rozhodnutie o nasadení. Nepridávať skryté automatické prepnutie na mock pri chybe živého API.

Predpoklad plánu: „zapracovanie“ znamená integráciu do FE, nie ďalšiu úpravu samostatného HTML. Teraz sa vytvára iba plán. Pôvodné obmedzenie bez zmien produkčných komponentov platilo pre tvorbu HTML prototypu; nižšie uvedené zmeny FE sú navrhovaný rozsah následnej implementácie.

Referenčný HTML súbor má pri príprave plánu SHA256 `5AF8ADEFAE35C833166255BA8B8F50D9EBD7BA79C676A7A3A10D0C7B979078D6`. Je referenciou pre vizuálne prvky a obsah, **nie pre scrollovanie alebo rozmery panelov**. Integrované Overview musí rešpektovať viewport a `AppShell`, ako ostatné contained stránky ABCO. V1, V2 a V3 sa počas integrácie neupravujú.

Výsledok obsahuje:

- Dve KPI karty Recovery Applications a Recovery Groups.
- Stacked bar chart Applications by Environment a donut Recovery Groups Topology.
- Širokú sekciu Resources Overview s funkčnými Source/Target tabmi, metrikami jednotlivých providerov a rozbalením zoznamu.
- Latest Activity so šiestimi HTTP requestmi a detailom plnej URL.
- Loading, Empty, Error a čiastočnú chybu jedného providera.
- Domovskú trasu `/` a navigačnú položku Overview v existujúcom shelli.

Backend, generated API, Orval, inventory stránky ani recovery workflow sa nemenia. **V etape 1** dashboard nevolá recovery, inventory ani access-log API; nejde o trvalé architektonické rozhodnutie, že Overview nemá používať už existujúce FE API. Existujúce požiadavky shellu a autentifikácie nie sú súčasťou tohto zákazu. Žiadne orchestration akcie, historické trendy, readiness alebo vymyslený provider health. Žiadne nové závislosti. Bez commitu a pushu podľa platného zadania používateľa.

## Overené integračné body

| Existujúci súbor | Zistenie a použitie |
|---|---|
| `src/app/routes.ts` | `routes.home` už existuje a má hodnotu `/`; nepridávať duplicitnú konštantu. |
| `src/app/AppRoutes.tsx` | Index teraz presmeruje na Resources; nahradiť ho lazy-loaded Overview stránkou. |
| `src/layouts/app-shell/AppShell.tsx` | Na `lg+` podporuje `handle={{ contentScroll: 'contained' }}`: hlavný obsah je `lg:overflow-hidden`, vnútorný route kontajner `lg:min-h-0`. Overview použije existujúci contained režim rovnako ako Resources / Recovery Runs; `AppShell` nemeníme. |
| `src/layouts/app-shell/AppSidebar.tsx` | Doplniť Overview a presmerovať brand link na `routes.home`; zachovať ostatné položky a collapsed/mobile správanie. Pri trase `/` zároveň odstrániť dnešný fallback, ktorý predvolene rozbaľuje `Discovery & Inventory` bez aktívnej podstránky. |
| `src/shared/components/card/Card.tsx` | Použiť Card/CardTitle/CardDescription s lokálnymi className podľa návrhu. |
| `src/shared/components/filters/FilterTabs.tsx` | Použiť existujúce klávesové ovládanie tabov. |
| `src/shared/components/modal/Modal.tsx` | Použiť pre request detail; poskytuje Escape, focus trap a návrat focusu. |
| `src/contexts/ThemeProvider.tsx` | Použiť existujúce tokeny a globálny prepínač; nevytvárať druhý theme state. |
| `src/hooks/useTranslation.ts` | Texty cez `t`, formátovanie podľa `language`; locales en/sk/cs. |

`PageHeader` má pevné menšie písmo. Pre Overview vytvoriť lokálny sémantický header s veľkosťou podľa návrhu, bez globálnej zmeny PageHeader a ostatných stránok. HTML sidebar, topbar, embedded fonty ani CSS reset sa nekopírujú do React stránky.

Súčasný `AppSidebar` inicializuje `openMenu` cez `findRouteMenu(location.pathname) ?? 'Discovery & Inventory'`; `findRouteMenu` vyhľadáva iba podmenu a pri `/` nevráti nič. Pre Overview preto treba inicializovať menu bez automatického rozbalenia Discovery. Pri prechode na existujúce podstránky sa má naďalej zobrazovať ich nadradené menu; pri navigácii **z Resources na Overview** nesmie zostať rozbalené Discovery len v dôsledku automatického defaultu. Používateľom manuálne otvorené podmenu sa však nesmie pri každom kliknutí zbytočne resetovať. Rozlíšiť implicitne aktívne menu od explicitnej používateľskej voľby. Aktívny top-level `Overview` riešiť existujúcim `NavLink` pre `routes.home`, nie prefixovým matchom, ktorý by zvýraznil Overview na všetkých trasách.

## Vizuálna zmluva

- Outfit a existujúce semantic color tokens z ABCO; žiadne nové globálne farby ani CSS reset.
- Desktop: dve KPI karty, pod nimi väčší environment graf a menší donut, potom Resources cez celú šírku a Latest Activity dole. Ich výšky a proporcie prispôsobiť reálne dostupnej ploche `AppShell` (po odpočítaní headera, paddingov a gapov), aby sa všetky **hlavné sekcie** zobrazili bez scrollovania celého Overview.
- Mobil: jeden stĺpec, prirodzené rolovanie. Tablet a malé okná: adaptívny fallback bez orezávania obsahu; ak pri danom rozlíšení/zoome nemožno zachovať čitateľnosť všetkých kariet naraz, musí byť obsah dostupný cez vhodné lokálne overflow alebo v mobile cez prirodzené rolovanie. Tablet reaguje na šírku reálneho obsahu po odpočítaní sidebaru.
- Hlavný titul 30–34 px, nadpisy sekcií 19–20 px, body/ovládacie prvky 14–16 px, pomocný text najmenej 13 px. Výnimka: malé HTTP badges najmenej 12 px. Na nižších desktop viewportoch využiť adaptívne paddingy/gapy a výšky grafov pri zachovaní čitateľnosti, nie globálny CSS `scale()`.
- KPI čísla preferovane 48–56 px, provider totals približne 36 px; pri menšej dostupnej výške povoliť lokálne kompaktné rozmery (`clamp`/height-aware breakpoint) bez pretekajúceho textu. Prioritou je čitateľný dashboard na jednu desktopovú obrazovku.
- **Desktop `lg+`: Overview používa route handle `contentScroll: 'contained'` a route root `lg:h-full lg:min-h-0`, bez vlastnej druhej výšky `100vh` (tá by ignorovala header a padding AppShellu).** Rozloženie má využívať `flex/grid` s `minmax(0, ...)`, `min-h-0` a vhodnými `overflow` hranicami, aby hlavný `main` a dokument nemali vertikálny scrollbar. Grafy sa môžu prispôsobovať dostupnej výške, ale osi, legendy, hlavičky a dôležité KPI musia zostať čitateľné; zákaz globálneho zmenšenia celej stránky cez `transform: scale()`.
- Na bežných desktopoch **1440×900 a 1366×768** musia byť všetky hlavné widgety vrátane Latest Activity viditeľné bez posúvania celej stránky; spodné karty musia byť vzájomne zarovnané. Pri prebytku riadkov smie byť samostatne scrollovateľná len dátová časť `Resources Overview` (najmä View all/Show fewer) alebo `Latest Activity`, s viditeľnou hlavičkou a ovládaním; nikdy potichu neorezať provider ani log. Ak je plocha extrémne malá alebo používateľ zapne 200 % zoom, má prístupnosť/úplnosť prednosť pred zákazom scrollu: použiť bezpečný fallback, nie skrytý obsah.
- Kontrast normálneho textu najmenej 4,5:1; viditeľný focus, informácia o stave aj textom.
- Žiadny horizontálny overflow pri 320, 390, 768, 1024 a 1440 px ani pri 200 % zoom.
- Dlhý názov providera sa zalomí; skrátená request URL má dostupný plný detail.
- Po každom väčšom UI kroku skontrolovať screenshot v skutočnom prehliadači. Úspešné funkčné testy samy osebe nepotvrdzujú vizuálnu kvalitu.

## Dáta a hranice komponentov

Nová feature je v `src/features/dashboard`. Žiadny generický dashboard framework, vlastný HTTP klient ani druhá query cache.

`model/dashboardTypes.ts` obsahuje len projekcie existujúcich typov pomocou `Pick`/indexed access a lokálne view modely:

- Application vstup odvodený z `RecoveryApplicationApiRecord` (`id`, `application.environment`, `application.tiers`).
- Group vstup odvodený z `RecoveryGroup` (`id`, `topology`, `resources`).
- VMware records odvodené z `DiscoveredVirtualMachine`; provider obsahuje ID, názov, scope a records.
- FlashSystem records odvodené z `FlashSystemVolume` (`id`, `name`, `status`). Produkčný provider type je `FLASHCOPY`, nie prototypový label `IBM_FLASH_SYSTEM`.
- Power records odvodené z `PowerPartitionResource` (`id`, `partitionKind`, `partitionState`). Mock normalizovaný inventár neobsahuje VIOS; helper sa navyše opiera o `partitionKind === 'LPAR'`.
- Request record ako štruktúrovaná vetva `AccessLogsResponseOutput['entries'][number]`, bez vetvy `{ raw }`. Povinné polia sa nevynechávajú svojvoľným pretypovaním.
- `DashboardLoadState<T>` je discriminated union: `loaded` s dátami, `loading`, `empty`, `error` so správou. Pri chybe nemá hodnotu `0`.
- `DashboardScenario`: `loaded | loading | empty | error | partial`; `DashboardInventoryRole`: `source | target`.
- `DashboardSnapshot`: samostatné load states pre applications, groups, access logs a zoznam providerov pre každý role. Každý provider má vlastný load state inventára.

Mock fixture sú **iba v etape 1** jediným zdrojom čísel. Typovať ich cez `satisfies`, bez `as unknown as`, bez náhodných hodnôt a aktuálneho času. Konfiguračné metriky, environment graf a topology graf musia vychádzať z tých istých records. Stav chyby mení dostupnosť dát, nie definíciu doménových metrík. Oddeliť výpočtové selectory a typované vstupy od zdroja demo dát, aby neskoršie zapojenie existujúcich FE hooks nevyžadovalo prepis vizuálnych komponentov.

**Hranica budúcej etapy (nie úloha D1–D10):** Recovery Applications a Recovery Groups sa budú môcť napojiť na existujúce čítacie API; Latest Activity na existujúci Access Logs zdroj; Resources na role-aware inventory po konkrétnych provideroch. Pred implementáciou živých Resources metrík treba samostatne navrhnúť lazy načítavanie, React Query cache a obmedzenie fan-outu pri veľkom počte providerov, aby otvorenie Overview nespúšťalo masový discovery. Žiadne nové BE API ani globálne Recovery Runs agregácie nie sú súčasťou tejto etapy. Mock fixture nesmie byť v budúcnosti tichou náhradou zlyhaných produkčných údajov.

### Referenčné hodnoty

| Metrika | Očakávaná hodnota |
|---|---|
| Applications | 18 total, 14 Active, 4 Draft; Active = neprázdne tiers |
| Production | 9 Active + 2 Draft = 11 |
| Staging | 3 Active + 1 Draft = 4 |
| Development | 2 Active + 1 Draft = 3 |
| Groups | 24 total, 16 Local, 8 Metro Mirror; 20 Active, 4 Draft |
| Topology | 66,7 % Local a 33,3 % Metro Mirror |
| VMware Prague Source | 128 total, 122 connected, 108 powered on |
| VMware Brno Source | 64 total, 61 connected, 52 powered on |
| FlashSystem FS7300 Source | 96 total, 92 online, 4 other |
| IBM Power HMC Source | 32 LPAR, 28 running, 4 other |
| VMware Ostrava Target | 86 total, 81 connected, 24 powered on |
| VMware Brno ISE Target | 42 total, 40 connected, 12 powered on |
| FlashSystem FS7300 Target | 72 total, 69 online, 3 other |
| IBM Power HMC Target | 20 LPAR, 8 running, 12 other |

Zachovať šesť providerov pre každú stranu podľa V3, predvolene zobraziť štyroch a umožniť View all/Show fewer. Doplnkový Source FlashSystem má 48/46/2 a Power 16/12/4; Target FlashSystem 36/34/2 a Power 12/4/8. Provider názvy a ID sú deterministické.

VMware scope sa rieši cez existujúci `resolveVmwareProviderFilter`: trimmed prefix a prvý neprázdny trimmed tag; mock selector aplikuje oba. Connected a Powered On sú nezávislé počty. FlashSystem online je case-insensitive; ostatné statusy sa nepreznačia na offline. Unknown environment a topology nesmú byť potichu zaradené do známej kategórie: environment použije pôvodný label/Unspecified, topology dostane Unknown s vlastným počtom. Základný fixture obsahuje iba Local/Metro; okrajové prípady pokryjú testy.

Access Logs: šesť záznamov zoradených timestamp zostupne; 2xx/4xx/5xx labely; používateľ null = neprihlásený používateľ. Timestamp je pevný, zobrazený v Europe/Bratislava s lokalizáciou. Plná URL je path + query_string. Mock ID neslúžia ako odkazy na reálne detail stránky.

### Navrhnuté rozhrania

- `getMockDashboardSnapshot(scenario: DashboardScenario): DashboardSnapshot` — čistá synchronná funkcia v `mocks/dashboardMockData.ts`; žiadny fetch ani simulácia siete cez časovač.
- `selectRecoverySummary(applications, groups)` a `selectEnvironmentDistribution(applications)` v `model/dashboardRecoveryMetrics.ts` — odvodené počty.
- `selectProviderMetrics(provider)` v `model/dashboardProviderMetrics.ts` — výsledok s presne pomenovanými units, total a jednotlivými count/total metrikami; len pre loaded provider.
- `OverviewPage` vlastní lokálny inventory role, rozbalenie providerov, zvolený request a demo scenario. Neskladovať odvodené totals v React state.
- `RecoverySummaryCards`, `EnvironmentChart`, `TopologyChart`, `ResourcesOverview`, `LatestActivity` prijímajú typované dáta/stavy a callbacky; nemajú vlastné API hooky.
- `DashboardPreviewControls` je dostupný iba v development režime; prepína scénare a resetuje lokálne retry. Jasné označenie `Mock data` spolu s pevným demo snapshot časom zostáva viditeľné aj pri vypnutých controls. Mock preview režim nesmie predstierať produkčný live/dashboard health ani potichu nahrádzať chybu skutočných dát.

## Postup a závislosti

| Úloha | Výsledok | Závislosti |
|---|---|---|
| D1 | Typované fixture a scenáre | žiadne |
| D2 | Výpočty metrík a doménové kontroly | D1 |
| D3 | Čitateľný page layout a KPI | D1, D2 |
| D4 | Dva analytické grafy a tooltipy | D3 |
| D5 | Source/Target Resources widget | D3 |
| D6 | HTTP activity a request detail | D3 |
| D7 | Demo controls, loading/empty/error/partial a retry | D4, D5, D6 |
| D8 | Lokalizácia en/sk/cs | D7 |
| D9 | Domovská trasa a navigácia | D8 |
| D10 | Browser overenie a vizuálne doladenie | D9 |

Implementovať postupne. Kontrolné body A po D2, B po D4, C po D7 a D po D10 sú overovacie body; nie dodatočné požiadavky na používateľov návrh dizajnu. Detailné akceptačné kritériá a cesty sú v `todo.md`.

## Overenie a odovzdanie

Focused Vitest podľa každej úlohy, ESLint len zmenených TS/TSX, JSON parse pre locales a `git diff --check`. Typecheck na konci integrácie, pretože pribudnú typované feature komponenty a routing. `npm run build` spúšťa celý suite a API checks; nie je predvolené overenie tejto zmeny.

Spustiť `npm.cmd run dev -- --host 127.0.0.1`. Otvoriť app v Edge s existujúcim autorizovaným prihlásením, prípadne existujúcim testovacím auth harnessom; nevytvárať auth bypass. Overiť desktop pri **1440×900, 1366×768, 1440×768 a 1920×1080**, mobile 390 px, ďalšie šírky 320/768/1024, sidebar expanded/collapsed, Light/Dark/System, SK/EN/CS a 200 % zoom. Pri desktopových režimoch overiť, že `document.documentElement.scrollHeight` a hlavný AppShell `main.scrollHeight` nepresahujú svoju zobraziteľnú výšku (s toleranciou 1–2 px); samotné vnútorné data scroll oblasti widgetov sú prípustné. Overiť aj spodné hrany, posledný log, provider View all a `loading/empty/error/partial` scenáre, aby pri obmedzenej výške nič nezmizlo.

Overiť Source/Target, View all/Show fewer, hover/focus/click tooltip a Escape, request detail a návrat focusu, všetky scenáre a čiastočné retry. Network kontrola preukáže, že **samotná Overview feature v etape 1** nenačítava recovery/inventory/access-log API; existujúca autentifikácia a shell môžu mať svoje requesty. Console nesmie obsahovať nové errors/warnings. Živé backend dáta sa nepoužívajú. Na `/` overiť aj správny aktívny stav Overview bez samovoľne rozbaleného Discovery menu a správne rozbaľovanie menu na ostatných trasách.

Uložiť desktop light/dark, mobile a provider/error screenshoty a krátky výsledok do `tasks/dashboard/verification.md` s presnými príkazmi, URL a limitmi. D10 nie je hotové, kým vizuálne dôkazy nepotvrdia čitateľnosť a layout. Používateľská akceptácia vzhľadu je samostatná od technického PASS.

## Riziká a opatrenia

| Riziko | Opatrenie |
|---|---|
| Prototyp obsahuje viaceré CSS overrides | Preniesť výsledné proporcie do lokálnych Tailwind className; nekopírovať celý style block. |
| Shell odoberie šírku a viewport výšku | Overview zapojiť cez `contentScroll: 'contained'`, výšku dedičnú z AppShellu a `min-h-0`. Overiť fit bez page scrollu pri 1440×900 a 1366×768 so sidebarom expanded/collapsed. |
| Overflow obsahu po prepnutí role, View all alebo zmenšení výšky | Scroll iba v dátovej časti dotknutého widgetu; header/tabs zostanú viditeľné. Pri mobile a vysokom zoome fallback bez skrytia obsahu. |
| Nesúlad názvov modelov s HTML mockmi | Typované projekcie existujúcich modelov; FLASHCOPY a normalizované Power partitions. |
| Mock obsah vyzerá ako živé dáta | Trvalé označenie Mock data a pevný snapshot timestamp; táto etapa sa neprezentuje ako produkčne funkčný dátový dashboard. |
| Chyba jedného providera vynuluje widget | Per-provider load state, samostatný Retry; ostatné dáta ostávajú viditeľné. |
| Odkazy na neexistujúce mock entity | Odkazovať iba na existujúce zoznamové stránky, nie mock detail ID. |
| Overview omylom preberie pôvodné predvolené menu | Pri `/` žiadne automaticky otvorené Discovery; testovať top-level active route a zachovanie existujúcich podmenu. |
| Neskoršie zapojenie živých dát vytvorí množstvo inventárnych requestov | V mock etape nevolať API; integráciu zdrojov realizovať v samostatnej etape s cache a lazy načítavaním podľa roly/providera. |
| Browser/autentifikácia nedostupná | Zaznamenať blokovanú kontrolu; nepovažovať screenshot HTML za dôkaz React integrácie. |

Odhad: desať malých až stredných úloh, približne 2–3 pracovné dni vrátane browser overenia. Výsledok D1–D10 je **typovaný a funkčne overený mock Overview**, nie reálny operačný dashboard. Integrácia existujúcich živých API a rozhodnutie o nasadení sú samostatná budúca etapa; bez nej nesmie byť demo prezentované ako živý stav zákazníckeho prostredia.
