# Úlohy: Dashboard Overview s mock dátami

Autoritatívny plán: [plan.md](plan.md). Všetky úlohy sú zatiaľ nevykonané.
**Etapa 1: integrácia mock Overview do React aplikácie, nie živý produkčný dashboard.** Zobrazené mock hodnoty musia byť trvalo označené; budúce napojenie na existujúce API a rozhodnutie o nasadení sú mimo D1–D10. V tejto etape bez API requestov z dashboard feature.
Po každej úlohe: focused testy, ESLint zmenených TS/TSX a `git diff --check`. Bez commitu a pushu podľa zadania používateľa. Predpokladané nové súbory majú nižšie presné cesty; zmeny iných modulov iba v D9.

## D1 — Typované mock dáta a scenáre

Závislosti: žiadne. Rozsah: M, 3 súbory.

Súbory:

- Nový `src/features/dashboard/model/dashboardTypes.ts`.
- Nový `src/features/dashboard/mocks/dashboardMockData.ts`.
- Nový `src/features/dashboard/mocks/dashboardMockData.test.ts`.

- [ ] Definovať projekcie existujúcich typov, per-provider load states a `getMockDashboardSnapshot(scenario)` podľa plánu.
- [ ] Fixture majú 18 apps, 24 groups, 6 providerov na každej strane a 6 štruktúrovaných requestov. `partial` zlyhá iba na treťom providerovi každej strany; úspešné inventáre sa zachovajú.
- [ ] Test preukáže deterministické snapshoty, oddelené Source/Target hodnoty, povinné request polia a žiadne records v loading/error state.
- [ ] Fixture a mock snapshot sú samostatný zdroj dát; výpočtové selectory a komponentové props nie sú pevne previazané na demo záznamy a nebudú vyžadovať prepis pri budúcej integrácii existujúcich API hookov.

Overenie: `npm.cmd exec vitest run src/features/dashboard/mocks/dashboardMockData.test.ts`.

## D2 — Doménové výpočty

Závislosti: D1. Rozsah: M, 4 súbory.

Súbory:

- Nové `src/features/dashboard/model/dashboardRecoveryMetrics.ts` a `.test.ts`.
- Nové `src/features/dashboard/model/dashboardProviderMetrics.ts` a `.test.ts`.

- [ ] KPI a grafy sa počítajú z rovnakých records: 18 = 14 + 4 = 11 + 4 + 3; 24 = 16 + 8. Unknown environment/topology sa nepreznačuje na inú kategóriu; prázdny vstup nemá NaN.
- [ ] VMware scope používa existujúci resolver; connected/poweredOn sú nezávislé. Flash online je case-insensitive, Power ráta iba LPAR. Nevytvoriť spoločný total pre rôzne technológie.
- [ ] Testy pokryjú základné hodnoty, out-of-scope VMs, VM connected/off a disconnected/on, neonline status, VIOS, neznáme kategórie a prázdny inventár.

Overenie: `npm.cmd exec vitest run src/features/dashboard/model/dashboardRecoveryMetrics.test.ts src/features/dashboard/model/dashboardProviderMetrics.test.ts`.

## Kontrolný bod A — Dáta

- [ ] D1–D2 focused testy prešli; všetky počty v pláne sa dajú odvodiť z fixture, žiadny UI total nie je hardcoded.

## D3 — Stránka a KPI karty

Závislosti: D1, D2. Rozsah: M, 4 súbory.

Súbory:

- Nové `src/features/dashboard/pages/OverviewPage.tsx` a `.test.tsx`.
- Nové `src/features/dashboard/components/RecoverySummaryCards.tsx` a `.test.tsx`.

- [ ] Stránka používa existujúce Card komponenty a tokeny; lokálny sémantický header, Mock data label a dva čitateľné KPI panely podľa vizuálnej zmluvy.
- [ ] Hodnoty 18/14/4 a 24/16/8 vrátane segmented bars a vysvetlenia Active sú odvodené z D2; farby kategórií ostávajú konzistentné.
- [ ] Test overí h1, **trvalé označenie Mock data aj fixný čas demo snapshotu** (nezávisle od development controls), presné metriky a ich textové významy. Layout nemá vlastný sidebar/topbar ani samostatnú výšku `100vh`; root používa `lg:h-full lg:min-h-0` a pripravené grid/flex proporcie pre contained `AppShell`.

Overenie: `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/RecoverySummaryCards.test.tsx`. V prehliadači vizuálne overiť KPI pri desktop/mobile šírke; pred D9 použiť existujúci testovací render, bez dočasnej produkčnej route.

## D4 — Environment graf a topology donut

Závislosti: D3. Rozsah: M, 5 súborov.

Súbory:

- Nové `src/features/dashboard/components/EnvironmentChart.tsx` a `.test.tsx`.
- Nové `src/features/dashboard/components/TopologyChart.tsx` a `.test.tsx`.
- Upraviť `src/features/dashboard/pages/OverviewPage.tsx`.

- [ ] SVG grafy používajú výsledky D2, čitateľné osi a legendy. Production 9/2, Staging 3/1, Development 2/1; donut má total 24 a 66,7/33,3 percenta. Žiadna nová chart knižnica.
- [ ] Grafy sa výškovo prispôsobujú priestoru pridelenému desktopovým contained layoutom; ich legenda, osi a názvy zostávajú čitateľné aj pri 1366×768. Environment tooltip funguje hover/focus/click, Enter/Space a Escape; nepretečie mimo viewport a uvedie presné counts. Údaje sú dostupné aj cez text/ARIA.
- [ ] Testy overia popisy grafov, tooltip klávesnicou a konzistentné dáta; lokalizované percentá sa netestujú cez natvrdo zadaný separator.

Overenie: `npm.cmd exec vitest run src/features/dashboard/components/EnvironmentChart.test.tsx src/features/dashboard/components/TopologyChart.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx`.

## Kontrolný bod B — Vizuál súhrnov

- [ ] KPI a analytická časť spĺňajú type scale plánu, s kompaktným fallbackom pri nižšej výške; screenshot v skutočnom prehliadači potvrdí čitateľné osi/legendy, bez orezania alebo pretečenia mimo pridelenú plochu. Vizuálne overenie nemožno nahradiť DOM testom.

## D5 — Source/Target Resources

Závislosti: D3. Rozsah: M, 4 súbory.

Súbory:

- Nový `src/features/dashboard/components/ProviderMetricCard.tsx`.
- Nové `src/features/dashboard/components/ResourcesOverview.tsx` a `.test.tsx`.
- Upraviť `src/features/dashboard/pages/OverviewPage.tsx`.

- [ ] Existujúce FilterTabs menia lokálny role; Source a Target majú odlišné fixture. Provider cards používajú D2 s názvom, jednotkou a presne pomenovanými progress metrikami.
- [ ] Predvolene 4 zo 6 providerov; View all/Show fewer funguje a zmena role resetuje rozbalenie. Dlhé názvy sa zalomia. Na desktope sa pri rozbalení alebo zmene role scrolluje iba dátový obsah Resources, bez rastu celej stránky, bez skrytia headera a tabov.
- [ ] Test klikaním aj šípkami preukáže zmenu Source/Target, správne counts, expand/collapse a dostupné progressbar labely.

Overenie: `npm.cmd exec vitest run src/features/dashboard/components/ResourcesOverview.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx`.

## D6 — Latest Activity a plný request

Závislosti: D3. Rozsah: M, 5 súborov.

Súbory:

- Nové `src/features/dashboard/components/LatestActivity.tsx` a `.test.tsx`.
- Nové `src/features/dashboard/components/RequestDetailsModal.tsx` a `.test.tsx`.
- Upraviť `src/features/dashboard/pages/OverviewPage.tsx`.

- [ ] Šesť HTTP requestov je zoradených timestamp zostupne; zobrazuje user, timestamp, method, path a status; 401 a 503 majú príslušný textový error label.
- [ ] Detail používa existujúci Modal a úplnú path/query; dlhé URL sa zalomia, Escape zavrie detail a focus sa vráti na otvárač. Používateľ null má zrozumiteľný label.
- [ ] Testy pokryjú poradie, statusy, null user, plnú URL, otvorenie/zavretie a focus. Žiadne prezentovanie requestov ako recovery business events. Pri kratšej výške desktopu má logový feed vlastný scroll (iba ak je nutný), hlavička zostáva na mieste a posledný záznam je dostupný.

Overenie: `npm.cmd exec vitest run src/features/dashboard/components/LatestActivity.test.tsx src/features/dashboard/components/RequestDetailsModal.test.tsx`.

## D7 — Scenáre a čiastočná chyba

Závislosti: D4, D5, D6. Rozsah: M, 5 súborov.

Súbory:

- Nové `src/features/dashboard/components/DashboardPreviewControls.tsx` a `.test.tsx`.
- Upraviť `src/features/dashboard/pages/OverviewPage.tsx` a `.test.tsx`.
- Upraviť `src/features/dashboard/components/ResourcesOverview.tsx`.

- [ ] Development controls menia loaded/loading/empty/error/partial snapshot; nepoužívajú časovače ani fetch. Skeleton, zrozumiteľné empty a error výstupy sú dostupné v každom widgete podľa load state; základné vetvy patria do príslušných komponentov už v D3–D6.
- [ ] Chyba jedného providera ponechá ostatné loaded cards; počet nedostupného inventára sa nezobrazí ako 0. Retry obnoví iba daného providera a návrat do nového scenára resetuje retry overrides.
- [ ] Page test overí všetkých päť scenárov, provider Retry a zachovanie ostatných metrík; Mock data label aj demo snapshot timestamp sú viditeľné aj bez development controls. Žiadny error state ani Retry sa v tejto etape nesmie tváriť ako skutočný BE request.

Overenie: `npm.cmd exec vitest run src/features/dashboard/components/DashboardPreviewControls.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/ResourcesOverview.test.tsx`.

## Kontrolný bod C — Kompletná mock funkcionalita

- [ ] D3–D7 interakcie a stavy fungujú v spoločnej stránke; žiadny dashboardový HTTP request, žiadny druhý theme state a žiadne nuly namiesto nedostupných dát.

## D8 — Lokalizácia

Závislosti: D7. Rozsah: M, 4 súbory. Feature texty využívajú `t` už počas D3–D7; v tejto úlohe doplniť všetky hodnoty a overiť ich.

Súbory:

- Upraviť `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.
- Nový `src/locales/dashboardTranslations.test.ts`.

- [ ] Doplniť namespace `dashboard.*` a `nav.overview` pre všetky visible/accessibility texty, stavy a vysvetlenia metrík vo všetkých troch jazykoch.
- [ ] Počty, percentá a timestamps používať cez Intl podľa aktuálneho jazyka; časová zóna Europe/Bratislava. Technické provider názvy a HTTP path sa neprekladajú.
- [ ] Test potvrdí úplnosť a neprázdnosť rovnakých keys, zachovanie interpolation parametrov a žiadne chýbajúce keys v základnej stránke.

Overenie: `npm.cmd exec vitest run src/locales/dashboardTranslations.test.ts src/features/dashboard/pages/OverviewPage.test.tsx`; parserom `JSON.parse` overiť všetky tri zmenené JSON súbory.

## D9 — Domovská trasa a navigácia

Závislosti: D8. Rozsah: M, 5 súborov.

Súbory:

- Upraviť `src/app/AppRoutes.tsx` a `src/app/router.test.tsx`.
- Upraviť `src/layouts/app-shell/AppSidebar.tsx` a `.test.tsx`.
- Nový `src/app/dashboardRoute.test.tsx`.

- [ ] Index route lazy-loaduje Overview so Suspense fallback a **dostane `handle={{ contentScroll: 'contained' }}`** presne podľa existujúceho AppShell mechanizmu (ako Resources a Recovery Runs). `routes.home` použiť v Overview položke a brand linku. Nemení sa AppShell ani scroll správanie ostatných rout.
- [ ] Overview má aktívny stav len na `/` vrátane collapsed rail; ostatné trasy, redirecty a autentifikácia sa nemenia. Nevytvárať duplicitný shell ani auth bypass.
- [ ] Zmeniť úvodnú logiku `openMenu`: pri `/` sa nemá automaticky rozbaliť `Discovery & Inventory` (aktuálny fallback `findRouteMenu(...) ?? 'Discovery & Inventory'`). Aj pri návrate z Resources na `/` musí automaticky rozbalené Discovery zmiznúť; manuálne používateľom otvorené menu sa nemá resetovať. Na existujúcich trasách sa naďalej rozbaľuje ich aktívne nadradené menu.
- [ ] Route/sidebar testy overia `/` vrátane contained route handle, navigáciu Overview ↔ Resources, brand link, aktívne položky, **žiadne nechcené rozbalenie Discovery na `/`**, otvorené menu pre Resources/Recovery trasu, collapsed/mobile správanie a zachovanie contained resource routes. Testovať, že route shell nevytvára druhý viewport scrollbar.

Overenie: `npm.cmd exec vitest run src/app/dashboardRoute.test.tsx src/app/router.test.tsx src/app/resourcesContainedRoutes.test.tsx src/layouts/app-shell/AppSidebar.test.tsx src/layouts/app-shell/AppShell.test.tsx`; `npm.cmd run typecheck`.

## D10 — Browser a finálna vizuálna kontrola

Závislosti: D9. Rozsah: S/M, najviac 5 súborov v jednej opravnej iterácii.

Súbory:

- Nový `tasks/dashboard/verification.md` s výsledkami a odkazmi na screenshoty.
- Upraviť `tasks/dashboard/todo.md` podľa skutočne splnených úloh.
- Cielené lokálne opravy najviac troch dashboard komponentov na jednu iteráciu; širšiu opravu rozdeliť a znovu focused overiť.

- [ ] Spustiť `npm.cmd run dev -- --host 127.0.0.1` a overiť skutočnú React app v Edge pri 320/390/768/1024/1440/1920 px a desktop výškach **768, 900 a 1080 px**; konkrétne 1366×768, 1440×900, 1440×768 a 1920×1080. Overiť expanded/collapsed sidebar, Light/Dark/System, en/sk/cs a 200 % zoom. Na štandardnom desktope musia byť všetky hlavné dashboard widgety vrátane spodného radu viditeľné naraz, bez page/main scrollu a so zarovnanými spodnými kartami; písmo zostáva čitateľné.
- [ ] V Edge/DOM zmerať `document.documentElement.scrollHeight` a `main.scrollHeight` proti `clientHeight` s toleranciou 1–2 px pre desktopové fit režimy. Po Source/Target, View all/Show fewer, pri error/loading/partial a dlhých názvoch nesmie vzniknúť druhý scrollbar stránky ani byť odrezaná posledná karta/záznam; vnútorné scrolly provider/log feedov smú byť aktívne. Pri 320/390 px a 200 % zoom overiť prístupný scroll/fallback bez skrytého obsahu.
- [ ] Klávesnicou overiť taby, expand, tooltip a request modal; v network neexistujú API requesty iniciované dashboard feature (requesty auth/shell sú prípustné), v console žiadne nové chyby. Jedna provider error neblokuje zvyšok stránky.
- [ ] Na `/` overiť aktívne Overview bez východiskového rozbalenia Discovery, návrat cez logo a funkčné podmenu na existujúcich trasách; vo všetkých režimoch overiť zreteľné `Mock data` a pevný demo snapshot čas.
- [ ] Uložiť vizuálne dôkazy a presné výsledky; zopakovať len focused testy dotknuté opravami, lint a `git diff --check`. Celý suite/build spustiť iba ak vznikne preukázaný cross-cutting dôvod alebo výslovné zadanie.

Overenie: Browser checklist vyššie, všetky nové dashboard testy explicitnými cestami z D1–D8, route testy D9, `npm.cmd run typecheck`, focused ESLint a `git diff --check`. V odovzdaní jasne uviesť, ak celý suite alebo build nebol spustený.

## Kontrolný bod D — Odovzdanie

- [ ] Úlohy D1–D10 majú zaznamenané dôkazy a nevykonané kontroly zostali označené ako nevykonané. D10 nesmie dostať PASS, ak pri 1440×900 alebo 1366×768 hlavná plocha Overview scrolluje alebo spodné karty nie sú celé dostupné (akceptovaný lokálny scroll iba pre nadbytočné položky zoznamov).
- [ ] Používateľ dostane URL fungujúcej Overview stránky, desktop/mobile náhľady a stručný súpis výsledkov. Výstup jasne označiť ako mock integráciu bez live API a nie ako hotový produkčný dashboard; samostatne uviesť budúcu potrebu napojiť existujúce API s primeraným obmedzením inventory requestov. Vzhľad ostáva otvorený jeho akceptácii; technické PASS sa nevydáva za používateľské schválenie.
